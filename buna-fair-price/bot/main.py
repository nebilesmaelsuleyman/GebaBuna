"""
BunaJimma — AI Coffee Bean Quality Grader Telegram Bot
Main Bot Application
"""

from __future__ import annotations

import asyncio
import html
import io
import json
import logging
import os
import sys
import uuid
from pathlib import Path
from typing import Dict, Optional

# Ensure buna-fair-price/grader is on sys.path so CoffeeGrader can be imported
BOT_DIR = Path(__file__).resolve().parent
REPO_ROOT = BOT_DIR.parent
GRADER_DIR = REPO_ROOT / "grader"
if str(GRADER_DIR) not in sys.path:
    sys.path.insert(0, str(GRADER_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from telegram import (
    BotCommand,
    ReplyKeyboardRemove,
    Update,
    constants,
)
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from grader import CoffeeGrader, GradeResult, ECX_PRICES, FALLBACK_RESULT
from bot.config import (
    TELEGRAM_BOT_TOKEN,
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    DEFAULT_LANGUAGE,
    DATA_DIR,
    logger,
)
from bot.locales import get_text, TEXTS, LANGUAGES
from bot.formatter import (
    format_grade_result,
    build_result_keyboard,
    format_ecx_table,
    build_language_keyboard,
)
from bot.voice_service import VoiceService, VoiceIntent
from bot.listing_service import ContactStore, ListingService, draft_from_intent, text as listing_text

# ── User Preferences Store ───────────────────────────────────────────────────
USER_LANG_FILE = DATA_DIR / "user_languages.json"


class UserPreferenceStore:
    def __init__(self, filepath: Path) -> None:
        self.filepath = filepath
        self.preferences: Dict[int, str] = {}
        self.load()

    def load(self) -> None:
        if self.filepath.exists():
            try:
                data = json.loads(self.filepath.read_text(encoding="utf-8"))
                self.preferences = {int(k): v for k, v in data.items()}
            except Exception as e:
                logger.warning("Could not load user preferences: %s", e)

    def save(self) -> None:
        try:
            self.filepath.write_text(
                json.dumps(self.preferences, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as e:
            logger.warning("Could not save user preferences: %s", e)

    def get_lang(self, user_id: int) -> str:
        return self.preferences.get(user_id, DEFAULT_LANGUAGE)

    def set_lang(self, user_id: int, lang: str) -> None:
        self.preferences[user_id] = lang
        self.save()


# ── Global Services ──────────────────────────────────────────────────────────
prefs = UserPreferenceStore(USER_LANG_FILE)
voice_service = VoiceService()
contacts = ContactStore(DATA_DIR / "user_contacts.json")
listing_service = ListingService()

# Cache for recent GradeResults: cache_id -> GradeResult
recent_results: Dict[str, GradeResult] = {}

# Lazy initialized Grader instance
_grader_instance: Optional[CoffeeGrader] = None
PHOTO_ANALYSIS_TIMEOUT_SECONDS = 55


def get_grader() -> CoffeeGrader:
    global _grader_instance
    if _grader_instance is None:
        _grader_instance = CoffeeGrader(
            api_key=GEMINI_API_KEY,
            openrouter_api_key=OPENROUTER_API_KEY,
            openrouter_model=OPENROUTER_MODEL,
        )
    return _grader_instance


def build_fallback_grade_result() -> GradeResult:
    """Build a GradeResult object from fallback payload."""
    raw_data = FALLBACK_RESULT
    result = GradeResult(
        grade_tier=raw_data.get("grade_tier", "Natural G4"),
        processing_type=raw_data.get("processing_type", "Natural"),
        grade_number=raw_data.get("grade_number", 4),
        defect_percentage=raw_data.get("defect_percentage", 20),
        color_quality=raw_data.get("color_quality", "fair"),
        uniformity_score=raw_data.get("uniformity_score", 5),
        moisture_level=raw_data.get("moisture_level", "unknown"),
        confidence=raw_data.get("confidence", "low"),
        is_fallback=raw_data.get("is_fallback", True),
        summary_english=raw_data.get("summary_english", ""),
        sorting_advice_english=raw_data.get("sorting_advice_english", ""),
        tips_oromo=raw_data.get("tips_oromo", []),
        tips_amharic=raw_data.get("tips_amharic", []),
    )
    result.enrich_with_prices()
    return result


# ── Command Handlers ──────────────────────────────────────────────────────────
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command: Welcome farmer and offer language selection."""
    user = update.effective_user
    user_id = user.id if user else 0
    lang = prefs.get_lang(user_id)

    welcome_msg = get_text("welcome", lang=lang)
    keyboard = build_language_keyboard()

    if update.message:
        await update.message.reply_html(welcome_msg, reply_markup=keyboard)
        await update.message.reply_html(get_text("send_photo_prompt", lang=lang))


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /help command: Photography tips and ECX guide."""
    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)
    help_text = get_text("help_text", lang=lang)

    if update.message:
        await update.message.reply_html(help_text)


async def price_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /price and /ecx commands: Current ECX benchmark table."""
    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)
    table_text = format_ecx_table(ECX_PRICES, lang=lang)

    if update.message:
        await update.message.reply_html(table_text)


async def language_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /language command: Switch preferred language."""
    keyboard = build_language_keyboard()
    if update.message:
        await update.message.reply_html(
            "🌐 <b>Select your preferred language / Afaan filadhaa / ቋንቋ ይምረጡ:</b>",
            reply_markup=keyboard,
        )


async def about_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /about command: Information about BunaJimma."""
    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)
    about_text = get_text("about", lang=lang)

    if update.message:
        await update.message.reply_html(about_text)


async def fallback_text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle non-command text messages with useful guidance."""
    message = update.message
    if not message:
        return

    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)

    # Typed questions use the same agent as voice notes (price questions, sell offers)
    answer = await voice_service.answer(message.text or "", lang, ECX_PRICES)
    if answer.intent.intent in ("price", "sell"):
        await message.reply_html(answer.text)
        await offer_listing(message, answer.intent, lang)
        return
    await message.reply_html(get_text("unsupported_input", lang=lang))


async def unknown_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle unknown slash commands with localized help prompt."""
    message = update.message
    if not message:
        return

    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)
    await message.reply_html(get_text("unknown_command", lang=lang))


# ── Image Analysis Handler ────────────────────────────────────────────────────
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Process coffee bean photo sent by farmer.
    1. Downloads photo
    2. Sends 'analyzing' status
    3. Runs CoffeeGrader
    4. Responds with formatted grade and bilingual recommendations
    """
    message = update.message
    if not message:
        return

    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)

    # Send status message
    status_msg = await message.reply_html(get_text("analyzing", lang=lang))
    await message.chat.send_action(constants.ChatAction.TYPING)

    try:
        # Determine photo or document
        file_obj = None
        mime_type = "image/jpeg"

        if message.photo:
            # Grab highest resolution photo (last in list)
            photo = message.photo[-1]
            file_obj = await photo.get_file()
        elif message.document and message.document.mime_type and message.document.mime_type.startswith("image/"):
            file_obj = await message.document.get_file()
            mime_type = message.document.mime_type
        else:
            await status_msg.edit_text(get_text("invalid_image", lang=lang))
            return

        # Download image into in-memory byte buffer
        buffer = io.BytesIO()
        await file_obj.download_to_memory(out=buffer)
        image_bytes = buffer.getvalue()

        # Validate the uploaded image is actually coffee before heavy AI grading.
        grader = get_grader()
        loop = asyncio.get_running_loop()
        is_coffee = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: grader.validate_coffee_image(image_bytes=image_bytes, mime_type=mime_type),
            ),
            timeout=PHOTO_ANALYSIS_TIMEOUT_SECONDS,
        )
        if not is_coffee:
            await status_msg.delete()
            await message.reply_html(get_text("not_coffee_image", lang=lang))
            return

        # Grade coffee beans using CoffeeGrader (runs in worker thread so bot stays responsive)
        result: GradeResult = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                lambda: grader.grade(image_bytes=image_bytes, mime_type=mime_type),
            ),
            timeout=PHOTO_ANALYSIS_TIMEOUT_SECONDS,
        )

        # Store in cache for quick language toggling
        cache_id = uuid.uuid4().hex[:10]
        recent_results[cache_id] = result

        # Format result message
        formatted_text = format_grade_result(result, lang=lang)
        keyboard = build_result_keyboard(current_lang=lang, cache_id=cache_id)

        # Delete status message and reply with formatted result
        await status_msg.delete()
        await message.reply_html(formatted_text, reply_markup=keyboard)

    except asyncio.TimeoutError:
        logger.warning("Photo analysis timed out after %s seconds", PHOTO_ANALYSIS_TIMEOUT_SECONDS)
        result = build_fallback_grade_result()
        cache_id = uuid.uuid4().hex[:10]
        recent_results[cache_id] = result
        formatted_text = format_grade_result(result, lang=lang)
        keyboard = build_result_keyboard(current_lang=lang, cache_id=cache_id)
        await status_msg.delete()
        await message.reply_html(
            f"{get_text('analysis_timeout', lang=lang)}\n\n{formatted_text}",
            reply_markup=keyboard,
        )
    except Exception as exc:
        logger.exception("Error processing photo: %s", exc)
        await status_msg.edit_text(get_text("grading_error", lang=lang))


