#!/usr/bin/env python3
"""
Root entry point for BunaJimma Bot.
Forwards execution to buna-fair-price/run_bot.py.
"""
import sys
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent / "buna-fair-price"
sys.path.insert(0, str(REPO_DIR))
sys.path.insert(0, str(REPO_DIR / "grader"))

if __name__ == "__main__":
    from run_bot import main
    main()
