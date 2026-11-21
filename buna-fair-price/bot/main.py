"""
BunaJimma — AI Coffee Bean Quality Grader Telegram Bot
Main Bot Application
"""

from __future__ import annotations

import asyncio
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
from bot.voice_service import VoiceService

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
async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Handle incoming voice notes / audio.
    Acknowledges the farmer's voice input and prepares for the upcoming voice integration.
    """
    message = update.message
    if not message:
        return

    user_id = update.effective_user.id if update.effective_user else 0
    lang = prefs.get_lang(user_id)

    ack_text = await voice_service.handle_voice_message(user_lang=lang)
    await message.reply_html(ack_text)


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
    run_bot()
