"""
Quick integration test for the Buna Fair Price grader.
Run: python test_grader.py

Tests:
  1. GradeResult dataclass construction
  2. Price enrichment from ECX table
  3. JSON serialization
  4. Fallback result structure
  5. Cache key generation
  6. Live API call (skipped if no API key)
"""

from __future__ import annotations

import hashlib
import json
import os
import sys

# ── Test helpers ──────────────────────────────────────────────────────────────
PASS = "✅"
FAIL = "❌"
results: list[tuple[str, bool]] = []

def test(name: str, condition: bool) -> None:
    icon = PASS if condition else FAIL
    print(f"  {icon} {name}")
    results.append((name, condition))


# ── Import the module ─────────────────────────────────────────────────────────
sys.path.insert(0, ".")
from grader import GradeResult, ECX_PRICES, FALLBACK_RESULT, CoffeeGrader


print("\n🫘 Buna Fair Price — Grader Unit Tests\n")

# ── Test 1: GradeResult construction ─────────────────────────────────────────
print("1. GradeResult Construction")
try:
    r = GradeResult(
        grade_tier="Washed G2",
        processing_type="Washed",
        grade_number=2,
        defect_percentage=8.5,
        color_quality="good",
        uniformity_score=7,
        moisture_level="normal",
        confidence="high",
        is_fallback=False,
        summary_english="Good washed coffee with minimal defects.",
        sorting_advice_english="Remove any yellow-tipped beans before sale.",
        tips_oromo=["Caffee baasaa qulqulleessi"],
        tips_amharic=["ቡናውን አፅዱ"],
    )
    test("Dataclass creates without error", True)
    test("grade_tier correct", r.grade_tier == "Washed G2")
    test("grade_number correct", r.grade_number == 2)
    test("is_fallback is False", r.is_fallback is False)
except Exception as e:
    test(f"Dataclass construction FAILED: {e}", False)

# ── Test 2: Price enrichment ──────────────────────────────────────────────────
print("\n2. ECX Price Enrichment")
r.enrich_with_prices()
test("Price min is set",   r.estimated_price_min_etb is not None)
test("Price max is set",   r.estimated_price_max_etb is not None)
test("Washed G2 min >= 900", (r.estimated_price_min_etb or 0) >= 900)
test("Washed G2 max <= 1200", (r.estimated_price_max_etb or 9999) <= 1200)

# ── Test 3: JSON serialization ────────────────────────────────────────────────
print("\n3. JSON Serialization")
try:
    d = r.to_dict()
    json_str = json.dumps(d, ensure_ascii=False)
    parsed = json.loads(json_str)
    test("to_dict() returns dict",         isinstance(d, dict))
    test("JSON round-trip OK",             parsed["grade_tier"] == "Washed G2")
    test("Oromo tips in JSON",             len(parsed["tips_oromo"]) > 0)
    test("Amharic tips in JSON",           len(parsed["tips_amharic"]) > 0)
    test("Price fields in JSON",           "estimated_price_min_etb" in parsed)
except Exception as e:
    test(f"JSON serialization FAILED: {e}", False)

# ── Test 4: Fallback structure ────────────────────────────────────────────────
print("\n4. Fallback Result Structure")
required_keys = [
    "grade_tier", "processing_type", "grade_number", "defect_percentage",
    "color_quality", "uniformity_score", "confidence", "is_fallback",
    "summary_english", "tips_oromo", "tips_amharic"
]
for key in required_keys:
    test(f"Fallback has '{key}'", key in FALLBACK_RESULT)

# ── Test 5: ECX price table ───────────────────────────────────────────────────
print("\n5. ECX Price Table")
test("Has Washed grades 1-5",   all(f"Washed G{i}" in ECX_PRICES for i in range(1, 6)))
test("Has Natural grades 1-5",  all(f"Natural G{i}" in ECX_PRICES for i in range(1, 6)))
test("G1 price > G5 price",
    ECX_PRICES["Washed G1"]["min"] > ECX_PRICES["Washed G5"]["max"])
test("All entries have min/max", all(
    "min" in v and "max" in v for v in ECX_PRICES.values()
))

# ── Test 6: Cache key ─────────────────────────────────────────────────────────
print("\n6. Cache Key (image hashing)")
sample_bytes = b"fake_image_data"
key = hashlib.sha256(sample_bytes).hexdigest()[:16]
test("Hash is 16 chars", len(key) == 16)
test("Hash is deterministic", key == hashlib.sha256(sample_bytes).hexdigest()[:16])

# ── Test 7: Live API (optional) ───────────────────────────────────────────────
print("\n7. Live Gemini API Call (optional)")
api_key = os.getenv("GEMINI_API_KEY", "")
if not api_key or api_key == "your_api_key_here":
    print("  ⏭️  Skipped — set GEMINI_API_KEY in .env to run live test")
else:
    try:
        grader = CoffeeGrader(api_key)
        # Use a small public test image
        result = grader.grade(image_url=(
            "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/"
            "Green_coffee_beans.jpg/640px-Green_coffee_beans.jpg"
        ))
        test("Live call returns GradeResult",    isinstance(result, GradeResult))
        test("grade_tier is non-empty",          len(result.grade_tier) > 0)
        test("tips_oromo has 3 items",           len(result.tips_oromo) == 3)
        test("tips_amharic has 3 items",         len(result.tips_amharic) == 3)
        test("Price range is set",               result.estimated_price_min_etb is not None)
        test("Not a fallback",                   not result.is_fallback)
        test("Processed under 15 seconds",       (result.processing_time_ms or 99999) < 15000)
        print(f"\n  📋 Grade received: [bold]{result.grade_tier}[/bold]")
        print(f"  💰 Price: {result.estimated_price_min_etb}–{result.estimated_price_max_etb} ETB/kg")
    except Exception as e:
        test(f"Live API call FAILED: {e}", False)

# ── Summary ───────────────────────────────────────────────────────────────────
total   = len(results)
passed  = sum(1 for _, ok in results if ok)
failed  = total - passed

print(f"\n{'─'*45}")
print(f"  Results: {passed}/{total} passed  |  {failed} failed")
if failed == 0:
    print("  🏆 All tests passed — grader is ready!")
else:
    print("  ⚠️  Fix failing tests before wiring into the bot.")
print(f"{'─'*45}\n")

sys.exit(0 if failed == 0 else 1)
