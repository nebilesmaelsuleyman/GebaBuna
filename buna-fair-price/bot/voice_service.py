"""
Voice Service Module for BunaJimma Bot (@bunajimmabot).

Flow for a farmer voice note:
1. Speech-to-text with Addis AI Scribe (Afaan Oromoo / Amharic), Gemini audio as fallback.
2. Intent extraction (price question or sell offer) with Gemini, keyword rules as fallback.
3. Answer built from the ECX reference price table (grader.ECX_PRICES).
4. Text-to-speech reply with Addis AI Voice (om-bikila / am-amanuel).
"""

from __future__ import annotations

import base64
import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

import httpx

from bot.config import ADDIS_API_KEY, GEMINI_API_KEY, GEMINI_MODEL
from bot.locales import get_text

logger = logging.getLogger("bunajimma.voice")

ADDIS_API_URL = "https://api.addisassistant.com/api/v1"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
TTS_VOICES = {"om": "om-bikila", "am": "am-amanuel"}
HTTP_TIMEOUT = httpx.Timeout(45.0, connect=10.0)


@dataclass
class VoiceTranscriptionResult:
    """Represents a speech transcription output."""
    text: str
    detected_language: str  # 'om', 'am', 'en'
    confidence: float
    is_supported: bool
    provider: str = "none"


@dataclass
class VoiceIntent:
    intent: str = "other"  # 'price' | 'sell' | 'other'
    processing: str = "Natural"
    grade: Optional[int] = None
    quantity_kg: Optional[float] = None
    price_etb: Optional[float] = None


@dataclass
class VoiceAnswer:
    text: str
    intent: VoiceIntent = field(default_factory=VoiceIntent)


REPLIES = {
    "price": {
        "om": "Gatiin {grade} har'aa qarshii {min} hanga {max} kiiloo tokkoof. Qarshii {min} gadi hin gurguratinaa.",
        "am": "የ{grade} ዋጋ ዛሬ በኪሎ ከ{min} እስከ {max} ብር ነው። ከ{min} ብር በታች አይሽጡ።",
        "en": "Today's price for {grade} is {min} to {max} ETB per kg. Do not sell below {min} ETB.",
    },
    "sell_fair": {
        "om": "Buna {grade} kiiloo {qty} qarshii {price}n gurguruu barbaadda. Gatiin kun haqa qabeessa; gatiin gadi aanaa qarshii {min}.",
        "am": "{grade} {qty} ኪሎ በ{price} ብር መሸጥ ይፈልጋሉ። ዋጋው ፍትሃዊ ነው፤ ዝቅተኛው ዋጋ {min} ብር ነው።",
        "en": "You want to sell {qty} kg of {grade} at {price} ETB per kg. That price is fair; the floor is {min} ETB.",
    },
    "sell_low": {
        "om": "Of eeggadhu! Qarshii {price} gatii gadi aanaa {grade} qarshii {min} gadi. Yoo xiqqaate qarshii {min} gaafadhu.",
        "am": "ይጠንቀቁ! {price} ብር ለ{grade} ከዝቅተኛው ዋጋ {min} ብር በታች ነው። ቢያንስ {min} ብር ይጠይቁ።",
        "en": "Careful! {price} ETB is below the {grade} floor of {min} ETB per kg. Ask for at least {min} ETB.",
    },
    "sell_no_price": {
        "om": "Buna {grade} kiiloo {qty} qabda. Gatiin haqa qabeessaan qarshii {min} hanga {max} kiiloo tokkoof.",
        "am": "{grade} {qty} ኪሎ አለዎት። ፍትሃዊ ዋጋው በኪሎ ከ{min} እስከ {max} ብር ነው።",
        "en": "You have {qty} kg of {grade}. A fair price is {min} to {max} ETB per kg.",
    },
    "other": {
        "om": "Dhiifama, hin hubanne. Fakkeenyaaf jedhi: 'Gatiin buna Natural G2 meeqa?' ykn 'Kiiloo dhibba shan qarshii kuma tokkoon gurguruun barbaada.'",
        "am": "ይቅርታ፣ አልገባኝም። ለምሳሌ 'የጀንፈል ደረጃ 2 ዋጋ ስንት ነው?' ወይም 'አምስት መቶ ኪሎ በሺህ ብር መሸጥ እፈልጋለሁ' ይበሉ።",
        "en": "Sorry, I did not understand. Try: 'What is the price of Natural G2?' or 'I want to sell 500 kg at 1000 birr.'",
    },
    "not_heard": {
        "om": "Sagalee kee dhaga'uu hin dandeenye. Mee irra deebi'ii suuta dubbadhu.",
        "am": "ድምጽዎን መስማት አልቻልኩም። እባክዎ እንደገና በዝግታ ይናገሩ።",
        "en": "I could not hear your voice note clearly. Please speak slowly and try again.",
    },
    "heard": {
        "om": "🎙️ Kan ati jette: <i>{text}</i>",
        "am": "🎙️ ያሉት: <i>{text}</i>",
        "en": "🎙️ You said: <i>{text}</i>",
    },
}

