"""
╔══════════════════════════════════════════════════════════════╗
║          BUNA FAIR PRICE — AI Coffee Bean Grader             ║
║          Model: gemini-3.7-flash (multimodal vision)         ║
║          ECX Grade Standard: Washed G1-G5 / Natural G1-G9    ║
╚══════════════════════════════════════════════════════════════╝

Usage:
    python grader.py --image path/to/beans.jpg
    python grader.py --image https://example.com/beans.jpg
    python grader.py --demo   (runs with a built-in test prompt)
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import logging
import os
import sys
import time
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

# ── Setup ────────────────────────────────────────────────────────────────────
load_dotenv()
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("buna.grader")
console = Console()

def env_value(*names: str) -> str:
    """Read the first configured env var and strip whitespace."""
    for name in names:
        value = os.getenv(name)
        if value is not None:
            value = value.strip()
            if value:
                return value
    return ""

GEMINI_API_KEY = env_value("GEMINI_API_KEY", "GOOGLE_API_KEY")
OPENROUTER_API_KEY = env_value("OPENROUTER_API_KEY", "OpenRouter_API_KEY")
OPENROUTER_MODEL = env_value("OPENROUTER_MODEL") or "openrouter/free"
MODEL = env_value("GEMINI_MODEL") or "gemini-3.7-flash"
ECX_COFFEE_GRADES = ["Washed G1", "Washed G2", "Washed G3", "Washed G4", "Washed G5", "Natural G1", "Natural G2", "Natural G3", "Natural G4", "Natural G5", "Specialty Q1", "Specialty Q2", "Under Grade"]
GEMINI_MAX_REQUESTS_PER_MINUTE = max(1, int(env_value("GEMINI_MAX_REQUESTS_PER_MINUTE") or "5"))
_gemini_request_lock = threading.Lock()
_gemini_request_times: list[float] = []

def should_retry_gemini(exc: Exception) -> bool:
    """Retry transient Gemini failures, but fail fast on invalid model/key errors."""
    code = getattr(exc, "code", None)
    if isinstance(code, int) and 400 <= code < 500:
        return code in (408, 429)
    return True

def wait_for_gemini_slot() -> None:
    """Throttle Gemini requests across grader instances in this process."""
    while True:
        with _gemini_request_lock:
            now = time.monotonic()
            while _gemini_request_times and now - _gemini_request_times[0] >= 60:
                _gemini_request_times.pop(0)
            if len(_gemini_request_times) < GEMINI_MAX_REQUESTS_PER_MINUTE:
                _gemini_request_times.append(now)
                return
            delay = 60 - (now - _gemini_request_times[0])
        time.sleep(max(0.1, delay))

# ── ECX Price Reference Table (ETB/kg) ───────────────────────────────────────
# Estimated 2025/26 Jimma green-coffee prices, ETB per kg (min = platform floor,
# max = ceiling). Derived from ECTA minimum export floors (Jimma/Limu G1 about
# US$8.1-8.3/kg), Jimma FOB ranges (G4 natural US$2.50-3.20/lb) and farm-gate
# cherry prices of 120-185 ETB/kg, at 1 USD ≈ 155 ETB. Keep in sync with
# server/src/constants/coffeePrices.ts.
ECX_PRICES: dict[str, dict] = {
    "Specialty Q1": {"min": 1170, "max": 1380, "description": "Specialty, cup score 85+"},
    "Specialty Q2": {"min": 1115, "max": 1310, "description": "Specialty, cup score 80-84"},
    "Washed G1":   {"min": 1070, "max": 1250, "description": "Top washed export grade"},
    "Washed G2":   {"min": 965,  "max": 1130, "description": "High quality export"},
    "Washed G3":   {"min": 835,  "max": 980,  "description": "Standard export"},
    "Washed G4":   {"min": 735,  "max": 860,  "description": "Commercial grade"},
    "Washed G5":   {"min": 630,  "max": 740,  "description": "Low commercial"},
    "Natural G1":  {"min": 1005, "max": 1170, "description": "Premium natural"},
    "Natural G2":  {"min": 895,  "max": 1040, "description": "Good natural"},
    "Natural G3":  {"min": 770,  "max": 900,  "description": "Standard natural"},
    "Natural G4":  {"min": 670,  "max": 790,  "description": "Commercial natural"},
    "Natural G5":  {"min": 575,  "max": 680,  "description": "Low natural"},
}

# ── Fallback result when API is unavailable ───────────────────────────────────
FALLBACK_RESULT = {
    "grade_tier": "Natural G4",
    "processing_type": "Natural",
    "grade_number": 4,
    "defect_percentage": 20,
    "color_quality": "fair",
    "uniformity_score": 5,
    "moisture_level": "unknown",
    "estimated_price_min_etb": 670,
    "estimated_price_max_etb": 790,
    "confidence": "low",
    "is_fallback": True,
    "summary_english": "⚠️ AI grading unavailable — showing median grade. Please try again.",
    "tips_oromo": [
        "⚠️ Sirni AI hin hojjanne. Booda yaali.",
        "Qorannoo idilee irratti irkadhu.",
    ],
    "tips_amharic": [
        "⚠️ AI ደረጃ አሰጣጥ አልሰራም። ቆይተህ ሞክር።",
        "በተለመደ ደረጃ አሰጣጥ ላይ ተመካ።",
    ],
    "sorting_advice_english": "Grade manually using ECX defect count chart.",
}

# ── Grading Prompt ────────────────────────────────────────────────────────────
GRADING_PROMPT = """
Analyze the coffee image according to Ethiopian Commodity Exchange (ECX) grading.

