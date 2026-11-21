import { Router, Request, Response } from 'express';
import { audioUpload } from '../middleware/uploadMiddleware';
import { AddisAiService } from '../services/addisAiService';

const router = Router();

/**
 * POST /api/v1/voice/transcribe
 * Accepts audio file or base64 audio and transcribes via Addis AI Scribe (with Gemini fallback)
 */
router.post('/transcribe', audioUpload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    let audioBuffer: Buffer | null = null;
    let mimetype = 'audio/webm';
    const language = (req.body.language || req.query.language || 'om') as 'om' | 'am' | 'en';

    if (req.file) {
      audioBuffer = req.file.buffer;
      mimetype = req.file.mimetype || mimetype;
    } else if (req.body.audioBase64) {
      const cleanBase64 = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
      audioBuffer = Buffer.from(cleanBase64, 'base64');
      if (req.body.mimetype) {
        mimetype = req.body.mimetype;
      }
    }

    if (!audioBuffer) {
      res.status(400).json({
        success: false,
        message: 'No audio provided. Send audio file in form-data ("audio") or base64 in body ("audioBase64").',
      });
      return;
    }

    const result = await AddisAiService.transcribeAudio(audioBuffer, mimetype, language);
    let extractedValue = AddisAiService.extractNumber(result.text, language);
    if (!extractedValue && result.text) {
      extractedValue = await AddisAiService.parseNumberWithGemini(result.text, language);
    }

    res.json({
      success: true,
      text: result.text,
      language: result.language,
      provider: result.provider,
      extractedValue,
    });
  } catch (error: any) {
    console.error('[VoiceRoute] Transcription failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Voice transcription failed',
    });
  }
});

/**
 * POST /api/v1/voice/synthesize
 * Text to Speech using Addis AI Voice Lab (Afaan Oromoo & Amharic native voices)
 */
router.post('/synthesize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, language = 'om', voiceId } = req.body;

    if (!text) {
      res.status(400).json({ success: false, message: 'Text is required' });
      return;
    }

    const result = await AddisAiService.synthesizeSpeech(text, language, voiceId);

    if (!result) {
      res.json({
        success: false,
        fallbackToBrowser: true,
        message: 'Addis AI TTS unavailable, fallback to browser speech synthesis or pre-recorded audio.',
      });
      return;
    }

    res.json({
      success: true,
      audioBase64: result.audioBase64,
      audioUrl: result.audioUrl,
      contentType: result.contentType,
      provider: result.provider,
      voiceName: result.voiceName,
    });
  } catch (error: any) {
    console.error('[VoiceRoute] Synthesis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Speech synthesis failed',
    });
  }
});

/**
 * POST /api/v1/voice/assistant-step
 * Interactive conversational assistant step for the farmer voice listing flow
 */
router.post('/assistant-step', audioUpload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { step = 'quantity', language = 'om', textHint = '' } = req.body;
    let spokenText = textHint;

    if (req.file) {
      const transcribeResult = await AddisAiService.transcribeAudio(
        req.file.buffer,
        req.file.mimetype,
        language as any
      );
      spokenText = transcribeResult.text;
    }

    const parsedNumber = AddisAiService.extractNumber(spokenText, language as any);

    let confirmationMessage = '';
    let nextStep = '';

    if (step === 'quantity') {
      const qty = parsedNumber || 500;
      nextStep = 'price';
      confirmationMessage =
        language === 'om'
          ? `Buna kiiloo ${qty} galmeessineerra. Amma kiiloo tokko gatii meeqaan gurguruu barbaaddu?`
          : `የ${qty} ኪሎ ቡና ተመዝግቧል። አሁን የአንዱን ኪሎ ዋጋ በስንት ብር መሸጥ ይፈልጋሉ?`;
    } else if (step === 'price') {
      const price = parsedNumber || 420;
      nextStep = 'photo';
      confirmationMessage =
        language === 'om'
          ? `Gatiin kiiloo tokkoo qarshii ${price} ta'uun galmaa'eera. Amma suuraa buna keessanii ifatti kaasaa ergaa.`
          : `የአንዱ ኪሎ ዋጋ ${price} ብር ተመዝግቧል። አሁን የቡና ፍሬዎን ፎቶ አንስተው ይላኩ።`;
    }

    res.json({
      success: true,
      step,
      nextStep,
      transcript: spokenText,
      parsedValue: parsedNumber,
      confirmationMessage,
    });
  } catch (error: any) {
    console.error('[VoiceRoute] Assistant step error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Voice assistant step failed',
    });
  }
});

export default router;