INTENT_PROMPT = """You extract intent from an Ethiopian coffee farmer's message ({language}).
Message: "{text}"
Return ONLY JSON: {{"intent": "price" | "sell" | "other", "processing": "Washed" | "Natural" | null,
"grade": 1-5 or null, "quantity_kg": number or null, "price_etb": number or null}}
- "price": the farmer asks what coffee is worth (gatii, meeqa, ዋጋ, ስንት, price).
- "sell": the farmer wants to sell or has an amount of coffee, maybe with a price per kg.
- Washed = dhiqamaa / የታጠበ; Natural = jenfel / gogaa / ያልታጠበ / ጀንፈል.
- Convert number words to digits (dhibba shan = 500, kuma tokko = 1000, አምስት መቶ = 500).
"""

OM_UNITS = {"tokko": 1, "lama": 2, "sadii": 3, "afur": 4, "shan": 5, "ja'a": 6, "jaha": 6,
            "torba": 7, "saddeet": 8, "saddet": 8, "sagal": 9}
OM_TENS = {"kudhan": 10, "kudan": 10, "digdama": 20, "soddoma": 30, "afurtama": 40, "shantama": 50,
           "jaatama": 60, "torbaatama": 70, "saddeettama": 80, "sagaltama": 90}
AM_UNITS = {"አንድ": 1, "ሁለት": 2, "ሶስት": 3, "ሦስት": 3, "አራት": 4, "አምስት": 5, "ስድስት": 6,
            "ሰባት": 7, "ስምንት": 8, "ዘጠኝ": 9}
AM_TENS = {"አስር": 10, "ሃያ": 20, "ሰላሳ": 30, "አርባ": 40, "ሃምሳ": 50, "ስልሳ": 60, "ሰባ": 70,
           "ሰማንያ": 80, "ዘጠና": 90}


def words_to_numbers(text: str) -> list[float]:
    """Pull numbers out of text, including simple Oromo and Amharic number words."""
    numbers = [float(n.replace(",", "")) for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]
    if numbers:
        return numbers

    def lookup(table: dict, token: str) -> int:
        # Oromo adds vowel suffixes (lamaa, shanii), so also try the shortened stem
        return table.get(token) or table.get(token[:-1]) or table.get(token[:-2]) or 0

    multipliers = {"dhibba": 100, "መቶ": 100, "kuma": 1000, "ሺህ": 1000, "ሺ": 1000}
    tokens = re.findall(r"[\w']+", text.lower())
    results: list[float] = []
    current = 0
    pending_unit = 0
    i = 0
    while i < len(tokens):
        token = tokens[i]
        unit = lookup(OM_UNITS, token) or AM_UNITS.get(token, 0)
        tens = lookup(OM_TENS, token) or AM_TENS.get(token, 0)
        if token in multipliers:
            factor = multipliers[token]
            next_unit = lookup(OM_UNITS, tokens[i + 1]) if i + 1 < len(tokens) else 0
            if pending_unit:  # Amharic order: አምስት መቶ = 5 x 100
                current += pending_unit * factor
                pending_unit = 0
            elif next_unit:  # Oromo order: dhibba shan = 100 x 5
                current += next_unit * factor
                i += 1
            else:
                current += factor
        elif tens:
            current += tens
        elif unit:
            pending_unit = unit
        elif token != "fi" and (current or pending_unit):
            results.append(float(current + pending_unit))
            current, pending_unit = 0, 0
        i += 1
    if current or pending_unit:
        results.append(float(current + pending_unit))
    return [n for n in results if n > 0]


