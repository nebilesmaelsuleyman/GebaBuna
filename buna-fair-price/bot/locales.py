"""
Localization strings for BunaJimma Telegram Bot.
Supported Languages:
- 'om': Afaan Oromoo (Jimma / Oromia regional language)
- 'am': አማርኛ (Amharic - Ethiopia federal working language)
- 'en': English
"""

from __future__ import annotations

LANGUAGES = {
    "om": "🌳 Afaan Oromoo",
    "am": "🇪🇹 አማርኛ",
    "en": "🇬🇧 English",
}

TEXTS = {
    "om": {
        "bot_title": "☕ BunaJimma (ቡና ጅማ) — Qorannoo Qulqullina Bunaa",
        "welcome": (
            "👋 <b>Baga nagaan dhuftan gara BunaJimma!</b>\n\n"
            "BunaJimma tajaajila teeknoolojii AI fayyadamuun qulqullina buna keessanii "
            "sadarkaa ECX (Washed G1-G5 / Natural G1-G5) tiin qoratee gatii madaalawaa "
            "gabaa beekuuf qonnaan bultoota gargaarudha.\n\n"
            "📸 <b>Akkamitti fayyadamtu?</b>\n"
            "1. Suuraa ija buna keessanii ifa gaariin qulqullinaan kaasaa.\n"
            "2. Asitti bot kanaaf ergaa.\n"
            "3. Sekondii muraasa keessatti sadarkaa, hanqina, gatii ECX fi gorsa qulqullinaa argadhaa!\n\n"
            "Mee jalqabuuf afaan filadhaa yookaan suuraa bunaa nuuf ergaa:"
        ),
        "help_text": (
            "📖 <b>Qajeelfama Fayyadama BunaJimma:</b>\n\n"
            "📸 <b>Suuraa Qulqulluu Kaasuuf:</b>\n"
            "• Ija bunaa waraqaa adii ykn meeshaa qulqulluu irratti babal'isaa.\n"
            "• Ifa aduu gaarii qabaachuu mirkaneeffadhaa (gaaddisa dhowwaa).\n"
            "• Suuraan akka hin sochooneefi iji bunaa ifatti akka mul'atu godhaa.\n\n"
            "🏷️ <b>Sadarkaa ECX (Itoophiyaa):</b>\n"
            "• <b>Dhiqamaa (Washed):</b> G1 hanga G5 (G1-G2 qulqullina al-ergee olaanaa)\n"
            "• <b>Jenfel / Hin dhiqamne (Natural):</b> G1 hanga G5\n\n"
            "💰 <b>Gatii Madaalawaa:</b>\n"
            "Gatiin asitti argamu gatii madaallii ECX irratti hundaa'a (ETB/kg).\n\n"
            "⚙️ <b>Ajajoota (Commands):</b>\n"
            "/start - Jalqabi / Afaan filadhu\n"
            "/price - Gatii gabaa ECX ammaa ilaali\n"
            "/language - Afaan jijjiiri\n"
            "/help - Qajeelfama dabalataa\n"
            "/about - Waa'ee BunaJimma"
        ),
        "analyzing": "🔍 <b>Suuraan buna keessanii qoratamaa jira...</b>\nMee sekondii muraasa eegaa.",
        "analysis_timeout": "⏳ Qorannoon AI yeroo dheeraaf fudhate; yeroo ammaa tilmaama bu'uuraa agarsiisaa jirra.",
        "about": (
            "☕ <b>Waa'ee BunaJimma:</b>\n\n"
            "BunaJimma qonnaan bultoota buna Jimmaa fi Itoophiyaa hundaaf "
            "teeknoolojii AI ammayyaa dhiyeessuun gatii haqa qabeessa akka argatan "
            "tattaafata.\n\n"
            "Qulqullina ija bunaa, hanqina (defects), bifa, fi sadarkaa ECX adda baasa."
        ),
        "price_header": "📊 <b>Gatii Madaallii ECX Ammaa (ETB/kg)</b>\n\n",
        "price_footer": (
            "\n💡 <i>Hubachiisa: Gatiin kun tilmaama madaallii ECX irratti hundaa'a. "
            "Gabaa naannoo irratti garaagarummaa qabaachuu danda'a.</i>"
        ),
        "lang_changed": "✅ Afaan gara <b>Afaan Oromoo</b>tti jijjiirameera.",
        "send_photo_prompt": "📸 Mee suuraa buna keessanii as ergaa!",
        "unsupported_input": (
            "ℹ️ Ergaa barreeffamaa hubadheera, garuu qorannoon AI suuraa irratti hojjeta.\n"
            "📸 Mee suuraa ija bunaa ergaa yookaan /help ilaalaa."
        ),
        "unknown_command": "❓ Ajajni sun hin beekamu. /start yookaan /help irraa jalqabi.",
        "invalid_image": "⚠️ Maaloo suuraa qulqulluu ija bunaa qofa ergaa.",
        "not_coffee_image": "⚠️ <b>Suuraan kun bunaa miti.</b>\nMaaloo suuraa ija bunaa qofa ergaa, namoota, nyaata, fuduraa, ykn waan biraa hin taane.",
        "grading_error": "❌ Qorannoon suuraa hin milkoofne. Mee irra deebi'aa yaalaa.",
        "fallback_warning": "⚠️ <i>Hubachiisa: AI yeroof qunnamtii dhabe; gatii fi sadarkaan kun tilmaama giddu-galeessaati.</i>",
        "btn_prices": "💰 Gatii ECX Ilaali",
        "btn_tips": "💡 Gorsa Qulqullinaa",
        "btn_new_photo": "📸 Suuraa Biraa Qori",
        "btn_change_lang": "🌐 Afaan Jijjiiri",
        "metric_grade": "🏷️ Sadarkaa (Grade):",
        "metric_process": "🌱 Akaakuu Qophii:",
        "metric_defects": "⚠️ Hanqina (Defects):",
        "metric_color": "🎨 Bifa:",
        "metric_uniformity": "📐 Wal-gibhinsa:",
        "metric_moisture": "💧 Jiidhinsa:",
        "metric_confidence": "🎯 Amanamummaa:",
        "metric_price": "💰 Gatii Madaalawaa (ETB/kg):",
        "label_summary": "📋 Cuunfaa Qorannoo:",
        "label_sorting_advice": "🔧 Gorsa Qulqulleessuu:",
        "label_tips": "💡 Gorsa Qonnaan Bulaaf:",
        "voice_ack": (
            "🎙️ <b>Sagaleen keessan nu gaheera!</b>\n\n"
            "Dhaggeeffachaa jirra... Gatii buna keessanii yeroo muraasa keessatti isinii himna."
        ),
        "color_names": {
            "dark green": "Magariisa Dukkanaa'aa (Baay'ee Gaarii)",
            "light green": "Magariisa Ifaa (Gaarii)",
            "yellowish": "Keelloo (Giddu-galeessa)",
            "brown": "Magaala (Gadi-aanaa)",
        },
        "moisture_names": {
            "normal": "Mijataa / Gaarii",
            "over-dried": "Garmalee Gogee",
            "wet": "Jiidha Qaba",
            "unknown": "Hin beekamne",
        },
        "confidence_names": {
            "high": "Olaanaa",
            "medium": "Giddu-galeessa",
            "low": "Gadi-aanaa",
        },
        "processing_names": {
            "Washed": "Dhiqamaa (Washed)",
            "Natural": "Jenfel / Hin dhiqamne (Natural)",
        },
    },
    "am": {
        "bot_title": "☕ ቡና ጅማ (BunaJimma) — የቡና ጥራት መለያ ቦት",
        "welcome": (
            "👋 <b>እንኳን ወደ ቡና ጅማ (BunaJimma) በደህና መጡ!</b>\n\n"
            "ቡና ጅማ ዘመናዊ የሰው ሰራሽ አስተውሎት (AI) በመጠቀም የቡና ፍሬዎን ምስል "
            "በመተንተን በኢትዮጵያ ምርት ገበያ (ECX) መስፈርት መሰረት ደረጃውንና ተመጣጣኝ "
            "የገበያ ዋጋውን ለአርሶ አደሮች የሚያሳውቅ አገልግሎት ነው።\n\n"
            "📸 <b>እንዴት መጠቀም ይቻላል?</b>\n"
            "1. የቡና ፍሬዎን በጥሩ ብርሃን ግልጽ ፎቶ ያንሱ።\n"
            "2. ፎቶውን እዚህ ቦት ላይ ይላኩ።\n"
            "3. በሰከንዶች ውስጥ የቡናዎን ደረጃ፣ ጉድለት መጠን፣ የኢሲኤክስ ዋጋ እና የጥራት ማሻሻያ ምክሮችን ያግኙ!\n\n"
            "እባክዎ ቋንቋ ይምረጡ ወይም የቡና ፎቶ ይላኩልን:"
        ),
        "help_text": (
            "📖 <b>የቡና ጅማ አጠቃቀም መመሪያ:</b>\n\n"
            "📸 <b>ጥሩ ፎቶ ለማንሳት:</b>\n"
            "• የቡና ፍሬዎችን በነጭ ወረቀት ወይም ንጹህ ሰሃን ላይ በእኩል ያሰራጩ።\n"
            "• ጥሩ የተፈጥሮ ብርሃን መኖሩን ያረጋግጡ (ጥላን ያስወግዱ)።\n"
            "• ካሜራው ሳይንቀጠቀጥ ፍሬዎቹ በግልጽ እንዲታዩ ያድርጉ።\n\n"
            "🏷️ <b>የኢትዮጵያ ምርት ገበያ (ECX) ደረጃዎች:</b>\n"
            "• <b>የታጠበ (Washed):</b> ከደረጃ 1 እስከ ደረጃ 5 (G1-G2 ከፍተኛ የኤክስፖርት ጥራት)\n"
            "• <b>ያልታጠበ/ጀንፈል (Natural):</b> ከደረጃ 1 እስከ ደረጃ 5\n\n"
            "💰 <b>ተመጣጣኝ ዋጋ:</b>\n"
            "እዚህ የሚታየው ዋጋ በወቅታዊ የECX ማጣቀሻ ዋጋ (በኪሎ ብር) ላይ የተመሰረተ ነው።\n\n"
            "⚙️ <b>ትእዛዞች (Commands):</b>\n"
            "/start - መጀመሪያ / ቋንቋ መምረጫ\n"
            "/price - የወቅቱ የECX የቡና ዋጋ ዝርዝር\n"
            "/language - ቋንቋ መቀየሪያ\n"
            "/help - ተጨማሪ መመሪያ\n"
            "/about - ስለ ቡና ጅማ"
        ),
        "analyzing": "🔍 <b>የቡና ፍሬዎ ምስል እየተተነተነ ነው...</b>\nእባክዎ ጥቂት ሰከንዶች ይጠብቁ።",
        "analysis_timeout": "⏳ የAI ትንተናው ብዙ ጊዜ ወስዷል፤ ለአሁኑ መሠረታዊ ግምት እናሳያለን።",
        "about": (
            "☕ <b>ስለ ቡና ጅማ (BunaJimma):</b>\n\n"
            "ቡና ጅማ ለጅማ እና ለመላው የኢትዮጵያ ቡና አብቃይ አርሶ አደሮች ዘመናዊ የAI ቴክኖሎጂን "
            "ተደራሽ በማድረግ ለድካማቸው ተገቢውንና ፍትሃዊውን የገበያ ዋጋ እንዲያገኙ ለመርዳት "
            "የተዘጋጀ ነው።\n\n"
            "የፍሬውን ጥራት፣ ጉድለት፣ ቀለም እና የECX ደረጃ በጥንቃቄ ይለያል።"
        ),
        "price_header": "📊 <b>የወቅቱ የኢሲኤክስ (ECX) ማጣቀሻ ዋጋ (በኪሎ ብር)</b>\n\n",
        "price_footer": (
            "\n💡 <i>ማስታወሻ: ይህ ዋጋ በECX ማጣቀሻ ላይ የተመሰረተ ግምት ነው። "
            "በየአካባቢው ገበያ ሁኔታ ሊለያይ ይችላል።</i>"
        ),
        "lang_changed": "✅ ቋንቋ ወደ <b>አማርኛ</b> ተቀይሯል።",
        "send_photo_prompt": "📸 እባክዎ የቡናዎን ፎቶ እዚህ ይላኩ!",
        "unsupported_input": (
            "ℹ️ የጽሑፍ መልዕክትዎን ተቀብያለሁ፣ ነገር ግን የAI ትንተና በፎቶ ላይ ይሰራል።\n"
            "📸 እባክዎ የቡና ፎቶ ይላኩ ወይም /help ይጠቀሙ።"
        ),
        "unknown_command": "❓ ይህ ትእዛዝ አይታወቅም። ከ /start ወይም /help ይጀምሩ።",
        "invalid_image": "⚠️ እባክዎ ትክክለኛ እና ግልጽ የቡና ፍሬ ምስል ይላኩ።",
        "not_coffee_image": "⚠️ <b>ይህ የቡና ፍሬ ምስል አይደለም።</b>\nእባክዎ የቡና ፍሬ ፎቶ ብቻ ይላኩ፣ እንደ ሰው፣ ምግብ፣ ፍሬ ወይም ሌላ ነገር አይደለም።",
        "grading_error": "❌ ምስሉን መተንተን አልተቻለም። እባክዎ በድጋሚ ይሞክሩ።",
        "fallback_warning": "⚠️ <i>ማስታወሻ: የAI ግንኙነት ስለተቋረጠ የቀረበው ደረጃ አማካይ ግምት ነው።</i>",
        "btn_prices": "💰 የECX ዋጋ ዝርዝር",
        "btn_tips": "💡 የጥራት ምክሮች",
        "btn_new_photo": "📸 ሌላ ፎቶ መርምር",
        "btn_change_lang": "🌐 ቋንቋ ቀይር",
        "metric_grade": "🏷️ ደረጃ (Grade):",
        "metric_process": "🌱 የአዘገጃጀት አይነት:",
        "metric_defects": "⚠️ ጉድለት (Defects):",
        "metric_color": "🎨 ቀለም:",
        "metric_uniformity": "📐 ተመጣጣኝነት:",
        "metric_moisture": "💧 እርጥበት:",
        "metric_confidence": "🎯 እርግጠኝነት:",
        "metric_price": "💰 ተመጣጣኝ ዋጋ (በኪሎ ብር):",
        "label_summary": "📋 የትንተና ማጠቃለያ:",
        "label_sorting_advice": "🔧 የመለያያ ምክር:",
        "label_tips": "💡 ለአርሶ አደሩ የሚመከሩ:",
        "voice_ack": (
            "🎙️ <b>የድምጽ መልዕክትዎ ደርሶናል!</b>\n\n"
            "እያዳመጥን ነው... የቡናዎን ዋጋ በቅርቡ እንነግርዎታለን።"
        ),
        "color_names": {
            "dark green": "ጥቁር አረንጓዴ (በጣም ጥሩ)",
            "light green": "ፈዛዛ አረንጓዴ (ጥሩ)",
            "yellowish": "ቢጫማ (መካከለኛ)",
            "brown": "ቡናማ (ዝቅተኛ)",
        },
        "moisture_names": {
            "normal": "መደበኛ / ጥሩ",
            "over-dried": "ከልክ በላይ የደረቀ",
            "wet": "እርጥብ",
            "unknown": "ያልታወቀ",
        },
        "confidence_names": {
            "high": "ከፍተኛ",
            "medium": "መካከለኛ",
            "low": "ዝቅተኛ",
        },
        "processing_names": {
            "Washed": "የታጠበ (Washed)",
            "Natural": "ያልታጠበ / ጀንፈል (Natural)",
        },
    },
    "en": {
        "bot_title": "☕ BunaJimma — AI Coffee Bean Quality Grader",
        "welcome": (
            "👋 <b>Welcome to BunaJimma!</b>\n\n"
            "BunaJimma empowers coffee farmers in Jimma and across Ethiopia with "
            "AI-driven coffee bean grading (ECX Washed G1-G5 / Natural G1-G5) and "
            "fair market price estimation.\n\n"
            "📸 <b>How it works:</b>\n"
            "1. Take a clear, well-lit photo of your coffee beans spread evenly.\n"
            "2. Send the photo to this bot.\n"
            "3. Receive ECX grade, defect percentage, fair price range, and actionable sorting tips in seconds!\n\n"
            "Choose your preferred language or send a photo to begin:"
        ),
        "help_text": (
            "📖 <b>BunaJimma Farmer's Guide:</b>\n\n"
            "📸 <b>Taking Great Photos:</b>\n"
            "• Spread beans on a clean white surface or flat tray.\n"
            "• Ensure good natural daylight (avoid harsh shadows or flash glare).\n"
            "• Keep the camera steady and focus sharply on the beans.\n\n"
            "🏷️ <b>ECX Grading Standards:</b>\n"
            "• <b>Washed (Wet processed):</b> Grades 1 to 5 (G1-G2: Specialty export grade)\n"
            "• <b>Natural (Dry processed):</b> Grades 1 to 5\n\n"
            "💰 <b>Fair Pricing:</b>\n"
            "Prices shown reflect recent ECX reference benchmarks in ETB per kilogram.\n\n"
            "⚙️ <b>Commands:</b>\n"
            "/start - Start & language selection\n"
            "/price - Current ECX coffee benchmark prices\n"
            "/language - Switch preferred language\n"
            "/help - Help & photo tips\n"
            "/about - About BunaJimma"
        ),
        "analyzing": "🔍 <b>Analyzing your coffee beans...</b>\nPlease wait a few seconds.",
        "analysis_timeout": "⏳ AI analysis is taking too long; showing a safe fallback estimate for now.",
        "about": (
            "☕ <b>About BunaJimma:</b>\n\n"
            "BunaJimma is dedicated to empowering Ethiopian coffee farmers with "
            "transparent AI grading. By analyzing defects, color, and uniformity, "
            "it helps farmers negotiate fair market prices for their harvest."
        ),
        "price_header": "📊 <b>Current ECX Benchmark Prices (ETB/kg)</b>\n\n",
        "price_footer": (
            "\n💡 <i>Note: Reference prices are indicative benchmarks from ECX. "
            "Local farm-gate prices may vary by washing station and region.</i>"
        ),
        "lang_changed": "✅ Language changed to <b>English</b>.",
        "send_photo_prompt": "📸 Please send a clear photo of your coffee beans!",
        "unsupported_input": (
            "ℹ️ I received your text, but AI grading works on coffee-bean photos.\n"
            "📸 Please send a coffee image or use /help."
        ),
        "unknown_command": "❓ Unknown command. Please use /start or /help.",
        "invalid_image": "⚠️ Please send a valid, clear image of coffee beans.",
        "grading_error": "❌ Could not analyze the image. Please try again with a clearer photo.",
        "fallback_warning": "⚠️ <i>Note: AI grading is temporarily unavailable; showing standard median grade.</i>",
        "btn_prices": "💰 ECX Price List",
        "btn_tips": "💡 Sorting Tips",
        "btn_new_photo": "📸 Grade Another Sample",
        "btn_change_lang": "🌐 Change Language",
        "metric_grade": "🏷️ Grade Tier:",
        "metric_process": "🌱 Process:",
        "metric_defects": "⚠️ Defect %:",
        "metric_color": "🎨 Color:",
        "metric_uniformity": "📐 Uniformity:",
        "metric_moisture": "💧 Moisture:",
        "metric_confidence": "🎯 Confidence:",
        "metric_price": "💰 Fair Price (ETB/kg):",
        "label_summary": "📋 Summary:",
        "label_sorting_advice": "🔧 Sorting Advice:",
        "label_tips": "💡 Farmer Tips:",
        "voice_ack": (
            "🎙️ <b>Voice message received!</b>\n\n"
            "Listening... Ask about prices or say how much coffee you want to sell."
        ),
        "color_names": {
            "dark green": "Dark Green (Excellent)",
            "light green": "Light Green (Good)",
            "yellowish": "Yellowish (Fair)",
            "brown": "Brown (Poor)",
        },
        "moisture_names": {
            "normal": "Normal / Good",
            "over-dried": "Over-dried",
            "wet": "High Moisture / Wet",
            "unknown": "Unknown",
        },
        "confidence_names": {
            "high": "High",
            "medium": "Medium",
            "low": "Low",
        },
        "processing_names": {
            "Washed": "Washed",
            "Natural": "Natural",
        },
        "not_coffee_image": "⚠️ <b>Only coffee bean photos are accepted.</b>\nPlease upload a clear image of coffee beans, not a person, food, fruit, or other object.",
    },
}


def get_text(key: str, lang: str = "om") -> str:
    """Retrieve localized text with fallback to English."""
    lang_dict = TEXTS.get(lang, TEXTS["om"])
    val = lang_dict.get(key)
    if val is None:
        val = TEXTS["en"].get(key, f"[{key}]")
    return val
