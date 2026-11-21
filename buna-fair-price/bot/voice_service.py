"""
Voice Service Module for BunaJimma Bot.

Designed for future multi-lingual speech integration:
- Afaan Oromoo (Speech-to-Text & Text-to-Speech)
- Amharic (Speech-to-Text & Text-to-Speech)

Provides extensible hooks for:
- Whisper / Faster-Whisper / Gemini Audio STT
- Coqui / ElevenLabs / Google Cloud TTS or local Ethiopian phonetic models
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from bot.locales import get_text

logger = logging.getLogger("bunajimma.voice")


@dataclass
class VoiceTranscriptionResult:
    """Represents a speech transcription output."""
    text: str
    detected_language: str  # 'om', 'am', 'en'
    confidence: float
    is_supported: bool


class VoiceService:
    """
    Extensible Voice Processing Service for BunaJimma.
    
    Current phase:
    - Captures and acknowledges voice notes in Afaan Oromoo, Amharic, or English.
    
    Next phase:
    - Transcribes spoken queries (e.g., 'Gatiin buna dhiqamaa G2 meeqa?' / 'የደረጃ 2 ዋጋ ስንት ነው?')
    - Synthesizes audio grading reports back to farmers who prefer audio over text.
    """

    def __init__(self) -> None:
        self.stt_enabled = False
        self.tts_enabled = False
        logger.info("VoiceService initialized (awaiting voice integration phase).")

    async def handle_voice_message(self, user_lang: str = "om") -> str:
        """
        Produce a friendly voice acknowledgement in the user's preferred language.
        """
        return get_text("voice_ack", lang=user_lang)

    async def transcribe(self, voice_bytes: bytes, lang_hint: Optional[str] = None) -> VoiceTranscriptionResult:
        """
        Placeholder hook for speech-to-text models (Whisper / Gemini Audio).
        """
        # When voice model is integrated, audio bytes will be converted to text here
        return VoiceTranscriptionResult(
            text="",
            detected_language=lang_hint or "om",
            confidence=0.0,
            is_supported=False,
        )

    async def synthesize(self, text: str, lang: str = "om") -> Optional[bytes]:
        """
        Placeholder hook for text-to-speech generation in Afaan Oromoo or Amharic.
        """
        # When TTS engine is connected, returns generated audio bytes (OGG / MP3)
        return None