def rule_based_intent(text: str) -> VoiceIntent:
    lower = text.lower()
    intent = VoiceIntent()
    if re.search(r"dhiqam|washed|የታጠበ", lower):
        intent.processing = "Washed"
    grade_match = re.search(r"(?:g|grade|sadarkaa|ደረጃ)\s*([1-5])", lower)
    if grade_match:
        intent.grade = int(grade_match.group(1))

    numbers = [n for n in words_to_numbers(lower) if not (intent.grade and n == intent.grade)]
    if re.search(r"gurgur|sell|መሸጥ|እሸጣለሁ|kiiloo|kilo|ኪሎ", lower) and numbers:
        intent.intent = "sell"
        intent.quantity_kg = numbers[0]
        if len(numbers) > 1:
            intent.price_etb = numbers[1]
    elif re.search(r"gatii|meeqa|price|ዋጋ|ስንት", lower):
        intent.intent = "price"
    return intent


class VoiceService:
    """Speech-to-text, intent extraction and text-to-speech for farmer voice notes."""

    def __init__(self, addis_api_key: Optional[str] = None, gemini_api_key: Optional[str] = None) -> None:
        self.addis_api_key = ADDIS_API_KEY if addis_api_key is None else addis_api_key
        self.gemini_api_key = GEMINI_API_KEY if gemini_api_key is None else gemini_api_key
        self.stt_enabled = bool(self.addis_api_key or self.gemini_api_key)
        self.tts_enabled = bool(self.addis_api_key)
        logger.info("VoiceService ready (stt=%s, tts=%s)", self.stt_enabled, self.tts_enabled)

    async def handle_voice_message(self, user_lang: str = "om") -> str:
        """Short acknowledgement shown while the voice note is processed."""
        return get_text("voice_ack", lang=user_lang)

    # ── Speech to text ────────────────────────────────────────────────────────
    async def transcribe(
        self, voice_bytes: bytes, lang_hint: Optional[str] = None, mime_type: str = "audio/ogg"
    ) -> VoiceTranscriptionResult:
        lang = lang_hint if lang_hint in ("om", "am", "en") else "om"
        empty = VoiceTranscriptionResult("", lang, 0.0, False)
        if not voice_bytes:
            return empty

        if self.addis_api_key and lang in ("om", "am"):
            try:
                url = (
                    f"{ADDIS_API_URL}/scribe/transcribe?backend=turbo"
                    f"&request_id=scribe_{uuid.uuid4().hex[:12]}&language={lang}"
                )
                async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                    response = await client.post(
                        url,
                        headers={"x-api-key": self.addis_api_key},
                        files={"audio": (f"voice.{mime_type.split('/')[-1]}", voice_bytes, mime_type)},
                    )
                if response.is_success:
                    payload = response.json()
                    text = ((payload.get("data") or {}).get("text") or payload.get("text") or "").strip()
                    if text:
                        return VoiceTranscriptionResult(text, lang, 0.9, True, "addis-ai")
                else:
                    logger.warning("Addis AI scribe error %s: %s", response.status_code, response.text[:200])
            except Exception as exc:
                logger.warning("Addis AI scribe failed: %s", exc)

        if self.gemini_api_key:
            language_name = {"om": "Afaan Oromoo (Qubee script)", "am": "Amharic (Ge'ez script)"}.get(lang, "English")
            prompt = f"Transcribe this voice note from an Ethiopian coffee farmer in {language_name}. Return only the words spoken."
            text = await self._gemini(
                [{"inline_data": {"mime_type": mime_type, "data": base64.b64encode(voice_bytes).decode()}}, {"text": prompt}]
            )
            if text:
                return VoiceTranscriptionResult(text.strip(), lang, 0.75, True, "gemini")

        return empty

    # ── Intent and answer ─────────────────────────────────────────────────────
    async def extract_intent(self, text: str, lang: str = "om") -> VoiceIntent:
        fallback = rule_based_intent(text)
        if not self.gemini_api_key or not text.strip():
            return fallback
        language_name = {"om": "Afaan Oromoo", "am": "Amharic"}.get(lang, "English")
        raw = await self._gemini(
            [{"text": INTENT_PROMPT.format(language=language_name, text=text.replace('"', "'"))}],
            json_mode=True,
        )
        if not raw:
            return fallback
        try:
            data = json.loads(raw)
            grade = data.get("grade")
            return VoiceIntent(
                intent=data.get("intent") if data.get("intent") in ("price", "sell") else fallback.intent,
                processing=data.get("processing") or fallback.processing,
                grade=int(grade) if grade else fallback.grade,
                quantity_kg=float(data["quantity_kg"]) if data.get("quantity_kg") else fallback.quantity_kg,
                price_etb=float(data["price_etb"]) if data.get("price_etb") else fallback.price_etb,
            )
        except (ValueError, TypeError, KeyError):
            return fallback

    def build_answer(self, intent: VoiceIntent, lang: str, price_table: dict) -> str:
        lang = lang if lang in ("om", "am", "en") else "om"
        grade_number = intent.grade or 4  # Natural G4 is the most common Jimma lot
        grade_name = f"{intent.processing} G{grade_number}"
        prices = price_table.get(grade_name) or price_table.get("Natural G4", {"min": 0, "max": 0})
        values = {
            "grade": grade_name,
            "min": f"{prices['min']:,}",
            "max": f"{prices['max']:,}",
            "qty": f"{intent.quantity_kg:,.0f}" if intent.quantity_kg else "",
            "price": f"{intent.price_etb:,.0f}" if intent.price_etb else "",
        }
        if intent.intent == "price":
            key = "price"
        elif intent.intent == "sell" and intent.price_etb:
            key = "sell_low" if intent.price_etb < prices["min"] else "sell_fair"
        elif intent.intent == "sell":
            key = "sell_no_price"
        else:
            key = "other"
        return REPLIES[key][lang].format(**values)

    async def answer(self, text: str, lang: str, price_table: dict) -> VoiceAnswer:
        intent = await self.extract_intent(text, lang)
        return VoiceAnswer(self.build_answer(intent, lang, price_table), intent)

    @staticmethod
    def reply_text(key: str, lang: str, **values: str) -> str:
        lang = lang if lang in ("om", "am", "en") else "om"
        return REPLIES[key][lang].format(**values)

    # ── Text to speech ────────────────────────────────────────────────────────
    async def synthesize(self, text: str, lang: str = "om") -> Optional[tuple[bytes, str]]:
        """Return (audio_bytes, mime_type) from Addis AI Voice, or None when unavailable."""
        voice_id = TTS_VOICES.get(lang)
        if not self.addis_api_key or not voice_id or not text.strip():
            return None
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                response = await client.post(
                    f"{ADDIS_API_URL}/voice/generations",
                    headers={"x-api-key": self.addis_api_key, "Content-Type": "application/json"},
                    json={
                        "client_request_id": f"tts_{uuid.uuid4().hex[:12]}",
                        "voice_id": voice_id,
                        "text": text,
                        "language": lang,
                    },
                )
                if not response.is_success:
                    logger.warning("Addis AI TTS error %s: %s", response.status_code, response.text[:200])
                    return None

                content_type = response.headers.get("content-type", "")
                if "application/json" not in content_type:
                    return response.content, content_type or "audio/mpeg"

                payload = response.json()
                data = payload.get("data") or payload
                mime = data.get("mime_type") or "audio/mpeg"
                raw_audio = data.get("audio") or data.get("audio_base64") or ""
                if raw_audio:
                    clean = re.sub(r"^data:audio/[\w.+-]+;base64,", "", raw_audio)
                    return base64.b64decode(clean), mime
                audio_url = data.get("audio_url") or (data.get("playback") or {}).get("url")
                if audio_url:
                    audio = await client.get(audio_url)
                    if audio.is_success:
                        return audio.content, audio.headers.get("content-type", mime)
        except Exception as exc:
            logger.warning("Addis AI TTS failed: %s", exc)
        return None

    # ── Helpers ───────────────────────────────────────────────────────────────
    async def _gemini(self, parts: list[dict], json_mode: bool = False) -> str:
        body: dict = {"contents": [{"parts": parts}]}
        if json_mode:
            body["generationConfig"] = {"response_mime_type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                response = await client.post(GEMINI_URL, params={"key": self.gemini_api_key}, json=body)
            if response.is_success:
                candidates = response.json().get("candidates") or []
                if candidates:
                    return (candidates[0].get("content", {}).get("parts") or [{}])[0].get("text", "") or ""
            else:
                logger.warning("Gemini error %s: %s", response.status_code, response.text[:200])
        except Exception as exc:
            logger.warning("Gemini request failed: %s", exc)
        return ""
