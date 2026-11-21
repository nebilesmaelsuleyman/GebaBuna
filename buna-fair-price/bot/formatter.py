"""
Formatting module for BunaJimma Bot Telegram messages.
Provides rich HTML-formatted results, badges, and inline keyboards.
"""

from __future__ import annotations

import html
from typing import TYPE_CHECKING

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from bot.locales import get_text, TEXTS, LANGUAGES

if TYPE_CHECKING:
    from grader import GradeResult


def format_grade_badge(grade_number: int, grade_tier: str) -> str:
    """Return an emoji indicator based on grade quality."""
    if grade_number <= 2:
        return f"🟢 <b>{html.escape(grade_tier)}</b> <i>(Premium / Specialty)</i>"
    elif grade_number <= 4:
        return f"🟡 <b>{html.escape(grade_tier)}</b> <i>(Commercial Export)</i>"
    else:
        return f"🔴 <b>{html.escape(grade_tier)}</b> <i>(Local / Lower Commercial)</i>"


def format_grade_result(result: GradeResult, lang: str = "om") -> str:
    """Format a GradeResult into a comprehensive, farmer-friendly Telegram HTML message."""
    t = TEXTS.get(lang, TEXTS["om"])
    
    badge = format_grade_badge(result.grade_number, result.grade_tier)
    
    # Translated attributes
    color_desc = t.get("color_names", {}).get(
        result.color_quality.lower(),
        html.escape(result.color_quality.capitalize())
    )
    moisture_desc = t.get("moisture_names", {}).get(
        result.moisture_level.lower(),
        html.escape(result.moisture_level.capitalize())
    )
    confidence_desc = t.get("confidence_names", {}).get(
        result.confidence.lower(),
        html.escape(result.confidence.capitalize())
    )
    processing_desc = t.get("processing_names", {}).get(
        result.processing_type,
        html.escape(result.processing_type)
    )

    lines = [
        f"☕ <b>{t['bot_title']}</b>",
        "━━━━━━━━━━━━━━━━━━━━",
        f"{t['metric_grade']} {badge}",
        f"{t['metric_process']} <b>{processing_desc}</b>",
    ]

    # Price range
    if result.estimated_price_min_etb and result.estimated_price_max_etb:
        currency = "ETB" if lang != "am" else "ብር"
        lines.append(
            f"{t['metric_price']} <b>{result.estimated_price_min_etb} – {result.estimated_price_max_etb} {currency}/kg</b>"
        )

    # Detailed metrics
    lines.extend([
        "",
        "📊 <b>Qulqullina / ዝርዝር ሁኔታ / Metrics:</b>" if lang == "om" else "📊 <b>ዝርዝር መረጃዎች:</b>",
        f"  • {t['metric_defects']} <b>{result.defect_percentage}%</b>",
        f"  • {t['metric_color']} {color_desc}",
        f"  • {t['metric_uniformity']} <b>{result.uniformity_score}/10</b>",
        f"  • {t['metric_moisture']} {moisture_desc}",
        f"  • {t['metric_confidence']} {confidence_desc}",
    ])

    if result.is_fallback:
        lines.extend(["", t["fallback_warning"]])

    # Language-specific tips
    lines.extend(["", f"<b>{t['label_tips']}</b>"])
    if lang == "om" and result.tips_oromo:
        for tip in result.tips_oromo:
            lines.append(f"  ✓ {html.escape(tip)}")
    elif lang == "am" and result.tips_amharic:
        for tip in result.tips_amharic:
            lines.append(f"  ✓ {html.escape(tip)}")
    else:
        # English or fallback
        if result.sorting_advice_english:
            lines.append(f"  ✓ {html.escape(result.sorting_advice_english)}")
        if result.tips_oromo:
            lines.append(f"  • <i>Oromo:</i> {html.escape(result.tips_oromo[0])}")
        if result.tips_amharic:
            lines.append(f"  • <i>Amharic:</i> {html.escape(result.tips_amharic[0])}")

    # English summary
    if result.summary_english:
        lines.extend([
            "",
            f"<b>{t['label_summary']}</b>",
            f"<i>\"{html.escape(result.summary_english)}\"</i>",
        ])

    return "\n".join(lines)


def build_result_keyboard(current_lang: str, cache_id: str) -> InlineKeyboardMarkup:
    """Build interactive buttons for the grade result."""
    t = TEXTS.get(current_lang, TEXTS["om"])
    
    # Alternate language buttons
    lang_buttons = []
    for code, label in LANGUAGES.items():
        if code != current_lang:
            lang_buttons.append(
                InlineKeyboardButton(label, callback_data=f"reslang:{code}:{cache_id}")
            )

    keyboard = [
        lang_buttons,
        [
            InlineKeyboardButton(t["btn_prices"], callback_data=f"ecx_table:{current_lang}"),
            InlineKeyboardButton(t["btn_new_photo"], callback_data=f"prompt_photo:{current_lang}"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def format_ecx_table(ecx_prices: dict[str, dict], lang: str = "om") -> str:
    """Format the ECX reference price table for Telegram."""
    t = TEXTS.get(lang, TEXTS["om"])
    lines = [t["price_header"]]
    
    # Washed
    lines.append("💧 <b>Washed (Dhiqamaa / የታጠበ):</b>")
    for grade, info in ecx_prices.items():
        if grade.startswith("Washed"):
            lines.append(
                f"  • <b>{grade}:</b> {info['min']} – {info['max']} ETB/kg "
                f"<i>({info.get('description', '')})</i>"
            )

    lines.append("")
    # Natural
    lines.append("☀️ <b>Natural (Jenfel / ያልታጠበ):</b>")
    for grade, info in ecx_prices.items():
        if grade.startswith("Natural"):
            lines.append(
                f"  • <b>{grade}:</b> {info['min']} – {info['max']} ETB/kg "
                f"<i>({info.get('description', '')})</i>"
            )

    lines.append(t["price_footer"])
    return "\n".join(lines)


def build_language_keyboard() -> InlineKeyboardMarkup:
    """Build the language selection keyboard."""
    buttons = [
        [InlineKeyboardButton("🌳 Afaan Oromoo", callback_data="setlang:om")],
        [InlineKeyboardButton("🇪🇹 አማርኛ", callback_data="setlang:am")],
        [InlineKeyboardButton("🇬🇧 English", callback_data="setlang:en")],
    ]
    return InlineKeyboardMarkup(buttons)
