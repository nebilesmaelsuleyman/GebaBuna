#!/usr/bin/env bash
# ── Buna Fair Price — Grader Quick Setup ────────────────────────────────────
# Run this once: bash setup.sh

set -e

echo ""
echo "🫘  Buna Fair Price — Grader Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Create virtual environment
if [ ! -d "venv" ]; then
    echo "→ Creating virtual environment..."
    python3 -m venv venv
fi

# 2. Activate and install
echo "→ Installing dependencies..."
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# 3. Check .env
if grep -q "your_api_key_here" .env 2>/dev/null; then
    echo ""
    echo "⚠️  ACTION REQUIRED:"
    echo "   Open grader/.env and replace 'your_api_key_here' with your key."
    echo "   Get a free key at: https://aistudio.google.com/app/apikey"
    echo ""
else
    echo "✅ .env looks configured"
fi

echo ""
echo "✅ Setup complete! Next steps:"
echo ""
echo "   source venv/bin/activate"
echo ""
echo "   # Run unit tests (no API key needed):"
echo "   python test_grader.py"
echo ""
echo "   # Grade your own image:"
echo "   python grader.py --image path/to/your/beans.jpg"
echo ""
echo "   # Quick demo (uses Wikipedia coffee image):"
echo "   python grader.py --demo"
echo ""
