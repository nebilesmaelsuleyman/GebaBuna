"""
Configuration module for BunaJimma Telegram Bot.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Search and load .env from multiple potential locations
BASE_DIR = Path(__file__).resolve().parent.parent
SEARCH_PATHS = [
    Path.cwd() / ".env",
    BASE_DIR / ".env",
    BASE_DIR / "grader" / ".env",
]

for p in SEARCH_PATHS:
    if p.exists():
        load_dotenv(dotenv_path=p, override=False)

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("bunajimma.bot")


def env_value(*names: str, default: str = "") -> str:
    """Read the first non-empty environment variable from the list."""
    for name in names:
        val = os.getenv(name)
        if val is not None:
            stripped = val.strip()
            if stripped:
                return stripped
    return default


# Telegram Bot Token
TELEGRAM_BOT_TOKEN = env_value("TELEGRAM_BOT_TOKEN", "BOT_TOKEN", "BUNAJIMMA_BOT_TOKEN")

# AI Vision API Keys (Primary: Gemini, Fallback: OpenRouter)
GEMINI_API_KEY = env_value("GEMINI_API_KEY", "GOOGLE_API_KEY")
OPENROUTER_API_KEY = env_value("OPENROUTER_API_KEY", "OpenRouter_API_KEY")
OPENROUTER_MODEL = env_value("OPENROUTER_MODEL", default="openrouter/free")

# Defaults
DEFAULT_LANGUAGE = env_value("DEFAULT_LANGUAGE", default="om")  # Default to Afaan Oromoo for Jimma region
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True, parents=True)
