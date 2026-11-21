"""
Creates real Buna marketplace listings from a farmer's voice or text "sell" message.

The bot never lists anything on its own: it shows the draft, the farmer taps
"Confirm listing", and only then the listing is posted to the Buna server.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

import httpx
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup

from bot.config import BUNA_API_URL, BUNA_BOT_API_KEY, logger
from bot.voice_service import VoiceIntent

HTTP_TIMEOUT = 20.0


@dataclass
class ListingDraft:
    processing: str
    grade: int
    quantity_kg: float
    price_etb: Optional[float] = None

    @property
    def grade_name(self) -> str:
        return f"{self.processing} G{self.grade}"


def draft_from_intent(intent: VoiceIntent) -> Optional[ListingDraft]:
    """A listing needs at least a quantity; grade defaults to G4, the most common Jimma lot."""
    if intent.intent != "sell" or not intent.quantity_kg or intent.quantity_kg <= 0:
        return None
    processing = "Washed" if (intent.processing or "").lower() == "washed" else "Natural"
    return ListingDraft(processing, intent.grade or 4, float(intent.quantity_kg), intent.price_etb)


TEXTS = {
    "confirm_prompt": {
        "om": "Gabaa Buna irratti galmeessuu? <b>{grade}</b> · kiiloo {qty} · {price}",
        "am": "በቡና ገበያ ላይ ልዘርዝረው? <b>{grade}</b> · {qty} ኪሎ · {price}",
        "en": "List this on the Buna marketplace? <b>{grade}</b> · {qty} kg · {price}",
    },
    "price_market": {
        "om": "gatii gabaa",
        "am": "የገበያ ዋጋ",
        "en": "market reference price",
    },
    "confirm_button": {"om": "✅ Galmeessi", "am": "✅ ዘርዝር", "en": "✅ Confirm listing"},
    "cancel_button": {"om": "✖ Dhiisi", "am": "✖ ሰርዝ", "en": "✖ Cancel"},
    "share_phone": {
        "om": "Gurgurtaa galmeessuuf lakkoofsa bilbilaa kee nuuf qooddi. Bitattoonni ittiin si qunnamu.",
        "am": "ለመዘርዘር ስልክ ቁጥርዎን ያጋሩ። ገዢዎች በዚህ ቁጥር ያገኙዎታል።",
        "en": "To list your coffee, share your phone number. Buyers will use it to reach you.",
    },
    "share_phone_button": {"om": "📱 Lakkoofsa qooddi", "am": "📱 ስልክ አጋራ", "en": "📱 Share phone number"},
    "created": {
        "om": "✅ Galmeeffameera! {grade} kiiloo {qty} qarshii {price}n gabaa Buna irra jira. Bitattoonni amma gatii siif dhiyeessuu danda'u.",
        "am": "✅ ተዘርዝሯል! {grade} {qty} ኪሎ በ{price} ብር በቡና ገበያ ላይ ነው። ገዢዎች አሁን ዋጋ ሊያቀርቡልዎ ይችላሉ።",
        "en": "✅ Listed! {grade}, {qty} kg at {price} ETB/kg is now on the Buna marketplace. Buyers can send you offers.",
    },
    "below_floor": {
        "om": "⚠️ Gatiin kee gatii gadi aanaa gadi. Bitattoonni gatii gadi aanaa gadi dhiyeessuu hin danda'an.",
        "am": "⚠️ ዋጋዎ ከዝቅተኛው ዋጋ በታች ነው። ገዢዎች ከዝቅተኛው ዋጋ በታች ማቅረብ አይችሉም።",
        "en": "⚠️ Your asking price is below the protection floor. Buyers still cannot offer below the floor.",
    },
    "cancelled": {"om": "Haqameera.", "am": "ተሰርዟል።", "en": "Cancelled. Nothing was listed."},
    "expired": {
        "om": "Kun yeroon isaa darbeera. Mee ergaa gurgurtaa irra deebi'ii ergi.",
        "am": "ይህ ጊዜው አልፎበታል። እባክዎ የሽያጭ መልእክቱን እንደገና ይላኩ።",
        "en": "This draft has expired. Please send your sell message again.",
    },
    "failed": {
        "om": "❌ Galmeessuun hin danda'amne ({error}). Booda yaali.",
        "am": "❌ መዘርዘር አልተቻለም ({error})። ቆይተው ይሞክሩ።",
        "en": "❌ Could not create the listing ({error}). Please try again later.",
    },
}


def text(key: str, lang: str, **values: str) -> str:
    lang = lang if lang in ("om", "am", "en") else "om"
    return TEXTS[key][lang].format(**values)


class ContactStore:
    """Telegram user id -> phone number shared by the farmer (persisted as JSON)."""

    def __init__(self, filepath: Path) -> None:
        self.filepath = filepath
        self.phones: Dict[int, str] = {}
        if filepath.exists():
            try:
                self.phones = {int(k): v for k, v in json.loads(filepath.read_text(encoding="utf-8")).items()}
            except Exception as exc:
                logger.warning("Could not load contacts: %s", exc)

    def get(self, user_id: int) -> Optional[str]:
        return self.phones.get(user_id)

    def set(self, user_id: int, phone: str) -> None:
        self.phones[user_id] = phone
        try:
            self.filepath.write_text(json.dumps(self.phones, indent=2), encoding="utf-8")
        except Exception as exc:
            logger.warning("Could not save contacts: %s", exc)


class ListingService:
    def __init__(self, api_url: str = BUNA_API_URL, api_key: str = BUNA_BOT_API_KEY) -> None:
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.drafts: Dict[str, ListingDraft] = {}

    def save_draft(self, draft: ListingDraft) -> str:
        draft_id = uuid.uuid4().hex[:10]
        self.drafts[draft_id] = draft
        return draft_id

    def confirm_prompt(self, draft: ListingDraft, draft_id: str, lang: str) -> tuple[str, InlineKeyboardMarkup]:
        price = f"{draft.price_etb:,.0f} ETB/kg" if draft.price_etb else text("price_market", lang)
        keyboard = InlineKeyboardMarkup(
            [[
                InlineKeyboardButton(text("confirm_button", lang), callback_data=f"listconfirm:{draft_id}"),
                InlineKeyboardButton(text("cancel_button", lang), callback_data=f"listcancel:{draft_id}"),
            ]]
        )
        return text("confirm_prompt", lang, grade=draft.grade_name, qty=f"{draft.quantity_kg:,.0f}", price=price), keyboard

    @staticmethod
    def phone_keyboard(lang: str) -> ReplyKeyboardMarkup:
        return ReplyKeyboardMarkup(
            [[KeyboardButton(text("share_phone_button", lang), request_contact=True)]],
            resize_keyboard=True,
            one_time_keyboard=True,
        )

    async def create_listing(self, draft: ListingDraft, phone: str, farmer_name: str) -> dict:
        """POST the draft to the Buna server. Returns the server JSON; raises on failure."""
        payload = {
            "farmerPhone": phone,
            "farmerName": farmer_name,
            "coffeeType": f"Jimma {draft.grade_name}",
            "processing": draft.processing.lower(),
            "grade": f"Grade {draft.grade}",
            "quantityKg": draft.quantity_kg,
            "description": "Listed by voice via @bunajimmabot",
        }
        if draft.price_etb:
            payload["askingPricePerKg"] = draft.price_etb
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.post(
                f"{self.api_url}/bot/listings",
                json=payload,
                headers={"x-api-key": self.api_key},
            )
        data = response.json() if response.content else {}
        if not response.is_success:
            raise RuntimeError(data.get("message") or f"HTTP {response.status_code}")
        return data

    @staticmethod
    def result_text(data: dict, draft: ListingDraft, lang: str) -> str:
        listing = data.get("listing") or {}
        price = listing.get("askingPricePerKg") or draft.price_etb or 0
        message = text("created", lang, grade=draft.grade_name, qty=f"{draft.quantity_kg:,.0f}", price=f"{price:,.0f}")
        status = (data.get("fairness") or {}).get("status") or listing.get("priceFairnessStatus")
        if status in ("low", "very_low"):
            message += "\n\n" + text("below_floor", lang)
        return message