# ── Voice Message Handler ─────────────────────────────────────────────────────
async def send_spoken_reply(message, text: str, lang: str) -> None:
    """Send the answer as text, then as an Addis AI voice reply when available."""
    await message.reply_html(text)
    if lang not in ("om", "am"):
        return
    try:
        await message.chat.send_action(constants.ChatAction.RECORD_VOICE)
        audio = await voice_service.synthesize(text, lang=lang)
        if not audio:
            return
        audio_bytes, mime = audio
        if "ogg" in mime or "opus" in mime:
            await message.reply_voice(voice=io.BytesIO(audio_bytes))
        else:
            extension = "wav" if "wav" in mime else "mp3"
            await message.reply_audio(
                audio=io.BytesIO(audio_bytes),
                filename=f"bunajimma_reply.{extension}",
                title="BunaJimma",
            )
    except Exception as exc:
        logger.warning("Voice reply failed: %s", exc)


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Voice agent: farmer sends a voice note in Afaan Oromoo / Amharic, e.g.
    'Gatiin buna Natural G2 meeqa?' or 'Kiiloo dhibba shan qarshii kuma tokkoon gurguruu barbaada.'
    1. Download the voice note (OGG/Opus)
    2. Transcribe with Addis AI (Gemini fallback)
    3. Understand the intent and compare with the ECX reference price table
    4. Reply with text and a spoken answer
    """
    message = update.message
    if not message:
        return

    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)

    media = message.voice or message.audio
    if not media:
        return

    status_msg = await message.reply_html(await voice_service.handle_voice_message(user_lang=lang))
    await message.chat.send_action(constants.ChatAction.TYPING)

    try:
        file_obj = await media.get_file()
        buffer = io.BytesIO()
        await file_obj.download_to_memory(out=buffer)
        mime_type = getattr(media, "mime_type", None) or "audio/ogg"

        transcript = await voice_service.transcribe(buffer.getvalue(), lang_hint=lang, mime_type=mime_type)
        if not transcript.text:
            await status_msg.edit_text(voice_service.reply_text("not_heard", lang))
            return

        await status_msg.edit_text(
            voice_service.reply_text("heard", lang, text=html.escape(transcript.text)),
            parse_mode=constants.ParseMode.HTML,
        )
        answer = await voice_service.answer(transcript.text, lang, ECX_PRICES)
        await send_spoken_reply(message, answer.text, lang)
        await offer_listing(message, answer.intent, lang)
    except Exception as exc:
        logger.exception("Error processing voice note: %s", exc)
        await status_msg.edit_text(voice_service.reply_text("not_heard", lang))


# ── Voice / text listing (created only after the farmer confirms) ─────────────
async def offer_listing(message, intent: VoiceIntent, lang: str) -> None:
    """After a 'sell' answer, show the draft with Confirm / Cancel buttons."""
    draft = draft_from_intent(intent)
    if not draft:
        return
    draft_id = listing_service.save_draft(draft)
    prompt, keyboard = listing_service.confirm_prompt(draft, draft_id, lang)
    await message.reply_html(prompt, reply_markup=keyboard)


async def publish_draft(message, draft_id: str, user, lang: str) -> None:
    draft = listing_service.drafts.get(draft_id)
    if not draft:
        await message.reply_html(listing_text("expired", lang), reply_markup=ReplyKeyboardRemove())
        return
    phone = contacts.get(user.id)
    try:
        data = await listing_service.create_listing(draft, phone, user.full_name or "")
    except Exception as exc:
        logger.warning("Bot listing failed: %s", exc)
        await message.reply_html(
            listing_text("failed", lang, error=html.escape(str(exc))), reply_markup=ReplyKeyboardRemove()
        )
        return
    listing_service.drafts.pop(draft_id, None)
    await message.reply_html(listing_service.result_text(data, draft, lang), reply_markup=ReplyKeyboardRemove())


async def handle_contact(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Farmer shared their phone number so a confirmed draft can be listed."""
    message = update.message
    user = update.effective_user
    if not message or not message.contact or not user:
        return
    lang = prefs.get_lang(user.id)
    # Only accept the farmer's own number, not a forwarded contact card
    if message.contact.user_id != user.id:
        await message.reply_html(listing_text("share_phone", lang), reply_markup=ListingService.phone_keyboard(lang))
        return
    contacts.set(user.id, message.contact.phone_number)
    draft_id = context.user_data.pop("pending_listing", None)
    if draft_id:
        await publish_draft(message, draft_id, user, lang)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Global error handler to avoid silent failures in chat."""
    logger.exception("Unhandled bot error", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        user_id = update.effective_user.id if update.effective_user else 0
        lang = prefs.get_lang(user_id)
        try:
            await update.effective_message.reply_html(get_text("grading_error", lang=lang))
        except Exception:
            logger.exception("Failed to send error message to user")


async def post_init(application: Application) -> None:
    """Configure command menu when the bot starts."""
    await application.bot.set_my_commands(
        [
            BotCommand("start", "Start and welcome page"),
            BotCommand("help", "How to take coffee photos"),
            BotCommand("price", "View ECX benchmark prices"),
            BotCommand("language", "Change language"),
            BotCommand("about", "About BunaJimma"),
        ]
    )


# ── Callback Query Handler ────────────────────────────────────────────────────
async def handle_callback_query(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle interactive button clicks."""
    query = update.callback_query
    if not query:
        return

    await query.answer()
    data = query.data or ""
    user_id = update.effective_user.id if update.effective_user else 0

    # 1. Set language permanently
    if data.startswith("setlang:"):
        new_lang = data.split(":", 1)[1]
        prefs.set_lang(user_id, new_lang)
        confirm_text = get_text("lang_changed", lang=new_lang)
        prompt_photo = get_text("send_photo_prompt", lang=new_lang)
        await query.edit_message_text(
            f"{confirm_text}\n\n{prompt_photo}",
            parse_mode=constants.ParseMode.HTML,
        )

    # 2. View specific result in an alternate language
    elif data.startswith("reslang:"):
        parts = data.split(":")
        if len(parts) >= 3:
            target_lang = parts[1]
            cache_id = parts[2]
            cached_result = recent_results.get(cache_id)
            if cached_result:
                formatted = format_grade_result(cached_result, lang=target_lang)
                keyboard = build_result_keyboard(current_lang=target_lang, cache_id=cache_id)
                await query.edit_message_text(
                    formatted,
                    parse_mode=constants.ParseMode.HTML,
                    reply_markup=keyboard,
                )

    # 3. View ECX Price Table
    elif data.startswith("ecx_table:"):
        lang = data.split(":", 1)[1] if ":" in data else prefs.get_lang(user_id)
        table_text = format_ecx_table(ECX_PRICES, lang=lang)
        await query.message.reply_html(table_text)

    # 4. Prompt for new photo
    elif data.startswith("prompt_photo:"):
        lang = data.split(":", 1)[1] if ":" in data else prefs.get_lang(user_id)
        await query.message.reply_html(get_text("send_photo_prompt", lang=lang))

    # 5. Confirm or cancel a voice/text listing draft
    elif data.startswith("listconfirm:") or data.startswith("listcancel:"):
        action, draft_id = data.split(":", 1)
        lang = prefs.get_lang(user_id)
        await query.edit_message_reply_markup(reply_markup=None)
        if action == "listcancel":
            listing_service.drafts.pop(draft_id, None)
            await query.message.reply_html(listing_text("cancelled", lang))
        elif not contacts.get(user_id):
            context.user_data["pending_listing"] = draft_id
            await query.message.reply_html(
                listing_text("share_phone", lang), reply_markup=ListingService.phone_keyboard(lang)
            )
        else:
            await publish_draft(query.message, draft_id, update.effective_user, lang)