Analyze this image of coffee beans carefully and return ONLY a valid JSON object.

Choose grade_tier from exactly: Washed G1, Washed G2, Washed G3, Washed G4, Washed G5, Natural G1, Natural G2, Natural G3, Natural G4, Natural G5, Specialty Q1, Specialty Q2, Under Grade.
Never return any other grade_tier string. Use Under Grade when the image is unclear or unsuitable for classification.

WHAT TO LOOK FOR:
- Bean color: dark green (excellent), light green (good), yellowish (fair), brown (poor)
- Uniformity: are beans similar in size and shape?
- Visible defects: broken beans, black beans, insect damage, stones, husks
- Surface texture: smooth (good) vs wrinkled/shriveled (poor)
- Moisture signs: overly pale or chalky color suggests over-drying

Return EXACTLY this JSON structure, no extra text:
{
    "grade_tier": "Washed G2",
  "processing_type": "Washed",
  "grade_number": 2,
  "defect_percentage": 8,
  "color_quality": "good",
  "uniformity_score": 7,
  "moisture_level": "normal",
  "confidence": "high",
  "is_fallback": false,
  "summary_english": "One sentence expert summary of the beans",
  "sorting_advice_english": "One specific actionable sorting tip for the farmer",
  "tips_oromo": [
    "Dhandhama caalaa fooyyessuf... (tip 1 in Afaan Oromo)",
    "Qulqullina eeguuf... (tip 2 in Afaan Oromo)",
    "Gurgurtaa dura... (tip 3 in Afaan Oromo)"
  ],
  "tips_amharic": [
    "ጥራትን ለማሻሻል... (tip 1 in Amharic)",
    "ለጥሩ ደረጃ... (tip 2 in Amharic)",
    "ከመሸጥ በፊት... (tip 3 in Amharic)"
  ]
}

The tips in Oromo and Amharic must be PRACTICAL and SPECIFIC to what you see in the image.
Be honest — do not inflate the grade. Farmers depend on accurate grading for fair prices.
"""

# ── Coffee Image Validation Prompt ─────────────────────────────────────────────
VALIDATION_PROMPT = """
You are checking whether an uploaded photo is a close-up of coffee beans.
Return ONLY valid JSON with this exact structure:
{"is_coffee": true, "reason": "short reason"}

