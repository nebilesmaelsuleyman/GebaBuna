import { config } from '../config';

export interface TranscribeResult {
  text: string;
  language: 'om' | 'am' | 'en';
  provider: 'addis-ai' | 'gemini' | 'none';
  confidence?: number;
}

export interface SynthesizeResult {
  audioBase64: string;
  audioUrl?: string;
  contentType: string;
  provider: 'addis-ai' | 'fallback';
  voiceName?: string;
}

export class AddisAiService {
  private static ADDIS_API_URL = 'https://api.addisassistant.com/api/v1';

  /**
   * Transcribe audio buffer using Addis AI Scribe with Gemini fallback
   */
  public static async transcribeAudio(
    audioBuffer: Buffer,
    mimetype: string = 'audio/webm',
    language: 'om' | 'am' | 'en' = 'om'
  ): Promise<TranscribeResult> {
    const langCode = language === 'om' ? 'om' : language === 'am' ? 'am' : 'en';
    const requestId = `scribe_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Detect if buffer is standard PCM WAV
    const isWav = audioBuffer.length > 12 && audioBuffer.toString('utf8', 0, 4) === 'RIFF';
    const effectiveMime = isWav ? 'audio/wav' : mimetype || 'audio/wav';
    const ext = isWav ? 'wav' : mimetype.includes('mp3') ? 'mp3' : 'wav';

    // 1. Try Addis AI Scribe with official request_id and backend=turbo
    if (config.addisApiKey) {
      try {
        console.log(`[AddisAI] Sending audio to Scribe (language=${langCode}, mime=${effectiveMime}, requestId=${requestId})...`);
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: effectiveMime });
        formData.append('audio', blob, `voice_${Date.now()}.${ext}`);

        const url = `${this.ADDIS_API_URL}/scribe/transcribe?backend=turbo&request_id=${requestId}&language=${langCode}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': config.addisApiKey,
          },
          body: formData,
        });

        if (response.ok) {
          const resJson: any = await response.json();
          const transcript = resJson.data?.text ?? resJson.text ?? '';
          console.log(`[AddisAI] Scribe response text: "${transcript}"`);
          if (transcript.trim()) {
            return {
              text: transcript.trim(),
              language,
              provider: 'addis-ai',
              confidence: 0.96,
            };
          }
        } else {
          const errText = await response.text();
          console.warn(`[AddisAI] Scribe API error (${response.status}):`, errText);
        }
      } catch (err: any) {
        console.warn('[AddisAI] Scribe request failed:', err.message);
      }
    }

    // 2. Fallback to Gemini Multimodal Audio if GEMINI_API_KEY is available
    if (config.geminiApiKey) {
      try {
        console.log('[AddisAI Fallback] Attempting Gemini audio transcription...');
        const base64Audio = audioBuffer.toString('base64');
        const langPrompt =
          language === 'om'
            ? 'Listen to this audio clip in Afaan Oromoo from an Ethiopian coffee farmer. Transcribe the spoken words accurately in Afaan Oromoo (Qubee). Return only the transcription text.'
            : language === 'am'
            ? 'ይህን ከአማርኛ ቋንቋ ተናጋሪ የቡና ገበሬ የተቀዳ ድምጽ በጥሞና በማዳመጥ በትክክል በአማርኛ ፊደል ጻፈው። ምንም ተጨማሪ ጽሁፍ አትጨምር፣ ትክክለኛውን ንግግር ብቻ ጻፍ።'
            : 'Transcribe this English audio snippet accurately. Return only the transcription.';

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: effectiveMime || 'audio/wav',
                      data: base64Audio,
                    },
                  },
                  { text: langPrompt },
                ],
              },
            ],
          }),
        });

        if (geminiRes.ok) {
          const gData: any = await geminiRes.json();
          const gText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (gText && gText.trim()) {
            console.log(`[Gemini] Transcribed audio: "${gText.trim()}"`);
            return {
              text: gText.trim(),
              language,
              provider: 'gemini',
            };
          }
        }
      } catch (gErr: any) {
        console.warn('[Gemini] Audio transcription failed:', gErr.message);
      }
    }

    // If nothing could be heard or transcribed, return empty text (do NOT invent numbers)
    return {
      text: '',
      language,
      provider: 'none',
      confidence: 0,
    };
  }

  /**
   * Synthesize speech using Addis AI Voice Lab (Bikila for Oromo, Amanuel for Amharic)
   */
  public static async synthesizeSpeech(
    text: string,
    language: 'om' | 'am' | 'en' = 'om',
    voiceId?: string
  ): Promise<SynthesizeResult | null> {
    const langCode = language === 'om' ? 'om' : language === 'am' ? 'am' : 'en';

    // Normalize voice ID to official Addis AI voices
    let selectedVoice = voiceId;
    if (!selectedVoice) {
      selectedVoice = language === 'om' ? 'om-bikila' : language === 'am' ? 'am-amanuel' : 'en-US-Standard';
    } else {
      const vLower = selectedVoice.toLowerCase();
      if (vLower === 'bikila' || vLower === 'om-bikila') selectedVoice = 'om-bikila';
      else if (vLower === 'amanuel' || vLower === 'am-amanuel') selectedVoice = 'am-amanuel';
      else if (vLower === 'ayyaantuu' || vLower === 'om-ayyaantuu') selectedVoice = 'om-ayyaantuu';
      else if (vLower === 'hamen' || vLower === 'am-hamen') selectedVoice = 'am-hamen';
      else if (vLower === 'leensaa' || vLower === 'om-leensaa') selectedVoice = 'om-leensaa';
      else if (vLower === 'yohannes' || vLower === 'am-yohannes') selectedVoice = 'am-yohannes';
    }

    const clientRequestId = `tts_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    if (config.addisApiKey) {
      try {
        console.log(`[AddisAI] Generating speech for voice ${selectedVoice} (requestId=${clientRequestId})...`);
        const response = await fetch(`${this.ADDIS_API_URL}/voice/generations`, {
          method: 'POST',
          headers: {
            'x-api-key': config.addisApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_request_id: clientRequestId,
            voice_id: selectedVoice,
            text,
            language: langCode,
          }),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const resJson: any = await response.json();
            const dataObj = resJson.data || resJson;
            const rawAudio = dataObj.audio || dataObj.audio_base64 || '';
            const audioUrl = dataObj.audio_url || dataObj.playback?.url || '';
            const cleanB64 = rawAudio.replace(/^data:audio\/\w+;base64,/, '');

            console.log(`[AddisAI] Successfully synthesized voice: ${dataObj.voice_name || selectedVoice}`);
            return {
              audioBase64: cleanB64,
              audioUrl: audioUrl || undefined,
              contentType: dataObj.mime_type || 'audio/mpeg',
              provider: 'addis-ai',
              voiceName: dataObj.voice_name || selectedVoice,
            };
          }

          // Raw audio stream fallback
          const arrayBuffer = await response.arrayBuffer();
          const base64Audio = Buffer.from(arrayBuffer).toString('base64');
          return {
            audioBase64: base64Audio,
            contentType: contentType || 'audio/mpeg',
            provider: 'addis-ai',
            voiceName: selectedVoice,
          };
        } else {
          const errBody = await response.text();
          console.warn(`[AddisAI] TTS error (${response.status}):`, errBody);
        }
      } catch (err: any) {
        console.warn('[AddisAI] TTS synthesis failed:', err.message);
      }
    }

    return null;
  }

  /**
   * Extract numbers and entities from Ethiopian spoken text
   */
  public static extractNumber(text: string, language: 'om' | 'am' | 'en' = 'om'): number | null {
    if (!text) return null;
    const clean = text.toLowerCase().trim();

    // 1. Direct Arabic digits match (e.g. "100", "100kg", "450 birr", "50")
    const digitMatch = clean.match(/\b\d+(\.\d+)?\b/);
    if (digitMatch) {
      const num = parseFloat(digitMatch[0]);
      if (!isNaN(num) && num > 0) return num;
    }

    // 2. Afaan Oromoo word mapping
    if (language === 'om' || /kilo|kiiloo|qarshii|dhibba|kuma|tokko|lama|sadii/i.test(clean)) {
      // Thousands
      let thousands = 0;
      if (/kuma\s+lama/i.test(clean)) thousands = 2000;
      else if (/kuma\s+tokko|kuma\b/i.test(clean)) thousands = 1000;

      // Hundreds
      let hundreds = 0;
      if (/dhibba\s+sagal|sagal\s+dhibba/i.test(clean)) hundreds = 900;
      else if (/dhibba\s+saddet|saddet\s+dhibba|dhibba\s+saddeet|saddeet\s+dhibba/i.test(clean)) hundreds = 800;
      else if (/dhibba\s+torba|torba\s+dhibba/i.test(clean)) hundreds = 700;
      else if (/dhibba\s+ja'a|ja'a\s+dhibba|dhibba\s+jaa|jaa\s+dhibba/i.test(clean)) hundreds = 600;
      else if (/dhibba\s+shan|shan\s+dhibba/i.test(clean)) hundreds = 500;
      else if (/dhibba\s+afur|afur\s+dhibba/i.test(clean)) hundreds = 400;
      else if (/dhibba\s+sadii|sadii\s+dhibba/i.test(clean)) hundreds = 300;
      else if (/dhibba\s+lama|lama\s+dhibba/i.test(clean)) hundreds = 200;
      else if (/dhibba\s+tokko|tokko\s+dhibba|dhibba\b/i.test(clean)) hundreds = 100;

      // Tens
      let tens = 0;
      if (clean.includes('sagaltama')) tens = 90;
      else if (clean.includes('saddeettama') || clean.includes('saddettama')) tens = 80;
      else if (clean.includes('torbaatama')) tens = 70;
      else if (clean.includes('jaatama')) tens = 60;
      else if (clean.includes('shantama')) tens = 50;
      else if (clean.includes('afurtama')) tens = 40;
      else if (clean.includes('soddoma')) tens = 30;
      else if (clean.includes('digdama')) tens = 20;
      else if (clean.includes('kudan') || clean.includes('kudhan')) tens = 10;

      // Standalone units
      let units = 0;
      if (hundreds === 0 && tens === 0 && thousands === 0) {
        if (clean.includes('sagal')) units = 9;
        else if (clean.includes('saddeet') || clean.includes('saddet')) units = 8;
        else if (clean.includes('torba')) units = 7;
        else if (clean.includes("ja'a") || clean.includes('jaa')) units = 6;
        else if (clean.includes('shan')) units = 5;
        else if (clean.includes('afur')) units = 4;
        else if (clean.includes('sadii')) units = 3;
        else if (clean.includes('lama')) units = 2;
        else if (clean.includes('tokko')) units = 1;
      }

      const total = thousands + hundreds + tens + units;
      if (total > 0) return total;
    }

    // 3. Amharic word mapping
    if (language === 'am' || /ኪሎ|ብር|መቶ|ሺህ|አንድ|ሁለት|ሦስት|አራት|አምስት|ስድስት|ሰባት|ስምንት|ዘጠኝ/i.test(clean)) {
      let thousands = 0;
      if (/ሁለት\s*ሺ/i.test(clean)) thousands = 2000;
      else if (/አንድ\s*ሺ|ሺህ|ሺ/i.test(clean)) thousands = 1000;

      let hundreds = 0;
      if (/ዘጠኝ\s*መቶ/i.test(clean)) hundreds = 900;
      else if (/ስምንት\s*መቶ/i.test(clean)) hundreds = 800;
      else if (/ሰባት\s*መቶ/i.test(clean)) hundreds = 700;
      else if (/ስድስት\s*መቶ/i.test(clean)) hundreds = 600;
      else if (/አምስት\s*መቶ/i.test(clean)) hundreds = 500;
      else if (/አራት\s*መቶ/i.test(clean)) hundreds = 400;
      else if (/ሦስት\s*መቶ|ሶስት\s*መቶ/i.test(clean)) hundreds = 300;
      else if (/ሁለት\s*መቶ/i.test(clean)) hundreds = 200;
      else if (/አንድ\s*መቶ|መቶ/i.test(clean)) hundreds = 100;

      let tens = 0;
      if (/ዘጠና/i.test(clean)) tens = 90;
      else if (/ሰማንያ/i.test(clean)) tens = 80;
      else if (/ሰባ/i.test(clean)) tens = 70;
      else if (/ስልሳ/i.test(clean)) tens = 60;
      else if (/ሃምሳ/i.test(clean)) tens = 50;
      else if (/አርባ/i.test(clean)) tens = 40;
      else if (/ሰላሳ/i.test(clean)) tens = 30;
      else if (/ሃያ/i.test(clean)) tens = 20;
      else if (/አስር/i.test(clean)) tens = 10;

      const total = thousands + hundreds + tens;
      if (total > 0) return total;
    }

    return null;
  }

  /**
   * Use Gemini Flash to extract numbers from complex or conversational Ethiopian phrases
   */
  public static async parseNumberWithGemini(text: string, language: string): Promise<number | null> {
    if (!config.geminiApiKey || !text || !text.trim()) return null;
    try {
      const prompt = `You are a number extraction system for Ethiopian coffee farmers.
The farmer said: "${text}" in ${language === 'om' ? 'Afaan Oromoo' : 'Amharic'}.
Extract the quantity in KG or price in ETB (Birr) as a single integer number.
Examples:
- "dhibba tokko" -> 100
- "kiiloo dhibba tokko qaba" -> 100
- "kiiloo dhibba shan" -> 500
- "qarshii dhibba afur" -> 400
- "dhibba lamaa fi shantama" -> 250
- "መቶ ኪሎ" -> 100
- "አምስት መቶ" -> 500
- "አራት መቶ ሃምሳ" -> 450
- "100" -> 100
Return ONLY a valid JSON object: {"number": <int>} or {"number": null} if no number is mentioned. Do not wrap in markdown quotes.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed && typeof parsed.number === 'number' && parsed.number > 0) {
            console.log(`[Gemini Extractor] Extracted ${parsed.number} from "${text}"`);
            return parsed.number;
          }
        }
      }
    } catch (err: any) {
      console.warn('[Gemini] parseNumber failed:', err.message);
    }
    return null;
  }
}