# ── Application Factory ───────────────────────────────────────────────────────
def create_application(token: Optional[str] = None) -> Application:
    """Build and configure the Telegram application."""
    bot_token = token or TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise ValueError(
            "TELEGRAM_BOT_TOKEN is not configured! "
            "Please set TELEGRAM_BOT_TOKEN in .env or pass it as an argument."
        )

    app = ApplicationBuilder().token(bot_token).post_init(post_init).build()

    # Commands
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("price", price_command))
    app.add_handler(CommandHandler("ecx", price_command))
    app.add_handler(CommandHandler("language", language_command))
    app.add_handler(CommandHandler("about", about_command))

    # Media handlers
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.IMAGE, handle_photo))
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice))
    app.add_handler(MessageHandler(filters.CONTACT, handle_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, fallback_text_handler))
    app.add_handler(MessageHandler(filters.COMMAND, unknown_command_handler))

    # Callbacks
    app.add_handler(CallbackQueryHandler(handle_callback_query))
    app.add_error_handler(error_handler)

    return app


def run_bot() -> None:
    """Run BunaJimma bot with polling."""
    print("=" * 60)
    print("☕ Starting BunaJimma (ቡና ጅማ) Telegram Bot...")
    print("📱 Welcome page available via /start")
    print("=" * 60)

    try:
        app = create_application()
        print("✓ BunaJimma Bot is online and listening for messages!")
        app.run_polling(drop_pending_updates=True)
    except ValueError as e:
        logger.error(str(e))
        print(f"\n❌ Error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    sys.exit("Start the bot with: python run_bot.py")