Rules:
- Return true only for photos that clearly show coffee beans, cherries, or bean samples.
- Return false for unrelated items like people, food, fruits, cups, leaves, hands, animals, scenery, or random objects.
- Do not explain beyond a short reason.
"""


# ── Data Model ────────────────────────────────────────────────────────────────
@dataclass
class GradeResult:
    grade_tier: str
    processing_type: str
    grade_number: int
    defect_percentage: float
    color_quality: str
    uniformity_score: int
    moisture_level: str
    confidence: str
    is_fallback: bool
    provider: str
    summary_english: str
    sorting_advice_english: str
    tips_oromo: list[str]
    tips_amharic: list[str]
    estimated_price_min_etb: Optional[float] = None
    estimated_price_max_etb: Optional[float] = None
    processing_time_ms: Optional[int] = None

    def enrich_with_prices(self) -> None:
        """Look up ECX price range based on grade tier."""
        price_data = ECX_PRICES.get(self.grade_tier)
        if price_data:
            self.estimated_price_min_etb = price_data["min"]
            self.estimated_price_max_etb = price_data["max"]

    def to_dict(self) -> dict:
        return {
            "grade_tier": self.grade_tier,
            "processing_type": self.processing_type,
            "grade_number": self.grade_number,
            "defect_percentage": self.defect_percentage,
            "color_quality": self.color_quality,
            "uniformity_score": self.uniformity_score,
            "moisture_level": self.moisture_level,
            "confidence": self.confidence,
            "is_fallback": self.is_fallback,
            "provider": self.provider,
            "estimated_price_min_etb": self.estimated_price_min_etb,
            "estimated_price_max_etb": self.estimated_price_max_etb,
            "summary_english": self.summary_english,
            "sorting_advice_english": self.sorting_advice_english,
            "tips_oromo": self.tips_oromo,
            "tips_amharic": self.tips_amharic,
            "processing_time_ms": self.processing_time_ms,
        }


# ── Core Grading Engine ───────────────────────────────────────────────────────
class CoffeeGrader:
    """
    AI Coffee Bean Grader using Gemini 2.5 Flash multimodal vision.
    
    Supports:
    - Local image files (jpg, png, webp)
    - Remote image URLs (http/https)
    - Demo mode (text-only fallback for testing without an image)
    """

    def __init__(self, api_key: str, openrouter_api_key: str = "", openrouter_model: str = OPENROUTER_MODEL) -> None:
        self.gemini_api_key = api_key or GEMINI_API_KEY
        self.openrouter_api_key = openrouter_api_key or OPENROUTER_API_KEY
        self.openrouter_model = openrouter_model or OPENROUTER_MODEL
        self.client = genai.Client(api_key=self.gemini_api_key) if self.gemini_api_key else None
        self._cache: dict[str, GradeResult] = {}

    def _hash_image(self, image_bytes: bytes) -> str:
        """Create a cache key from image content."""
        return hashlib.sha256(image_bytes).hexdigest()[:16]

    def _load_local_image(self, path: str) -> tuple[bytes, str]:
        """Load image from disk and return (bytes, mime_type)."""
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".png": "image/png", ".webp": "image/webp"}
        mime = mime_map.get(p.suffix.lower(), "image/jpeg")
        return p.read_bytes(), mime

    def _load_remote_image(self, url: str) -> tuple[bytes, str]:
        """Download image from URL and return (bytes, mime_type)."""
        console.print(f"[dim]Downloading image from URL…[/dim]")
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
        content_type = response.headers.get("content-type", "image/jpeg").split(";")[0]
        return response.content, content_type

    def _extract_json_text(self, raw: str) -> dict:
        """Normalize model output into a JSON object."""
        text = (raw or "").strip()
        if not text:
            raise ValueError("Empty model response.")

        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(text[start:end + 1])
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=8),
        retry=retry_if_exception(should_retry_gemini),
        reraise=False,
    )
    def _call_gemini(self, image_bytes: bytes, mime_type: str) -> dict:
        """
        Call Gemini 3.8 Flash with the coffee image.
        Retries up to 3 times with exponential backoff.
        """
        if not self.client:
            raise ValueError("GEMINI_API_KEY is not configured.")

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        wait_for_gemini_slot()
        response = self.client.models.generate_content(
            model=MODEL,
            contents=[image_part, GRADING_PROMPT],
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1024,
                response_mime_type="application/json",
                system_instruction="You are an Ethiopian Commodity Exchange coffee grader. Return a valid ECX grade exactly as specified in the user prompt.",
                response_schema={"type": "OBJECT", "properties": {"grade_tier": {"type": "STRING", "enum": ECX_COFFEE_GRADES}}, "required": ["grade_tier"]},
                thinking_config=types.ThinkingConfig(
                    thinking_budget=512
                ),
            ),
        )

        return self._extract_json_text(response.text.strip())

    def _call_openrouter(self, image_bytes: bytes, mime_type: str) -> dict:
        """Fallback image analysis via OpenRouter's OpenAI-compatible API."""
        if not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is not configured.")

        encoded = base64.b64encode(image_bytes).decode("utf-8")
        payload = {
            "model": self.openrouter_model,
            "temperature": 0.1,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": GRADING_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{encoded}"
                            },
                        },
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/",
            "X-Title": "Buna Fair Price",
        }

        with httpx.Client(timeout=25.0) as client:
            response = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        if isinstance(content, list):
            text = "".join(part.get("text", "") for part in content if isinstance(part, dict))
        else:
            text = content
        return self._extract_json_text(text)

    def _call_image_api(self, image_bytes: bytes, mime_type: str) -> dict:
        """Prefer Gemini, then fall back to OpenRouter if necessary."""
        errors: list[str] = []

        if self.gemini_api_key:
            try:
                result = self._call_gemini(image_bytes, mime_type)
                result["provider"] = MODEL
                return result
            except Exception as exc:
                errors.append(f"Gemini: {exc}")
                logger.warning("Gemini call failed; trying OpenRouter fallback: %s", exc)

        if self.openrouter_api_key:
            try:
                result = self._call_openrouter(image_bytes, mime_type)
                result["provider"] = f"openrouter:{self.openrouter_model}"
                return result
            except Exception as exc:
                errors.append(f"OpenRouter: {exc}")
                logger.warning("OpenRouter fallback failed: %s", exc)

        if not errors:
            raise ValueError("No AI image-analysis provider is configured.")
        raise RuntimeError("; ".join(errors))

    def validate_coffee_image(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> bool:
        """Return True only when the image clearly shows coffee beans or cherries."""
        if not self.gemini_api_key and not self.openrouter_api_key:
            return True

        try:
            if self.gemini_api_key:
                try:
                    image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                    wait_for_gemini_slot()
                    response = self.client.models.generate_content(
                        model=MODEL,
                        contents=[image_part, VALIDATION_PROMPT],
                        config=types.GenerateContentConfig(
                            temperature=0.1,
                            max_output_tokens=256,
                            response_mime_type="application/json",
                        ),
                    )
                    data = self._extract_json_text(response.text.strip())
                    return bool(data.get("is_coffee", False))
                except Exception as exc:
                    logger.warning("Gemini validation failed: %s", exc)

            if self.openrouter_api_key:
                try:
                    encoded = base64.b64encode(image_bytes).decode("utf-8")
                    payload = {
                        "model": self.openrouter_model,
                        "temperature": 0.1,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "text", "text": VALIDATION_PROMPT},
                                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{encoded}"}},
                            ],
                        }],
                        "response_format": {"type": "json_object"},
                    }
                    headers = {
                        "Authorization": f"Bearer {self.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/",
                        "X-Title": "Buna Fair Price",
                    }
                    with httpx.Client(timeout=20.0) as client:
                        r = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                        r.raise_for_status()
                        data = r.json()
                    content = data["choices"][0]["message"]["content"]
                    if isinstance(content, list):
                        text = "".join(part.get("text", "") for part in content if isinstance(part, dict))
                    else:
                        text = content
                    result = self._extract_json_text(text)
                    return bool(result.get("is_coffee", False))
                except Exception as exc:
                    logger.warning("OpenRouter validation failed: %s", exc)
        except Exception as exc:
            logger.warning("Coffee image validation error: %s", exc)

        return True

    def grade(
        self,
        image_path: Optional[str] = None,
        image_url: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        mime_type: str = "image/jpeg",
    ) -> GradeResult:
        """
        Main entry point. Grade coffee beans from a file path, URL, or raw bytes.
        
        Args:
            image_path:  Local file path to coffee bean image.
            image_url:   Remote URL to coffee bean image.
            image_bytes: Raw bytes of the coffee bean image.
            mime_type:   MIME type when passing raw image_bytes (default: image/jpeg).

        Returns:
            GradeResult with grade, prices, and bilingual tips.
        """
        if not image_path and not image_url and not image_bytes:
            raise ValueError("Provide either image_path, image_url, or image_bytes.")

        # Load image bytes
        if image_bytes is not None:
            raw_bytes, m_type = image_bytes, mime_type
        elif image_path:
            raw_bytes, m_type = self._load_local_image(image_path)
        else:
            raw_bytes, m_type = self._load_remote_image(image_url)  # type: ignore

        # Check cache
        cache_key = self._hash_image(raw_bytes)
        if cache_key in self._cache:
            console.print("[dim]✓ Returning cached result[/dim]")
            return self._cache[cache_key]

        # Validate coffee image
        try:
            is_coffee = self.validate_coffee_image(raw_bytes, m_type)
            reason = "Image does not appear to contain coffee beans."
        except Exception as e:
            logger.warning(f"Coffee image validation failed: {e}")
            is_coffee = False
            reason = str(e)

        if not is_coffee:
            console.print(f"[bold red]Uploaded image is not a close-up of coffee beans.[/bold red]")
            console.print(f"[dim]Reason: {reason}[/dim]")
            console.print(f"[dim]Showing fallback result. Please upload a clear coffee image.[/dim]\n")
            raw_data = {**FALLBACK_RESULT, "provider": "fallback"}
            raw_data["summary_english"] = f"⚠️ {reason} — showing fallback grade."
            raw_data["is_fallback"] = True
        else:
            # Call Gemini / fallback API
            start = time.time()
            try:
                raw_data = self._call_image_api(raw_bytes, m_type)
            except Exception as e:
                logger.warning(f"All AI image providers failed after retries: {e}. Using fallback.")
                raw_data = {**FALLBACK_RESULT, "provider": "fallback"}

            elapsed_ms = int((time.time() - start) * 1000)

            # Build result
            result = GradeResult(
                grade_tier=raw_data.get("grade_tier", "Natural G4"),
                processing_type=raw_data.get("processing_type", "Natural"),
                grade_number=raw_data.get("grade_number", 4),
                defect_percentage=raw_data.get("defect_percentage", 20),
                color_quality=raw_data.get("color_quality", "fair"),
                uniformity_score=raw_data.get("uniformity_score", 5),
                moisture_level=raw_data.get("moisture_level", "unknown"),
                confidence=raw_data.get("confidence", "low"),
                is_fallback=raw_data.get("is_fallback", False),
                provider=raw_data.get("provider", "unknown"),
                summary_english=raw_data.get("summary_english", ""),
                sorting_advice_english=raw_data.get("sorting_advice_english", ""),
                tips_oromo=raw_data.get("tips_oromo", []),
                tips_amharic=raw_data.get("tips_amharic", []),
                processing_time_ms=elapsed_ms,
            )
            result.enrich_with_prices()

            # Cache it
            self._cache[cache_key] = result
            return result


