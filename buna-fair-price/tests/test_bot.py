"""
Unit tests for BunaJimma Telegram Bot components.
Run:
    python -m unittest tests/test_bot.py
"""

from __future__ import annotations

import io
import sys
import unittest
from pathlib import Path

# Add directories to sys.path
TEST_DIR = Path(__file__).resolve().parent
REPO_ROOT = TEST_DIR.parent
GRADER_DIR = REPO_ROOT / "grader"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(GRADER_DIR))

from bot.locales import get_text, TEXTS, LANGUAGES
from bot.formatter import (
    format_grade_result,
    format_grade_badge,
    format_ecx_table,
    build_result_keyboard,
    build_language_keyboard,
)
from bot.voice_service import VoiceService, words_to_numbers
from bot.listing_service import ListingDraft, ListingService, draft_from_intent
from bot.main import UserPreferenceStore, create_application
from grader import GradeResult, ECX_PRICES, CoffeeGrader


class TestBunaJimmaLocales(unittest.TestCase):
    def test_languages_defined(self):
        self.assertIn("om", LANGUAGES)
        self.assertIn("am", LANGUAGES)
        self.assertIn("en", LANGUAGES)

    def test_required_keys_present_in_all_languages(self):
        required_keys = [
            "bot_title",
            "welcome",
            "help_text",
            "analyzing",
            "about",
            "price_header",
            "metric_grade",
            "metric_price",
            "metric_defects",
            "metric_color",
            "voice_ack",
        ]
        for lang in ["om", "am", "en"]:
            for key in required_keys:
                self.assertIn(key, TEXTS[lang], f"Missing key '{key}' in lang '{lang}'")

    def test_get_text_fallback(self):
        # Existing key in Oromo
        self.assertTrue(len(get_text("bot_title", "om")) > 0)
        # Non-existing key falls back to [key]
        self.assertEqual(get_text("non_existent_key_xyz", "om"), "[non_existent_key_xyz]")


class TestBunaJimmaFormatter(unittest.TestCase):
    def setUp(self):
        self.sample_result = GradeResult(
            grade_tier="Washed G2",
            processing_type="Washed",
            grade_number=2,
            defect_percentage=8.0,
            color_quality="light green",
            uniformity_score=8,
            moisture_level="normal",
            confidence="high",
            is_fallback=False,
            summary_english="High quality Jimma washed beans with uniform size and low defects.",
            sorting_advice_english="Remove remaining unpulped cherries before hulling.",
            tips_oromo=[
                "Buna dhiqamaa qulqullinaan gogsan qulqullina G2 qaba.",
                "Ija caccabaa yoo keessaa fo'an gatiin dabalata.",
            ],
            tips_amharic=[
                "ጥሩ የታጠበ የጅማ ቡና ደረጃ 2 ጥራት አለው።",
                "የተሰበሩ ፍሬዎችን በመለየት ተጨማሪ ዋጋ ማግኘት ይቻላል።",
            ],
            estimated_price_min_etb=965.0,
            estimated_price_max_etb=1130.0,
        )

    def test_format_grade_badge(self):
        badge_g1 = format_grade_badge(1, "Washed G1")
        self.assertIn("🟢", badge_g1)
        self.assertIn("Washed G1", badge_g1)

        badge_g4 = format_grade_badge(4, "Natural G4")
        self.assertIn("🟡", badge_g4)

        badge_g5 = format_grade_badge(5, "Natural G5")
        self.assertIn("🔴", badge_g5)

    def test_format_grade_result_oromo(self):
        formatted = format_grade_result(self.sample_result, lang="om")
        self.assertIn("Washed G2", formatted)
        self.assertIn("965", formatted)
        self.assertIn("1130", formatted)
        self.assertIn("ETB/kg", formatted)
        self.assertIn("Buna dhiqamaa qulqullinaan gogsan", formatted)

    def test_format_grade_result_amharic(self):
        formatted = format_grade_result(self.sample_result, lang="am")
        self.assertIn("Washed G2", formatted)
        self.assertIn("965", formatted)
        self.assertIn("1130", formatted)
        self.assertIn("ብር", formatted)
        self.assertIn("ጥሩ የታጠበ የጅማ ቡና", formatted)

    def test_format_grade_result_english(self):
        formatted = format_grade_result(self.sample_result, lang="en")
        self.assertIn("Washed G2", formatted)
        self.assertIn("965", formatted)
        self.assertIn("High quality Jimma washed beans", formatted)

    def test_format_ecx_table(self):
        table_om = format_ecx_table(ECX_PRICES, lang="om")
        self.assertIn("Washed G1", table_om)
        self.assertIn("Natural G1", table_om)
        self.assertIn("ETB/kg", table_om)

    def test_keyboards(self):
        kb_result = build_result_keyboard("om", "test1234")
        self.assertTrue(len(kb_result.inline_keyboard) >= 2)

        kb_lang = build_language_keyboard()
        self.assertEqual(len(kb_lang.inline_keyboard), 3)


