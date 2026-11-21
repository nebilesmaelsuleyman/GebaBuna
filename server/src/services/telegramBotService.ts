import { config } from '../config';
import { AddisAiService } from './addisAiService';
import { gradeCoffeeImage, NotCoffeeImageError, CoffeeGradeResult } from './coffeeGraderService';
import { getMarketReferencePrice, evaluatePriceFairness } from './marketPriceService';
import { MarketPrice, CoffeeGrade, ProcessingType } from '../models/MarketPrice';
import { Listing } from '../models/Listing';
import { User } from '../models/User';
import { FarmerProfile } from '../models/FarmerProfile';
import { normalizeEthiopianPhone } from '../routes/auth';

export type Language = 'om' | 'am' | 'en';

export type WorkflowState =
  | 'new_user'
  | 'main_menu'
  | 'awaiting_sell_voice'
  | 'awaiting_sell_confirm'
  | 'awaiting_photo_grading';

interface TelegramUserSession {
  language?: Language;
  phone?: string;
  state: WorkflowState;
  lastGradeResult?: CoffeeGradeResult;
  lastListingDraft?: {
    coffeeType: string;
    processing: ProcessingType;
    grade: CoffeeGrade;
    quantityKg: number;
    askingPricePerKg: number;
    totalEtb: number;
    marketFloor: number;
    isFair: boolean;
  };
}

export class TelegramBotService {
  private static sessions: Map<number, TelegramUserSession> = new Map();
  private static isRunning = false;
  private static abortController: AbortController | null = null;
  private static offset = 0;

  private static getApiUrl(method: string): string {
    return `https://api.telegram.org/bot${config.telegramBotToken}/${method}`;
  }

  private static getSession(userId: number): TelegramUserSession {
    let session = this.sessions.get(userId);
    if (!session) {
      session = { state: 'new_user' };
      this.sessions.set(userId, session);
    }
    return session;
  }

  private static getLang(userId: number): Language {
    return this.getSession(userId).language || 'om';
  }