# ── Rich Terminal Display ─────────────────────────────────────────────────────
def display_result(result: GradeResult) -> None:
    """Print a beautiful terminal report of the grading result."""

    # Grade badge color
    grade_colors = {1: "bright_green", 2: "green", 3: "yellow", 4: "dark_orange", 5: "red"}
    grade_color = grade_colors.get(result.grade_number, "red")

    # Header
    console.print()
    console.print(Panel(
        f"[bold {grade_color}]  {result.grade_tier}  [/bold {grade_color}]\n"
        f"[dim]Confidence: {result.confidence.upper()}  |  "
        f"Processed in {result.processing_time_ms}ms[/dim]",
        title="[bold]☕ BUNA FAIR PRICE — AI GRADE RESULT[/bold]",
        border_style=grade_color,
        expand=False,
    ))

    if result.is_fallback:
        console.print("[bold red]⚠️  FALLBACK MODE — API unavailable[/bold red]\n")

    # Score table
    table = Table(box=box.ROUNDED, show_header=False, padding=(0, 1))
    table.add_column("Metric", style="bold cyan", width=22)
    table.add_column("Value", style="white")

    table.add_row("🏷️  Grade",          f"[bold {grade_color}]{result.grade_tier}[/bold {grade_color}]")
    table.add_row("⚠️  Defect %",        f"{result.defect_percentage}%")
    table.add_row("🎨  Color Quality",   result.color_quality.capitalize())
    table.add_row("📐  Uniformity",      f"{result.uniformity_score}/10")
    table.add_row("💧  Moisture Level",  result.moisture_level.capitalize())

    if result.estimated_price_min_etb:
        table.add_row(
            "💰  Fair Price (ETB/kg)",
            f"[bold green]{result.estimated_price_min_etb} – {result.estimated_price_max_etb} ETB[/bold green]"
        )

    console.print(table)

    # Summary
    console.print(f"\n[bold]📋 Summary:[/bold] {result.summary_english}")
    console.print(f"[bold]🔧 Sorting Tip:[/bold] {result.sorting_advice_english}")

    # Tips in Afaan Oromo
    console.print("\n[bold yellow]💬 Gorsa — Afaan Oromo:[/bold yellow]")
    for tip in result.tips_oromo:
        console.print(f"  • {tip}")

    # Tips in Amharic
    console.print("\n[bold yellow]💬 ምክር — አማርኛ:[/bold yellow]")
    for tip in result.tips_amharic:
        console.print(f"  • {tip}")

    # JSON output hint
    console.print(f"\n[dim]Raw JSON saved to: grade_result.json[/dim]")
    console.print()