class TestVoiceService(unittest.IsolatedAsyncioTestCase):
    async def test_voice_ack(self):
        service = VoiceService()
        ack_om = await service.handle_voice_message(user_lang="om")
        self.assertIn("Sagaleen", ack_om)

        ack_am = await service.handle_voice_message(user_lang="am")
        self.assertIn("የድምጽ መልዕክትዎ", ack_am)

        ack_en = await service.handle_voice_message(user_lang="en")
        self.assertIn("Voice message received", ack_en)

    async def test_transcribe_without_keys(self):
        service = VoiceService(addis_api_key="", gemini_api_key="")
        res = await service.transcribe(b"fake audio bytes", lang_hint="om")
        self.assertEqual(res.detected_language, "om")
        self.assertFalse(res.is_supported)

    def test_number_words(self):
        self.assertEqual(words_to_numbers("kiiloo dhibba shan qarshii kuma tokko"), [500, 1000])
        self.assertEqual(words_to_numbers("dhibba lamaa fi shantama"), [250])
        self.assertEqual(words_to_numbers("አንድ ሺህ አምስት መቶ"), [1500])
        self.assertEqual(words_to_numbers("500 kg 1,050 birr"), [500, 1050])

    async def test_price_answer(self):
        service = VoiceService(addis_api_key="", gemini_api_key="")
        answer = await service.answer("Gatiin buna Natural G2 meeqa?", "om", ECX_PRICES)
        self.assertEqual(answer.intent.intent, "price")
        self.assertIn("Natural G2", answer.text)
        self.assertIn("895", answer.text)

    async def test_low_sell_warning(self):
        service = VoiceService(addis_api_key="", gemini_api_key="")
        answer = await service.answer("I want to sell 500 kg natural G4 at 400 birr", "en", ECX_PRICES)
        self.assertEqual(answer.intent.intent, "sell")
        self.assertIn("below", answer.text)


class TestVoiceListing(unittest.IsolatedAsyncioTestCase):
    async def test_sell_intent_builds_draft(self):
        service = VoiceService(addis_api_key="", gemini_api_key="")
        answer = await service.answer("I want to sell 500 kg washed G2 at 1000 birr", "en", ECX_PRICES)
        draft = draft_from_intent(answer.intent)
        self.assertIsNotNone(draft)
        self.assertEqual(draft.grade_name, "Washed G2")
        self.assertEqual(draft.quantity_kg, 500)
        self.assertEqual(draft.price_etb, 1000)

    async def test_price_question_has_no_draft(self):
        service = VoiceService(addis_api_key="", gemini_api_key="")
        answer = await service.answer("Gatiin buna Natural G2 meeqa?", "om", ECX_PRICES)
        self.assertIsNone(draft_from_intent(answer.intent))

    def test_confirm_prompt_buttons(self):
        listings = ListingService(api_url="http://localhost:5000/api/v1", api_key="test")
        draft = ListingDraft("Natural", 4, 300.0)
        draft_id = listings.save_draft(draft)
        prompt, keyboard = listings.confirm_prompt(draft, draft_id, "en")
        self.assertIn("Natural G4", prompt)
        callbacks = [button.callback_data for button in keyboard.inline_keyboard[0]]
        self.assertEqual(callbacks, [f"listconfirm:{draft_id}", f"listcancel:{draft_id}"])

    def test_result_text_warns_below_floor(self):
        draft = ListingDraft("Natural", 4, 300.0, 400.0)
        message = ListingService.result_text({"listing": {"askingPricePerKg": 400}, "fairness": {"status": "very_low"}}, draft, "en")
        self.assertIn("Listed", message)
        self.assertIn("below the protection floor", message)


class TestUserPreferenceStore(unittest.TestCase):
    def test_store_and_load(self):
        temp_file = Path("/tmp/test_bunajimma_prefs.json")
        if temp_file.exists():
            temp_file.unlink()

        store = UserPreferenceStore(temp_file)
        self.assertEqual(store.get_lang(12345), "om")

        store.set_lang(12345, "am")
        self.assertEqual(store.get_lang(12345), "am")

        # Reload from file
        store2 = UserPreferenceStore(temp_file)
        self.assertEqual(store2.get_lang(12345), "am")

        temp_file.unlink()


class TestCoffeeGraderBytesSupport(unittest.TestCase):
    def test_bytes_support_and_cache(self):
        grader = CoffeeGrader(api_key="test_dummy_key")
        dummy_bytes = b"fake-coffee-beans-image-bytes-data"
        h1 = grader._hash_image(dummy_bytes)
        h2 = grader._hash_image(dummy_bytes)
        self.assertEqual(h1, h2)
        self.assertEqual(len(h1), 16)


class TestBotApplicationBuilder(unittest.TestCase):
    def test_create_application(self):
        dummy_token = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ1234567"
        app = create_application(token=dummy_token)
        self.assertIsNotNone(app)
        # Check handlers registered
        self.assertTrue(len(app.handlers[0]) >= 5)


if __name__ == "__main__":
    unittest.main()
