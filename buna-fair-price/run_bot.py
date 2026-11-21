#!/usr/bin/env python3
"""
BunaJimma — AI Coffee Bean Grader Telegram Bot Launcher
Usage:
    python run_bot.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Setup paths
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "grader"))

from bot.config import (
    TELEGRAM_BOT_TOKEN,
    GEMINI_API_KEY,
    OPENROUTER_API_KEY,
    BASE_DIR,
)
from bot.main import run_bot


def preflight_check() -> bool:
    print("\n" + "=" * 62)
    print(" ☕  BUNA JIMMA (ቡና ጅማ) — AI COFFEE BEAN GRADER TELEGRAM BOT")
    print("=" * 62)

    has_error = False

    # Check Vision API Keys
    if not GEMINI_API_KEY and not OPENROUTER_API_KEY:
        print("\n⚠️  [WARNING] No Vision API key found (GEMINI_API_KEY or OPENROUTER_API_KEY).")
        print("   The bot will use ECX fallback grading until an API key is configured.")
    else:
        provider = "Gemini" if GEMINI_API_KEY else "OpenRouter"
        print(f"  ✓ Vision AI Provider: {provider}")

    # Check Telegram Bot Token
    if not TELEGRAM_BOT_TOKEN:
        print("\n❌ [ERROR] TELEGRAM_BOT_TOKEN is not configured!")
        print("   To get a Telegram bot token:")
        print("   1. Open Telegram and search for @BotFather")
        print("   2. Send /newbot and follow instructions to create 'BunaJimmaBot'")
        print("   3. Copy the HTTP API token provided by BotFather")
        print("   4. Add it to your .env file in buna-fair-price/.env:")
        print("      TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here\n")
        has_error = True
    else:
        masked_token = (
            TELEGRAM_BOT_TOKEN[:6] + "..." + TELEGRAM_BOT_TOKEN[-4:]
            if len(TELEGRAM_BOT_TOKEN) > 10
            else "***"
        )
        print(f"  ✓ Telegram Bot Token: {masked_token}")

    print("=" * 62 + "\n")
    return not has_error


def main() -> None:
    if not preflight_check():
        sys.exit(1)
    run_bot()


if __name__ == "__main__":
    main()