# ── CLI Entry Point ───────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="🫘 Buna Fair Price — AI Coffee Bean Grader",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--image", type=str, help="Path to local coffee bean image")
    group.add_argument("--url",   type=str, help="URL of coffee bean image")
    group.add_argument("--demo",  action="store_true", help="Run demo with sample URL")
    args = parser.parse_args()

    # API key check
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OpenRouter_API_KEY", "")
    if not gemini_key and not openrouter_key:
        console.print(Panel(
            "[bold red]No AI image-analysis key configured![/bold red]\n\n"
            "1. Set [cyan]GEMINI_API_KEY[/cyan] for Google Gemini\n"
            "2. Or set [cyan]OPENROUTER_API_KEY[/cyan] for OpenRouter fallback\n\n"
            "Add it to [bold]grader/.env[/bold]:\n\n"
            "   [cyan]GEMINI_API_KEY=your_key_here[/cyan]\n"
            "   [cyan]OPENROUTER_API_KEY=your_key_here[/cyan]",
            title="Setup Required",
            border_style="red",
        ))
        sys.exit(1)

    grader = CoffeeGrader(api_key=gemini_key, openrouter_api_key=openrouter_key)

    # Demo mode uses a public coffee bean image
    DEMO_URL = (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/"
        "A_small_cup_of_coffee.JPG/640px-A_small_cup_of_coffee.JPG"
    )

    console.print(f"\n[bold cyan]🫘 Analyzing coffee beans with {MODEL} (Gemini primary, OpenRouter fallback)…[/bold cyan]")

    try:
        if args.demo:
            console.print(f"[dim]Demo mode — using sample image[/dim]")
            result = grader.grade(image_url=DEMO_URL)
        elif args.url:
            result = grader.grade(image_url=args.url)
        else:
            result = grader.grade(image_path=args.image)

    except FileNotFoundError as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        sys.exit(1)
    except Exception as e:
        console.print(f"[bold red]Unexpected error:[/bold red] {e}")
        logger.exception("Grading failed")
        sys.exit(1)

    # Display in terminal
    display_result(result)

    # Save JSON
    output_path = Path("grade_result.json")
    output_path.write_text(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))

    # Exit code reflects confidence
    sys.exit(0 if not result.is_fallback else 2)


if __name__ == "__main__":
    main()
