# ☕ BunaJimma (ቡና ጅማ) — AI Coffee Bean Grader Telegram Bot

**BunaJimma** is an AI-powered Telegram bot built to empower Ethiopian coffee farmers—starting with the renowned coffee-growing region of Jimma—with instant, transparent, and fair coffee bean quality grading and ECX (Ethiopian Commodity Exchange) market price benchmarks.

---

## 🌟 Key Features

1. **Multimodal AI Coffee Bean Grading**:
   - Analyzes photos of coffee beans directly from Telegram.
   - Evaluates:
     - **ECX Grade Tier**: Washed (G1–G5) & Natural (G1–G5).
     - **Defect Percentage**: Black beans, broken beans, insect damage, foreign matter.
     - **Color Quality**: Dark green, light green, yellowish, brown.
     - **Uniformity Score** (1–10).
     - **Moisture Level**: Normal, over-dried, high moisture.
     - **Confidence Score**: High, medium, low.
   - Computes estimated **fair market price range in ETB/kg** based on current ECX benchmarks.

2. **Multilingual Support for Ethiopian Farmers**:
   - 🌳 **Afaan Oromoo** (default for Jimma/Oromia)
   - 🇪🇹 **አማርኛ (Amharic)**
   - 🇬🇧 **English**
   - Instant language switching via `/language` or one-click inline buttons.
   - Bilingual actionable farming and sorting advice tailored to the specific defects detected.

3. **ECX Reference Price Explorer**:
   - `/price` or `/ecx` displays benchmark prices for Washed and Natural coffee grades (G1–G5).

4. **Extensible Voice Integration Architecture**:
   - Modular `VoiceService` ready to plug into Whisper, Gemini Multimodal Audio, and local Ethiopian speech models for Afaan Oromoo and Amharic voice conversations.
   - Voice notes sent by farmers are acknowledged in their preferred language while directing them smoothly.

---

## 📁 Project Structure

```text
buna-fair-price/
├── bot/
│   ├── __init__.py
│   ├── config.py           # Environment variables & paths
│   ├── formatter.py        # Telegram HTML result formatting & inline keyboards
│   ├── locales.py          # Afaan Oromoo, Amharic & English translations
│   ├── main.py             # Telegram bot application & handlers
│   └── voice_service.py    # Voice STT/TTS modular architecture
├── grader/
│   ├── grader.py           # Core AI vision grading engine (Gemini & OpenRouter)
│   ├── requirements.txt    # Grader dependencies
│   └── .env                # API keys
├── tests/
│   └── test_bot.py         # Unit tests for bot, locales, voice & formatter
├── run_bot.py              # CLI launcher with preflight checks
└── requirements.txt        # Full dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites & Installation

Activate the virtual environment:

```bash
cd /home/nebil/Desktop/cursor/buna-fair-price
source grader/venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Edit `buna-fair-price/grader/.env` (or create `buna-fair-price/.env`):

```dotenv
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# AI Vision Keys (Gemini primary, OpenRouter fallback)
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
```

#### How to get a Telegram Bot Token:
1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Choose a name (e.g. `BunaJimma`) and username (e.g. `BunaJimmaBot` or `BunaJimma_Coffee_Bot`).
4. Copy the HTTP API token provided by BotFather and paste it into `.env`.

### 3. Run the Bot

```bash
python run_bot.py
```

---

## 🤖 Available Bot Commands

| Command | Description |
| :--- | :--- |
| `/start` | Welcome message, language selection & instructions |
| `/help` | Detailed guide on photographing coffee beans & ECX grades |
| `/price` / `/ecx` | View ECX reference prices (ETB/kg) for Washed & Natural |
| `/language` | Switch between Afaan Oromoo, Amharic, and English |
| `/about` | Information about BunaJimma mission |

---

## 🧪 Running Unit Tests

Run the comprehensive test suite:

```bash
python -m unittest tests/test_bot.py
```