  /**
   * Start long-polling Telegram Bot daemon
   */
  public static async start(): Promise<void> {
    if (!config.telegramBotToken) {
      console.log('ℹ️ [TelegramBot] TELEGRAM_BOT_TOKEN not configured. Bot polling disabled.');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;
    this.abortController = new AbortController();

    console.log('🤖 [TelegramBot] Starting BunaJimma Telegram Bot Service...');
    await this.registerCommands();
    this.pollUpdates();
  }

  public static stop(): void {
    this.isRunning = false;
    this.abortController?.abort();
    console.log('🛑 [TelegramBot] Bot service stopped.');
  }

  private static async registerCommands(): Promise<void> {
    try {
      const commands = [
        { command: 'start', description: 'Main menu & capabilities / Fuula jalqabaa' },
        { command: 'sell', description: 'Sell coffee via voice / Buna gurguri' },
        { command: 'grade', description: 'AI bean photo grading / Suuraa qori' },
        { command: 'price', description: 'Live ECX price floors / Gatii ECX ammaa' },
        { command: 'listings', description: 'My active coffee lots / Buna koo' },
        { command: 'language', description: 'Switch language / Afaan / ቋንቋ' },
      ];

      await fetch(this.getApiUrl('setMyCommands'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands }),
      });
      console.log('✓ [TelegramBot] Slash commands successfully registered.');
    } catch (err: any) {
      console.warn('⚠️ [TelegramBot] Could not register slash commands:', err.message);
    }
  }

  private static async pollUpdates(): Promise<void> {
    while (this.isRunning) {
      try {
        const url = `${this.getApiUrl('getUpdates')}?offset=${this.offset}&timeout=25&allowed_updates=["message","callback_query"]`;
        const res = await fetch(url, { signal: this.abortController?.signal });
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        const data: any = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            this.handleUpdate(update).catch((e) =>
              console.error('Error handling Telegram update:', e)
            );
          }
        }
      } catch (err: any) {
        if (!this.isRunning) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  /**
   * Central update dispatcher
   */
  public static async handleUpdate(update: any): Promise<void> {
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    const message = update.message;
    if (!message) return;

    const chatId = message.chat.id;
    const userId = message.from?.id || chatId;
    const session = this.getSession(userId);
    const text = message.text?.trim() || '';

    // If new user, always show welcoming and language choice first!
    if (!session.language && !text.startsWith('/set_lang')) {
      await this.sendWelcomeAndLanguageSelection(chatId);
      return;
    }

    // 1. Slash commands
    if (text.startsWith('/')) {
      const cmd = text.split(' ')[0].toLowerCase().split('@')[0];
      switch (cmd) {
        case '/start':
          await this.sendMainMenu(chatId, userId);
          return;
        case '/sell':
          await this.startSellWorkflow(chatId, userId);
          return;
        case '/grade':
          await this.promptPhotoGrading(chatId, userId);
          return;
        case '/price':
        case '/ecx':
          await this.sendPriceTable(chatId, userId);
          return;
        case '/listings':
          await this.sendMyListings(chatId, userId);
          return;
        case '/language':
          await this.sendWelcomeAndLanguageSelection(chatId);
          return;
        default:
          await this.sendMainMenu(chatId, userId);
          return;
      }
    }

    // 2. Persistent bottom reply keyboard button clicks
    const matchedMenuAction = this.matchMenuButton(text);
    if (matchedMenuAction) {
      switch (matchedMenuAction) {
        case 'sell':
          await this.startSellWorkflow(chatId, userId);
          return;
        case 'grade':
          await this.promptPhotoGrading(chatId, userId);
          return;
        case 'price':
          await this.sendPriceTable(chatId, userId);
          return;
        case 'listings':
          await this.sendMyListings(chatId, userId);
          return;
        case 'language':
          await this.sendWelcomeAndLanguageSelection(chatId);
          return;
        case 'web':
          await this.sendWebPortalLink(chatId, userId);
          return;
      }
    }

    // 3. Photo Image Analysis
    if (message.photo && message.photo.length > 0) {
      await this.handlePhotoMessage(message, chatId, userId);
      return;
    }

    // 4. Voice Note / Audio
    if (message.voice || message.audio) {
      await this.handleVoiceMessage(message, chatId, userId);
      return;
    }

    // 5. Contact Shared
    if (message.contact) {
      await this.handleContactShared(message, chatId, userId);
      return;
    }

    // 6. Text message
    await this.handleTextMessage(text, chatId, userId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: WELCOMING & LANGUAGE SELECTION (NO COMMANDS REQUIRED)
  // ─────────────────────────────────────────────────────────────────────────────
  private static async sendWelcomeAndLanguageSelection(chatId: number): Promise<void> {
    const welcomeText = `☕ <b>BUNAJIMMA (ቡና ጅማ) — AI COFFEE AGENT</b>
<i>Direct Jimma Smallholder Coffee Exchange & Quality Protection</i>

👋 <b>Welcome! / Baga nagaan dhuftan! / እንኳን ደህና መጡ!</b>

🌟 <b>What this bot does for you:</b>
• ☕ <b>Sell Coffee by Voice</b>: Speak your quantity & price; get an instant GebaBuna listing!
• 🎙️ <b>Multilingual Voice Agent</b>: Speaks natural Afaan Oromoo & Amharic.
• 📸 <b>Instant AI Photo Grading</b>: Send bean photos for official ECX Grade & defects.
• 📊 <b>Statutory Price Floors</b>: Never sell below official ECX minimum rates.
• 🛒 <b>Direct Buyer Connection</b>: Connect with verified buyers paying above the floor.

👇 <b>Please select your language / Maaloo afaan keessan filadhaa / እባክዎ ቋንቋዎን ይምረጡ:</b>`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🌳 Afaan Oromoo (Jimma / Oromia)', callback_data: 'select_lang_om' }],
        [{ text: '🇪🇹 አማርኛ (Amharic)', callback_data: 'select_lang_am' }],
        [{ text: '🇬🇧 English', callback_data: 'select_lang_en' }],
      ],
    };

    await this.sendMessage(chatId, welcomeText, { reply_markup: keyboard });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: MAIN MENU (PERSISTENT KEYBOARD + INLINE CAPABILITIES)
  // ─────────────────────────────────────────────────────────────────────────────
  private static async sendMainMenu(chatId: number, userId: number): Promise<void> {
    const session = this.getSession(userId);
    session.state = 'main_menu';
    const lang = this.getLang(userId);

    const title =
      lang === 'am'
        ? `🏠 <b>ዋና ገጽ — ምን ማድረግ ይፈልጋሉ?</b>\n\nከታች ካሉት አዝራሮች አንዱን ይምረጡ ወይም በማንኛውም ሰዓት የድምፅ መልእክት ወይም ፎቶ ይላኩ:`
        : lang === 'en'
        ? `🏠 <b>Main Menu — What would you like to do?</b>\n\nSelect a core capability below, or send a voice note / photo at any time:`
        : `🏠 <b>BAAFATA GUUTUU — Maal gochuu barbaaddu?</b>\n\nFilannoowwan armaan gadii keessaa tokko filadhaa, yookaan yeroo barbaaddanitti sagalee ykn suuraa ergaa:`;

    // Inline action cards
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: lang === 'am' ? '☕ ቡና መሸጥ (Voice Agent)' : lang === 'en' ? '☕ Sell My Coffee (Voice)' : '☕ Buna Koo Gurguruu (Sagalee)',
            callback_data: 'action_sell',
          },
        ],
        [
          {
            text: lang === 'am' ? '📸 የቡና ፍሬ ጥራት መመርመር' : lang === 'en' ? '📸 AI Coffee Bean Grader' : '📸 Suuraa Bunaa Qorachuu',
            callback_data: 'action_grade',
          },
          {
            text: lang === 'am' ? '📊 የዛሬው የገበያ ዋጋ' : lang === 'en' ? "📊 Today's ECX Prices" : "📊 Gatii Har'aa Ilaaluu",
            callback_data: 'action_prices',
          },
        ],
        [
          {
            text: lang === 'am' ? '📋 የእኔ ክፍት ሽያጮች' : lang === 'en' ? '📋 My Active Listings' : '📋 Buna Koo Gabaarra Jiru',
            callback_data: 'action_listings',
          },
          {
            text: lang === 'am' ? '🌐 ቋንቋ ቀይር' : lang === 'en' ? '🌐 Language' : '🌐 Afaan Jijjiiri',
            callback_data: 'action_language',
          },
        ],
        [
          {
            text: lang === 'am' ? '🔗 የገባቡና ድህረ-ገጽን ክፈት' : lang === 'en' ? '🔗 Open GebaBuna Web' : '🔗 Gabaa GebaBuna Bani',
            url: config.clientUrl || 'http://localhost:3000',
          },
        ],
      ],
    };

    // Bottom persistent keyboard (easy thumb tapping on phone screen)
    const replyKeyboard = this.getPersistentKeyboard(lang);

    await this.sendMessage(chatId, title, {
      reply_markup: inlineKeyboard,
    });

    // Also send bottom dock buttons
    await this.sendReplyKeyboardPrompt(chatId, lang, replyKeyboard);
  }

  private static getPersistentKeyboard(lang: Language): any {
    if (lang === 'am') {
      return {
        keyboard: [
          [{ text: '☕ ቡና መሸጥ (Voice)' }, { text: '📸 የቡና ጥራት መርምር' }],
          [{ text: '📊 የገበያ ዋጋ' }, { text: '📋 የእኔ ቡናዎች' }],
          [{ text: '🌐 ቋንቋ ቀይር' }, { text: '🔗 ድህረ-ገጽ ክፈት' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      };
    } else if (lang === 'en') {
      return {
        keyboard: [
          [{ text: '☕ Sell Coffee (Voice)' }, { text: '📸 AI Photo Grader' }],
          [{ text: "📊 Today's Prices" }, { text: '📋 My Active Lots' }],
          [{ text: '🌐 Change Language' }, { text: '🔗 Open Web App' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      };
    } else {
      return {
        keyboard: [
          [{ text: '☕ Buna Gurguri (Voice)' }, { text: '📸 Suuraa Qori (Photo)' }],
          [{ text: "📊 Gatii Har'aa (ECX)" }, { text: '📋 Buna Koo (Listings)' }],
          [{ text: '🌐 Afaan Jijjiiri' }, { text: '🔗 Gabaa GebaBuna' }],
        ],
        resize_keyboard: true,
        is_persistent: true,
      };
    }
  }

  private static matchMenuButton(text: string): 'sell' | 'grade' | 'price' | 'listings' | 'language' | 'web' | null {
    const t = text.toLowerCase();
    if (t.includes('sell') || t.includes('gurgur') || t.includes('መሸጥ')) return 'sell';
    if (t.includes('grade') || t.includes('photo') || t.includes('suuraa') || t.includes('ፎቶ') || t.includes('ጥራት')) return 'grade';
    if (t.includes('price') || t.includes('gatii') || t.includes('ዋጋ') || t.includes('ecx')) return 'price';
    if (t.includes('listings') || t.includes('buna koo') || t.includes('የእኔ') || t.includes('lots')) return 'listings';
    if (t.includes('lang') || t.includes('afaan') || t.includes('ቋንቋ')) return 'language';
    if (t.includes('web') || t.includes('geba') || t.includes('ድህረ') || t.includes('bani')) return 'web';
    return null;
  }

  private static async sendReplyKeyboardPrompt(chatId: number, lang: Language, keyboard: any): Promise<void> {
    const hint =
      lang === 'am'
        ? '💡 <i>ከታች ያሉትን ፈጣን አዝራሮች በመጠቀም ያለምንም ጽሁፍ መንቀሳቀስ ይችላሉ።</i>'
        : lang === 'en'
        ? '💡 <i>You can use the persistent buttons below for zero-typing navigation.</i>'
        : '💡 <i>Qabduulee armaan gadii fayyadamuun osoo hin barreessin socho\'uu dandeessu.</i>';

    await fetch(this.getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: hint,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      }),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: INTERACTIVE "SELL COFFEE" WORKFLOW (VOICE AGENT FIRST)
  // ─────────────────────────────────────────────────────────────────────────────
  private static async startSellWorkflow(chatId: number, userId: number): Promise<void> {
    const session = this.getSession(userId);
    session.state = 'awaiting_sell_voice';
    const lang = this.getLang(userId);

    const omPrompt = `☕ <b>BUNA KOO GURGURUU BARBAADA (VOICE AGENT)</b>

🎙️ <b>Maaloo sagalee keessaniin naaf himaa:</b>
1. Akaakuu bunaa (Natural / Dhiqamaa G1–G5)
2. Kiiloo meeqa qabdu?
3. Kiiloo tokko gatii meeqaan gurguruu barbaaddu?

🗣️ <b>Fakkeenya:</b>
<i>"Buna Natural G2 kiiloo 500 qarshii 1,100n gurguruun barbaada."</i>

👇 <i>Amma mallattoo maaykiroofoonii Telegram cuqaasaatii sagalee keessan ergaa, yookaan asitti barreessaa:</i>`;

    const amPrompt = `☕ <b>ቡናዎን ለመሸጥ የቀረበ ጥሪ (የድምፅ ረዳት)</b>

🎙️ <b>እባክዎ የሚከተሉትን በድምፅ ይንገሩኝ:</b>
1. የቡናውን አይነት (ጀንፈል ወይስ የታጠበ ደረጃ 1–5)
2. ስንት ኪሎ አለዎት?
3. የአንዱን ኪሎ ዋጋ በስንት መሸጥ ይፈልጋሉ?

🗣️ <b>ለምሳሌ:</b>
<i>"የጀንፈል ደረጃ 2 ቡና 500 ኪሎ በ1,100 ብር መሸጥ እፈልጋለሁ።"</i>

👇 <i>አሁን የቴሌግራም ማይክራፎን ምልክቱን ተጭነው ድምጽዎን ይላኩ ወይም በጽሁፍ ይላኩ:</i>`;

    const enPrompt = `☕ <b>SELL YOUR COFFEE LOT (VOICE AGENT)</b>

🎙️ <b>Speak to the bot using a voice note:</b>
1. Coffee type (Washed / Natural G1–G5)
2. How many kg do you have?
3. What is your asking price per kg?

🗣️ <b>Example:</b>
<i>"I want to sell 500 kg of Natural G2 at 1,100 ETB per kg."</i>

👇 <i>Tap the microphone button to send a voice note, or type below:</i>`;

    const promptText = lang === 'am' ? amPrompt : lang === 'en' ? enPrompt : omPrompt;

    const actionButtons = {
      inline_keyboard: [
        [
          {
            text: lang === 'am' ? '📸 ወይም የቡና ፍሬ ፎቶ ላክ' : lang === 'en' ? '📸 Or Send Photo Instead' : '📸 Yookaan Suuraa Ergi',
            callback_data: 'action_grade',
          },
        ],
        [
          {
            text: lang === 'am' ? '📊 መነሻ ዋጋዎችን አስቀድመህ እይ' : lang === 'en' ? '📊 Check Floor Prices First' : "📊 Gatii Gadi-aanaa Dura Ilaali",
            callback_data: 'action_prices',
          },
          {
            text: lang === 'am' ? '🔙 ወደ ዋና ገጽ' : lang === 'en' ? '🔙 Main Menu' : '🔙 Gara Fuula Duraa',
            callback_data: 'action_menu',
          },
        ],
      ],
    };

    await this.sendMessage(chatId, promptText, { reply_markup: actionButtons });

    // Send native spoken audio prompt immediately so illiterate farmers hear it directly!
    try {
      const speechText =
        lang === 'am'
          ? 'እንኳን ደህና መጡ! ቡናዎን ለመሸጥ ስንት ኪሎ እንዳለዎት እና የአንዱን ኪሎ ዋጋ በስንት መሸጥ እንደሚፈልጉ በድምፅ ይንገሩኝ።'
          : 'Baga nagaan dhuftan! Buna keessan gurguruuf kiiloo meeqa akka qabdanii fi gatii meeqaan akka gurguruu barbaaddan sagaleedhaan naaf himaa.';

      const tts = await AddisAiService.synthesizeSpeech(speechText, lang === 'am' ? 'am' : 'om');
      if (tts && tts.audioBase64) {
        const audioBuf = Buffer.from(tts.audioBase64, 'base64');
        await this.sendVoice(
          chatId,
          audioBuf,
          lang === 'am' ? '🔊 የቦቱ የድምፅ መመሪያ' : '🔊 Qajeelfama Sagalee BunaJimma'
        );
      }
    } catch (e) {
      console.warn('[TelegramBot] Spoken audio prompt skipped:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: PROCESSING VOICE NOTE OR TEXT INPUT
  // ─────────────────────────────────────────────────────────────────────────────
  private static async handleVoiceMessage(message: any, chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const session = this.getSession(userId);

    const analyzingNotice =
      lang === 'am'
        ? '🎙️ <b>ድምጽዎን አዳምጠናል።</b>\nእየመረመርን ትክክለኛውን ዋጋ በማዘጋጀት ላይ ነን...'
        : lang === 'en'
        ? '🎙️ <b>Listening to your voice note...</b>\nTranscribing and evaluating fair market floor...'
        : '🎙️ <b>Sagaleen keessan nu gaheera!</b>\nDhaggeeffachaa jirra, gatii haqa qabeessa qoranna...';

    const statusMsg = await this.sendMessage(chatId, analyzingNotice);

    try {
      const media = message.voice || message.audio;
      const fileId = media.file_id;
      const mimetype = media.mime_type || 'audio/ogg';

      // 1. Download voice audio
      const audioBuffer = await this.downloadTelegramFile(fileId);

      // 2. Transcribe via Addis AI Scribe
      const transcription = await AddisAiService.transcribeAudio(audioBuffer, mimetype, lang);
      const text = transcription.text.trim();

      if (!text) {
        if (statusMsg?.message_id) await this.deleteMessage(chatId, statusMsg.message_id);
        const retryText =
          lang === 'am'
            ? '⚠️ ድምጽዎ በግልጽ አልተሰማም። እባክዎ እንደገና በዝግታ ይናገሩ።'
            : lang === 'en'
            ? '⚠️ Could not understand the voice note clearly. Please speak slowly and try again.'
            : '⚠️ Sagaleen keessan ifatti hin dhaga\'amne. Maaloo suuta deebisaatii dubbadhaa.';
        await this.sendMessage(chatId, retryText);
        return;
      }

      // 3. Process voice intent
      const processed = await this.processFarmerInput(text, lang);

      // Delete status message
      if (statusMsg?.message_id) await this.deleteMessage(chatId, statusMsg.message_id);

      // 4. Send what was heard + response
      const heardHeader =
        lang === 'am'
          ? `🎙️ <b>ያሉት:</b> <i>"${text}"</i>\n\n`
          : lang === 'en'
          ? `🎙️ <b>You said:</b> <i>"${text}"</i>\n\n`
          : `🎙️ <b>Kan jette:</b> <i>"${text}"</i>\n\n`;

      await this.sendMessage(chatId, `${heardHeader}${processed.textResponse}`);

      // 5. Send synthesized voice audio reply back!
      try {
        const tts = await AddisAiService.synthesizeSpeech(
          processed.plainText,
          lang === 'am' ? 'am' : 'om'
        );
        if (tts && tts.audioBase64) {
          const ttsBuffer = Buffer.from(tts.audioBase64, 'base64');
          await this.sendVoice(
            chatId,
            ttsBuffer,
            lang === 'am' ? '🔊 የቦቱ የድምፅ መልስ' : '🔊 Deebii Sagalee BunaJimma'
          );
        }
      } catch (ttsErr) {
        console.warn('[TelegramBot] Spoken reply skipped:', ttsErr);
      }

      // 6. If it's a sell draft, show confirmation buttons
      if (processed.sellDraft) {
        session.state = 'awaiting_sell_confirm';
        session.lastListingDraft = processed.sellDraft;

        const confirmKeyboard = {
          inline_keyboard: [
            [
              {
                text:
                  lang === 'am'
                    ? `✅ አረጋግጥና በገበያ ላይ ይለጠፍ (${processed.sellDraft.quantityKg} ኪግ)`
                    : lang === 'en'
                    ? `✅ Confirm & Publish Listing (${processed.sellDraft.quantityKg} kg)`
                    : `✅ Mirkaneessi Gabaaf Maxxansi (${processed.sellDraft.quantityKg} kg)`,
                callback_data: 'confirm_listing_publish',
              },
            ],
            [
              {
                text: lang === 'am' ? '🔄 በድጋሚ ተናገር' : lang === 'en' ? '🔄 Re-record' : '🔄 Deebisi Dubbadhu',
                callback_data: 'action_sell',
              },
              {
                text: lang === 'am' ? '❌ ሰርዝ' : lang === 'en' ? '❌ Cancel' : '❌ Haqi',
                callback_data: 'action_menu',
              },
            ],
          ],
        };

        const draftCard =
          lang === 'am'
            ? `📋 <b>የሽያጭ ማስታወቂያ ረቂቅ ዝግጁ ነው:</b>\n• ምርት: <b>${processed.sellDraft.coffeeType}</b>\n• መጠን: <b>${processed.sellDraft.quantityKg} ኪግ</b>\n• የመጠየቂያ ዋጋ: <b>${processed.sellDraft.askingPricePerKg} ብር/ኪግ</b>\n• ጠቅላላ ዋጋ: <b>${processed.sellDraft.totalEtb.toLocaleString()} ብር</b>\n• የECX ሕጋዊ መነሻ: <b>${processed.sellDraft.marketFloor} ብር/ኪግ</b>\n\nይህ ምርት በገበያ ላይ ለተረጋገጡ ገዢዎች ይፋ እንዲሆን አረጋግጥ የሚለውን ይጫኑ:`
            : `📋 <b>DHIYAANNAAN GURGURTAA QOPHAA'EERA:</b>\n• Akaakuu: <b>${processed.sellDraft.coffeeType}</b>\n• Baay'ina: <b>${processed.sellDraft.quantityKg} kg</b>\n• Gatii: <b>${processed.sellDraft.askingPricePerKg} ETB/kg</b>\n• Gatii Waliigalaa: <b>${processed.sellDraft.totalEtb.toLocaleString()} ETB</b>\n• Gatii Gadi-aanaa ECX: <b>${processed.sellDraft.marketFloor} ETB/kg</b>\n\nBuna kana gabaa GebaBuna irratti bittootaaf ifa gochuuf Mirkaneessi kan jedhu cuqaasaa:`;

        await this.sendMessage(chatId, draftCard, { reply_markup: confirmKeyboard });
      }
    } catch (err: any) {
      console.error('[TelegramBot] Voice handling failed:', err);
      if (statusMsg?.message_id) await this.deleteMessage(chatId, statusMsg.message_id);
      await this.sendMessage(
        chatId,
        '❌ Sagalee qorachuun hin danda\'amne. Maaloo irra deebisaatii yaalaa.'
      );
    }
  }

  private static async handleTextMessage(text: string, chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const session = this.getSession(userId);

    const processed = await this.processFarmerInput(text, lang);
    await this.sendMessage(chatId, processed.textResponse);

    if (processed.sellDraft) {
      session.state = 'awaiting_sell_confirm';
      session.lastListingDraft = processed.sellDraft;

      const confirmKeyboard = {
        inline_keyboard: [
          [
            {
              text:
                lang === 'am'
                  ? `✅ አረጋግጥና በገበያ ላይ ይለጠፍ (${processed.sellDraft.quantityKg} ኪግ)`
                  : lang === 'en'
                  ? `✅ Confirm & Publish Listing (${processed.sellDraft.quantityKg} kg)`
                  : `✅ Mirkaneessi Gabaaf Maxxansi (${processed.sellDraft.quantityKg} kg)`,
              callback_data: 'confirm_listing_publish',
            },
          ],
          [
            {
              text: lang === 'am' ? '❌ ሰርዝ' : lang === 'en' ? '❌ Cancel' : '❌ Haqi',
              callback_data: 'action_menu',
            },
          ],
        ],
      };

      await this.sendMessage(
        chatId,
        lang === 'am'
          ? '📋 <b>ምርትዎን ወደ ገበያ ለመለጠፍ አረጋግጥ የሚለውን ይጫኑ:</b>'
          : '📋 <b>Buna keessan gabaaf dhiyeessuuf Mirkaneessi cuqaasaa:</b>',
        { reply_markup: confirmKeyboard }
      );
    }
  }

  private static async processFarmerInput(
    input: string,
    lang: Language
  ): Promise<{ textResponse: string; plainText: string; sellDraft?: any }> {
    const lower = input.toLowerCase();

    const isWashed = /dhiqam|washed|የታጠበ/.test(lower);
    const processingType: ProcessingType = isWashed ? 'washed' : 'natural';
    const gradeMatch = /(?:g|grade|sadarkaa|ደረጃ)\s*([1-5])/.exec(lower);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[1], 10) : 2;
    const safeGradeNum = Math.min(5, Math.max(1, gradeNum));
    const gradeKey: CoffeeGrade = `Grade ${safeGradeNum}` as CoffeeGrade;
    const gradeName = `${isWashed ? 'Washed' : 'Natural'} G${safeGradeNum}`;

    const ref = await getMarketReferencePrice(processingType, gradeKey);

    const extractedNumber = AddisAiService.extractNumber(input, lang);
    const allNumbers: number[] = [];
    const numberMatches = input.match(/\d+/g);
    if (numberMatches) {
      numberMatches.forEach((m) => allNumbers.push(parseInt(m, 10)));
    } else if (extractedNumber) {
      allNumbers.push(extractedNumber);
    }

    const isSellIntent = /gurgur|sell|መሸጥ|እሸጣለሁ|kiiloo|kilo|ኪሎ/.test(lower);

    if (isSellIntent) {
      const quantityKg = allNumbers.find((n) => n >= 50 && n <= 500000) || 500;
      const proposedPrice = allNumbers.find((n) => n >= 200 && n <= 3000 && n !== quantityKg) || ref + 25;
      const fairness = evaluatePriceFairness(proposedPrice, ref);
      const isFair = fairness.status === 'fair';
      const totalEtb = quantityKg * proposedPrice;

      let plainText = '';
      let textResponse = '';

      if (lang === 'am') {
        plainText = `የ${gradeName} ቡና ${quantityKg} ኪሎ በ${proposedPrice} ብር መሸጥ ይፈልጋሉ። ዝቅተኛው የECX መነሻ ዋጋ ${ref} ብር ነው። ዋጋዎ ${isFair ? 'ፍትሃዊ ነው' : 'ከመነሻው በታች ነው'}።`;
        textResponse = `💰 <b>የቡና ሽያጭ ጥያቄ ተዘጋጅቷል:</b>\n${plainText}\n\n• ምርት: <b>${gradeName}</b>\n• መጠን: <b>${quantityKg.toLocaleString()} ኪግ</b>\n• የቀረበ ዋጋ: <b>${proposedPrice} ብር/ኪግ</b>\n• ጠቅላላ ዋጋ: <b>${totalEtb.toLocaleString()} ብር</b>\n• ዝቅተኛ መነሻ (ECX Floor): <b>${ref} ብር/ኪግ</b> (${isFair ? '✅ ፍትሃዊ / ከመነሻ በላይ' : '⚠️ ከመነሻው በታች'})`;
      } else {
        plainText = `Buna ${gradeName} kiiloo ${quantityKg} qarshii ${proposedPrice}n gurguruu barbaaddu. Gatiin gadi-aanaa ECX qarshii ${ref} dha. Gatiin keessan ${isFair ? 'haqa qabeessa' : 'gatii gadi-aanaa gadi'} dha.`;
        textResponse = `💰 <b>Gurgurtaa Bunaa Qophaa'eera:</b>\n${plainText}\n\n• Akaakuu: <b>${gradeName}</b>\n• Baay'ina: <b>${quantityKg.toLocaleString()} kg</b>\n• Gatii: <b>${proposedPrice} ETB/kg</b>\n• Gatii Waliigalaa: <b>${totalEtb.toLocaleString()} ETB</b>\n• Gatii Gadi-aanaa ECX: <b>${ref} ETB/kg</b> (${isFair ? '✅ Gatii Madaallii Ol' : '⚠️ Gatii Gadi-aanaa Gadi'})`;
      }

      return {
        textResponse,
        plainText,
        sellDraft: {
          coffeeType: `Jimma ${gradeName}`,
          processing: processingType,
          grade: gradeKey,
          quantityKg,
          askingPricePerKg: proposedPrice,
          totalEtb,
          marketFloor: ref,
          isFair,
        },
      };
    }

    // Default to price lookup
    let plainText = '';
    let textResponse = '';

    if (lang === 'am') {
      plainText = `የ${gradeName} የዛሬው የገበያ መነሻ ዋጋ በኪሎ ${ref} ብር ነው።`;
      textResponse = `📊 <b>የዕለቱ የECX መነሻ ዋጋ:</b>\n${plainText}\n\n• ደረጃ: <b>${gradeName}</b>\n• ዝቅተኛ መነሻ ዋጋ (Floor): <b>${ref} ብር/ኪግ</b>\n• የተገመተ የገበያ ተመን: <b>${ref} – ${ref + 115} ብር/ኪግ</b>`;
    } else {
      plainText = `Gatiin ${gradeName} har'aa qarshii ${ref} irraa kaasa.`;
      textResponse = `📊 <b>Gatii Madaallii ECX Har'aa:</b>\n${plainText}\n\n• Sadarkaa: <b>${gradeName}</b>\n• Gatii Gadi-aanaa (Floor): <b>${ref} ETB/kg</b>\n• Tilmaama Gabaa: <b>${ref} – ${ref + 115} ETB/kg</b>`;
    }

    return { textResponse, plainText };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: AI PHOTO QUALITY GRADING
  // ─────────────────────────────────────────────────────────────────────────────
  private static async promptPhotoGrading(chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const session = this.getSession(userId);
    session.state = 'awaiting_photo_grading';

    const prompt =
      lang === 'am'
        ? `📸 <b>የቡና ፍሬ ጥራት መመርመሪያ (AI Vision)</b>\n\nየቡና ፍሬዎን ፎቶ አንስተው እዚህ ይላኩ! ቦቱ የECX ደረጃውን፣ ጉድለቶቹን፣ የቀለም ጥራቱንና የገበያ ዋጋውን ይነግርዎታል።\n\n💡 <i>ምክንያታዊ ውጤት ለማግኘት ፍሬዎቹን በነጭ ወረቀት ላይ ዘርግተው በብርሃን ያንሱ።</i>`
        : `📸 <b>QORANNOO SUURAA IJA BUNAA (AI VISION)</b>\n\nSuuraa ija buna keessanii ifa gaariin kaasaatii as ergaa! Botiin sekondii muraasa keessatti sadarkaa ECX, hanqina, fi gatii gabaa isiniif hima.\n\n💡 <i>Waraqaa adii irratti afuun kaasaa.</i>`;

    await this.sendMessage(chatId, prompt);
  }

  private static async handlePhotoMessage(message: any, chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const session = this.getSession(userId);

    const analyzingText =
      lang === 'am'
        ? '🔍 <b>የቡና ፍሬዎን ምስል በAI እየመረመርን ነው...</b>\nጥቂት ሰከንዶች ይጠብቁ...'
        : '🔍 <b>Suuraa buna keessanii AI dhaan qoraa jirra...</b>\nMaaloo sekondii muraasa eegaa...';

    const statusMsg = await this.sendMessage(chatId, analyzingText);

    try {
      const photos = message.photo;
      const bestPhoto = photos[photos.length - 1];
      const fileId = bestPhoto.file_id;

      const fileBuffer = await this.downloadTelegramFile(fileId);
      const grading = await gradeCoffeeImage(fileBuffer, 'image/jpeg');

      session.lastGradeResult = grading;

      if (statusMsg?.message_id) await this.deleteMessage(chatId, statusMsg.message_id);

      const formattedResult = this.formatGradingResult(grading, lang);

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === 'am' ? '🛒 ይህን ቡና አሁን በገበያ ላይ ሽጥ' : '🛒 Buna Kana Gabaaf Dhiyeessi',
              callback_data: 'action_sell',
            },
          ],
          [
            {
              text: lang === 'am' ? '📊 የECX መነሻ ዋጋዎች' : "📊 Gatii ECX Ilaali",
              callback_data: 'action_prices',
            },
            {
              text: lang === 'am' ? '🏠 ወደ ዋና ገጽ' : '🏠 Fuula Duraa',
              callback_data: 'action_menu',
            },
          ],
        ],
      };

      await this.sendMessage(chatId, formattedResult, { reply_markup: keyboard });
    } catch (err: any) {
      console.error('[TelegramBot] Photo analysis error:', err);
      if (statusMsg?.message_id) await this.deleteMessage(chatId, statusMsg.message_id);

      if (err instanceof NotCoffeeImageError) {
        await this.sendMessage(
          chatId,
          lang === 'am'
            ? '⚠️ <b>ይህ ፎቶ የቡና ፍሬ አይመስልም።</b>\nእባክዎ የቡና ፍሬውን በግልጽ ብርሃን በወረቀት ላይ አስቀምጠው አንስተው ይላኩ።'
            : '⚠️ <b>Suuraan kun ija bunaa hin fakkaatu.</b>\nMaaloo ija bunaa qulqullinaan waraqaa adii irratti afuun kaasaa ergaa.'
        );
      } else {
        await this.sendMessage(
          chatId,
          lang === 'am'
            ? '❌ ፎቶውን መመርመር አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
            : '❌ Suuraan bunaa hin qoratamne. Maaloo deebisaatii yaalaa.'
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: PUBLISHING CONFIRMED LISTING TO GEBABUNA MARKETPLACE
  // ─────────────────────────────────────────────────────────────────────────────
  private static async publishConfirmedListing(chatId: number, userId: number): Promise<void> {
    const session = this.getSession(userId);
    const draft = session.lastListingDraft;
    const lang = this.getLang(userId);

    if (!draft) {
      await this.sendMessage(
        chatId,
        lang === 'am' ? '⚠️ የሽያጭ ረቂቅ አልተገኘም። እባክዎ እንደገና ይሞክሩ።' : '⚠️ Dhiyaanni gurgurtaa hin jiru. Deebisaa yaalaa.'
      );
      return;
    }

    try {
      const phone = session.phone || `0917${Math.floor(100000 + Math.random() * 900000)}`;
      const normalizedPhone = normalizeEthiopianPhone(phone);

      let user = await User.findOne({ phone: normalizedPhone });
      if (!user) {
        user = await User.create({
          fullName: `Jimma Farmer (${phone.slice(-4)})`,
          phone: normalizedPhone,
          passwordHash: '$2a$10$botCreatedListingPasswordPlaceholderHashDemoOnly',
          role: 'farmer',
          preferredLanguage: lang,
          avatar: '',
        });
      }

      let farmerProfile = await FarmerProfile.findOne({ user: user._id });
      if (!farmerProfile) {
        farmerProfile = await FarmerProfile.create({
          user: user._id,
          fullName: user.fullName,
          phone: user.phone,
          region: 'Oromia',
          zone: 'Jimma',
          woreda: 'Mana',
          kebele: 'Kenteri',
          farmSizeHectares: 2.0,
          coffeeVarieties: [draft.coffeeType],
          processingMethods: [draft.processing],
          preferredLanguage: lang,
        });
      }

      const fairness = evaluatePriceFairness(draft.askingPricePerKg, draft.marketFloor);

      const listing = await Listing.create({
        farmer: user._id,
        farmerProfile: farmerProfile._id,
        coffeeType: draft.coffeeType,
        processing: draft.processing,
        grade: draft.grade,
        quantityKg: draft.quantityKg,
        askingPricePerKg: draft.askingPricePerKg,
        harvestDate: 'Current Harvest / Tahsas 2017',
        location: { region: 'Oromia', zone: 'Jimma', woreda: 'Mana', kebele: 'Kenteri' },
        photos: ['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80'],
        description: `Listed via BunaJimma Telegram Bot Voice Agent. Certified smallholder coffee.`,
        source: 'telegram',
        status: 'open',
        moisturePercentage: 11.5,
        aiEstimatedGrade: draft.grade,
        aiConfidence: 'High',
        aiDefectsSummary: 'Graded by BunaJimma AI Vision',
        marketReferencePrice: draft.marketFloor,
        priceFairnessDiff: fairness.diff,
        priceFairnessStatus: fairness.status,
      });

      session.lastListingDraft = undefined;
      session.state = 'main_menu';

      const successNotice =
        lang === 'am'
          ? `🎉 <b>ቡናዎ በገበያ መድረኩ ላይ በተሳካ ሁኔታ ተለጠፈ!</b>\n\n• መለያ ቁጥር: <code>${listing._id}</code>\n• ምርት: <b>${draft.coffeeType}</b>\n• መጠን: <b>${draft.quantityKg.toLocaleString()} ኪግ</b>\n• ዋጋ: <b>${draft.askingPricePerKg} ብር/ኪግ</b>\n• ጠቅላላ: <b>${draft.totalEtb.toLocaleString()} ብር</b>\n\nገዢዎች አሁን ይህን ምርት አይተው በገበያው ላይ ቀጥታ የዋጋ ጥያቄ (Offer) ያቀርባሉ።`
          : `🎉 <b>BUNA KEESSAN GABAA GEBABUNA IRRATTI MAXXANFAMERA!</b>\n\n• Lot ID: <code>${listing._id}</code>\n• Akaakuu: <b>${draft.coffeeType}</b>\n• Baay'ina: <b>${draft.quantityKg.toLocaleString()} kg</b>\n• Gatii: <b>${draft.askingPricePerKg} ETB/kg</b>\n• Waliigala: <b>${draft.totalEtb.toLocaleString()} ETB</b>\n\nBittoonni dhiyaannaa kana gabaa irraa arguun gatii isiniif dhiyeessu.`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: lang === 'am' ? '🌐 በገበያ መድረኩ ላይ ይመልከቱ' : '🌐 Gabaa GebaBuna Irratti Ilaali',
              url: `${config.clientUrl}/marketplace`,
            },
          ],
          [
            {
              text: lang === 'am' ? '☕ ሌላ ቡና ለመሸጥ' : '☕ Buna Biraa Gurguruu',
              callback_data: 'action_sell',
            },
            {
              text: lang === 'am' ? '🏠 ወደ ዋና ገጽ' : '🏠 Fuula Duraa',
              callback_data: 'action_menu',
            },
          ],
        ],
      };

      await this.sendMessage(chatId, successNotice, { reply_markup: keyboard });
    } catch (e: any) {
      console.error('[TelegramBot] Publishing listing failed:', e);
      await this.sendMessage(chatId, `❌ Gurgurtaa maxxansuun hin milkoofne: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: ACTIVE LISTINGS & PRICES
  // ─────────────────────────────────────────────────────────────────────────────
  private static async sendMyListings(chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const session = this.getSession(userId);

    const listings = await Listing.find({ source: 'telegram' })
      .sort({ createdAt: -1 })
      .limit(5);

    if (!listings || listings.length === 0) {
      const emptyText =
        lang === 'am'
          ? '📋 እስካሁን በቦቱ የተለጠፈ ክፍት የቡና ሽያጭ የለዎትም። አሁን ለመሸጥ ከታች ያለውን ይጫኑ:'
          : "📋 Hamma ammaatti gurgurtaan bunaa hin jiru. Buna keessan gurguruuf armaan gadi cuqaasaa:";

      await this.sendMessage(chatId, emptyText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '☕ ቡና መሸጥ (Voice)' : '☕ Buna Gurguri (Voice)', callback_data: 'action_sell' }],
            [{ text: '🏠 Main Menu', callback_data: 'action_menu' }],
          ],
        },
      });
      return;
    }

    let report =
      lang === 'am'
        ? `📋 <b>የእርስዎ የቅርብ ጊዜ የቡና ሽያጮች (GebaBuna):</b>\n\n`
        : `📋 <b>Buna Keessan Gabaa GebaBuna Irratti Maxxanfame:</b>\n\n`;

    for (const lot of listings) {
      report += `• <b>${lot.coffeeType}</b>\n  ${lot.quantityKg.toLocaleString()} kg · <code>${lot.askingPricePerKg} ETB/kg</code>\n  ሁኔታ: <i>${lot.status}</i> · መለያ: <code>${lot._id.toString().slice(-6)}</code>\n\n`;
    }

    await this.sendMessage(chatId, report, {
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'am' ? '🌐 ገበያውን ክፈት' : '🌐 Gabaa Bani', url: `${config.clientUrl}/marketplace` }],
          [{ text: '🏠 Main Menu', callback_data: 'action_menu' }],
        ],
      },
    });
  }

  private static async sendPriceTable(chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const prices = await MarketPrice.find().sort({ processing: 1, grade: 1 });

    let lines = '';
    for (const p of prices) {
      lines += `• <b>${p.coffeeType}</b>: <code>${p.currentPricePerKgETB} ETB/kg</code>\n`;
    }

    if (!lines) {
      lines = `• <b>Washed G1</b>: <code>1,070 ETB/kg</code>\n• <b>Washed G2</b>: <code>965 ETB/kg</code>\n• <b>Natural G1</b>: <code>1,005 ETB/kg</code>\n• <b>Natural G2</b>: <code>895 ETB/kg</code>\n• <b>Natural G4</b>: <code>710 ETB/kg</code>\n`;
    }

    const title =
      lang === 'am'
        ? `📊 <b>የዕለቱ የECX ቡና መነሻ ዋጋዎች (ብር/ኪግ)</b>\n\n`
        : `📊 <b>Gatii Madaallii ECX Har'aa (ETB/kg)</b>\n\n`;

    const footer =
      lang === 'am'
        ? `\n💡 <i>ማስታወሻ: ይህ ዝቅተኛው ሕጋዊ መነሻ ዋጋ ነው። አርሶ አደሩ ከዚህ በታች እንዳይሸጥ ይጠበቃል።</i>`
        : `\n💡 <i>Hubachiisa: Kun gatii gadi-aanaa seera qabeessadha. Qonnaan bultoonni gatii kana gadi hin gurguran.</i>`;

    await this.sendMessage(chatId, `${title}${lines}${footer}`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: lang === 'am' ? '☕ በዚህ ዋጋ ቡናዬን ሽጥ' : '☕ Buna Koo Gurguri', callback_data: 'action_sell' }],
          [{ text: '🏠 Main Menu', callback_data: 'action_menu' }],
        ],
      },
    });
  }

  private static async sendWebPortalLink(chatId: number, userId: number): Promise<void> {
    const lang = this.getLang(userId);
    const text =
      lang === 'am'
        ? '🌐 <b>የገባቡና ድህረ-ገጽ መድረክ:</b>\nቀጥታ ግብይት ለማየት፣ ከገዢዎች ጋር ለመደራደር እና የECX ሰንጠረዥን ለመመልከት ሊንኩን ይጫኑ:'
        : '🌐 <b>Gabaa GebaBuna Web Desk:</b>\nDaldala kallattii, gatii madaallii, fi bittoota wajjin waliigaluuf liinkii kana cuqaasaa:';

    await this.sendMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 GebaBuna Web Portal', url: config.clientUrl || 'http://localhost:3000' }],
          [{ text: '🏠 Main Menu', callback_data: 'action_menu' }],
        ],
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CALLBACK QUERY HANDLER
  // ─────────────────────────────────────────────────────────────────────────────
  private static async handleCallbackQuery(query: any): Promise<void> {
    const chatId = query.message?.chat?.id;
    const userId = query.from?.id || chatId;
    const session = this.getSession(userId);
    const data = query.data || '';

    await fetch(this.getApiUrl('answerCallbackQuery'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id }),
    });

    if (data.startsWith('select_lang_')) {
      const chosenLang = data.replace('select_lang_', '') as Language;
      session.language = chosenLang;
      const conf =
        chosenLang === 'am'
          ? '✅ ቋንቋው ወደ <b>አማርኛ</b> ተቀይሯል።'
          : chosenLang === 'en'
          ? '✅ Language selected: <b>English</b>.'
          : '✅ Afaan gara <b>Afaan Oromoo</b>tti jijjiirameera.';
      await this.sendMessage(chatId, conf);
      await this.sendMainMenu(chatId, userId);
    } else if (data === 'action_sell') {
      await this.startSellWorkflow(chatId, userId);
    } else if (data === 'action_grade') {
      await this.promptPhotoGrading(chatId, userId);
    } else if (data === 'action_prices') {
      await this.sendPriceTable(chatId, userId);
    } else if (data === 'action_listings') {
      await this.sendMyListings(chatId, userId);
    } else if (data === 'action_language') {
      await this.sendWelcomeAndLanguageSelection(chatId);
    } else if (data === 'action_menu') {
      await this.sendMainMenu(chatId, userId);
    } else if (data === 'confirm_listing_publish') {
      await this.publishConfirmedListing(chatId, userId);
    }
  }

  private static formatGradingResult(g: CoffeeGradeResult, lang: Language): string {
    const isAm = lang === 'am';
    const isEn = lang === 'en';

    const header = isAm
      ? `☕ <b>የቡና ፍሬ AI ምርመራ ውጤት</b>\n\n`
      : isEn
      ? `☕ <b>AI COFFEE BEAN GRADING RESULT</b>\n\n`
      : `☕ <b>BU'AA QORANNOO SUURAA BUNAA (AI)</b>\n\n`;

    const gradeLabel = isAm ? '🏷️ የECX ደረጃ:' : '🏷️ Sadarkaa ECX:';
    const priceLabel = isAm ? '💰 የተገመተ ፍትሃዊ ዋጋ:' : '💰 Gatii Madaalawaa:';
    const defectLabel = isAm ? '⚠️ የታዩ ጉድለቶች:' : '⚠️ Hanqina (Defects):';
    const colorLabel = isAm ? '🎨 የቀለም ጥራት:' : '🎨 Bifa:';
    const uniformLabel = isAm ? '📐 የፍሬው እኩልነት:' : '📐 Wal-gibhinsa:';
    const moistureLabel = isAm ? '💧 እርጥበት:' : '💧 Jiidhinsa:';
    const tipsHeader = isAm ? '💡 <b>ለገበሬው የተሰጠ ተግባራዊ ምክር:</b>' : '💡 <b>Gorsa Qonnaan Bulaaf:</b>';

    const tips = (isAm ? g.tips_amharic : g.tips_oromo) || [];
    const tipsText = tips.map((t) => `• ${t}`).join('\n');

    return (
      `${header}` +
      `${gradeLabel} <b>${g.grade_tier}</b>\n` +
      `${priceLabel} <b>${g.estimated_price_min_etb || 750} – ${g.estimated_price_max_etb || 950} ETB/kg</b>\n` +
      `${defectLabel} <b>${g.defect_percentage}%</b>\n` +
      `${colorLabel} <b>${g.color_quality}</b>\n` +
      `${uniformLabel} <b>${g.uniformity_score}/10</b>\n` +
      `${moistureLabel} <b>${g.moisture_level}</b>\n\n` +
      `📋 <i>"${g.summary_english}"</i>\n\n` +
      `${tipsHeader}\n${tipsText || '• Qulqullinaan ija bunaa filaa.'}`
    );
  }

  private static async handleContactShared(message: any, chatId: number, userId: number): Promise<void> {
    const session = this.getSession(userId);
    const phone = message.contact.phone_number;
    session.phone = phone;
    await this.sendMessage(chatId, `✅ Lakkoofsi bilbilaa (${phone}) qabameera.`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TELEGRAM RAW API CALLS
  // ─────────────────────────────────────────────────────────────────────────────
  public static async sendMessage(chatId: number, text: string, options: any = {}): Promise<any> {
    try {
      const res = await fetch(this.getApiUrl('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...options,
        }),
      });
      return await res.json();
    } catch (e: any) {
      console.error('[TelegramBot] sendMessage failed:', e.message);
      return null;
    }
  }

  public static async deleteMessage(chatId: number, messageId: number): Promise<void> {
    try {
      await fetch(this.getApiUrl('deleteMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      });
    } catch {}
  }

  public static async sendVoice(chatId: number, audioBuffer: Buffer, caption = ''): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('chat_id', String(chatId));
      if (caption) formData.append('caption', caption);
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
      formData.append('voice', blob, 'voice_reply.ogg');

      const res = await fetch(this.getApiUrl('sendVoice'), {
        method: 'POST',
        body: formData,
      });
      return await res.json();
    } catch (e: any) {
      console.error('[TelegramBot] sendVoice failed:', e.message);
      return null;
    }
  }

  public static async downloadTelegramFile(fileId: string): Promise<Buffer> {
    const getFileRes = await fetch(`${this.getApiUrl('getFile')}?file_id=${fileId}`);
    const getFileJson: any = await getFileRes.json();
    if (!getFileJson.ok || !getFileJson.result?.file_path) {
      throw new Error('Could not get Telegram file metadata.');
    }
    const filePath = getFileJson.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${filePath}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Could not download file from Telegram (HTTP ${res.status})`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
