import { config } from '../config';
import { REFERENCE_PRICES } from '../constants/coffeePrices';

/**
 * Photo grading with Gemini vision, called directly from Node so the server does not need Python.
 * Returns the same shape as buna-fair-price/grader/grader.py (GradeResult.to_dict()).
 */

export const ECX_COFFEE_GRADES = [
  'Washed G1', 'Washed G2', 'Washed G3', 'Washed G4', 'Washed G5',
  'Natural G1', 'Natural G2', 'Natural G3', 'Natural G4', 'Natural G5',
  'Specialty Q1', 'Specialty Q2', 'Under Grade',
] as const;

export type EcxGradeTier = (typeof ECX_COFFEE_GRADES)[number];

export interface CoffeeGradeResult {
  grade_tier: EcxGradeTier;
  processing_type: string;
  grade_number: number;
  defect_percentage: number;
  color_quality: string;
  uniformity_score: number;
  moisture_level: string;
  confidence: string;
  is_fallback: boolean;
  provider: string;
  /** 'primary' when GEMINI_MODEL answered, 'fallback' when the lighter backup model did. */
  model_role: 'primary' | 'fallback';
  primary_model: string;
  /** Fields the model did not return; their values are defaults, not AI output. */
  fallback_fields: string[];
  estimated_price_min_etb: number | null;
  estimated_price_max_etb: number | null;
  summary_english: string;
  sorting_advice_english: string;
  tips_oromo: string[];
  tips_amharic: string[];
  processing_time_ms: number;
}

export class NotCoffeeImageError extends Error {
  statusCode = 422;
  constructor(reason: string) {
    super(`This photo does not look like coffee beans (${reason}). Take a close-up photo of green or roasted beans on a plain surface.`);
  }
}

const GRADING_PROMPT = `Analyze this image according to Ethiopian Commodity Exchange (ECX) coffee grading.

First decide if the photo clearly shows coffee beans, cherries, or a bean sample. People, cups, food, leaves, scenery, or random objects are NOT coffee.

Choose grade_tier from exactly: ${ECX_COFFEE_GRADES.join(', ')}.
Use "Under Grade" when the image is unclear or unsuitable for classification.

WHAT TO LOOK FOR:
- Bean color: dark green (excellent), light green (good), yellowish (fair), brown (poor)
- Uniformity: are beans similar in size and shape?
- Visible defects: broken beans, black beans, insect damage, stones, husks
- Surface texture: smooth (good) vs wrinkled/shriveled (poor)
- Moisture signs: overly pale or chalky color suggests over-drying

Return ONLY this JSON object:
{
  "is_coffee": true,
  "not_coffee_reason": "",
  "grade_tier": "Washed G2",
  "defect_percentage": 8,
  "color_quality": "good",
  "uniformity_score": 7,
  "moisture_level": "normal",
  "confidence": "high",
  "summary_english": "One sentence expert summary of the beans",
  "sorting_advice_english": "One specific actionable sorting tip for the farmer",
  "tips_oromo": ["tip 1 in Afaan Oromoo", "tip 2", "tip 3"],
  "tips_amharic": ["tip 1 in Amharic", "tip 2", "tip 3"]
}

The Oromo and Amharic tips must be practical and specific to what you see.
Be honest. Do not inflate the grade; farmers depend on accurate grading for fair prices.`;

function priceRange(tier: EcxGradeTier): { min: number | null; max: number | null } {
  if (tier === 'Specialty Q1') return { min: REFERENCE_PRICES.washed.Specialty.floor, max: REFERENCE_PRICES.washed.Specialty.ceiling };
  if (tier === 'Specialty Q2') return { min: REFERENCE_PRICES.natural.Specialty.floor, max: REFERENCE_PRICES.natural.Specialty.ceiling };
  const match = /^(Washed|Natural) G([1-5])$/.exec(tier);
  if (!match) return { min: null, max: null };
  const price = REFERENCE_PRICES[match[1].toLowerCase() as 'washed' | 'natural'][`Grade ${match[2]}` as 'Grade 1'];
  return { min: price.floor, max: price.ceiling };
}

function parseJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Gemini returned an unreadable grading response.');
  }
}

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 3) : [];

/** Gemini is busy, down, or not configured; the farmer can enter the grade and price manually. */
export class AiUnavailableError extends Error {
  statusCode = 503;
}

const SYSTEM_INSTRUCTION = 'You are an Ethiopian Commodity Exchange coffee grader. Reply with valid JSON only.';
const MIN_ATTEMPT_MS = 3000;
const FALLBACK_ATTEMPT_MS = 40000;

async function callGemini(model: string, apiKey: string, image: Buffer, mimeType: string, timeoutMs: number): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: image.toString('base64') } }, { text: GRADING_PROMPT }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json' },
      }),
    }
  );
  if (!response.ok) {
    const detail: any = await response.json().catch(() => ({}));
    throw new Error(`HTTP ${response.status}: ${detail?.error?.message || 'no details'}`);
  }
  const payload: any = await response.json();
  return payload?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

/** Tries each key on one model until one answers or the stage deadline passes. */
async function tryModel(model: string, image: Buffer, mimeType: string, stageDeadline: number, maxAttemptMs: number): Promise<any | null> {
  for (const apiKey of config.geminiApiKeys) {
    const remaining = stageDeadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) return null;
    try {
      return parseJson(await callGemini(model, apiKey.value, image, mimeType, Math.min(remaining, maxAttemptMs)));
    } catch (err: any) {
      console.warn(`[Grader] ${model} ${apiKey.name} failed: ${String(err.message).split('\n')[0]}`);
    }
  }
  return null;
}

/**
 * The main model gets GEMINI_PRIMARY_MS across all keys; the lighter fallback model gets the rest of
 * GEMINI_TIMEOUT_MS. Returns null when neither answers, so the farmer grades manually.
 */
async function askGemini(image: Buffer, mimeType: string): Promise<{ data: any; model: string } | null> {
  const deadline = Date.now() + config.geminiTimeoutMs;
  const primaryDeadline = Math.min(deadline, Date.now() + config.geminiPrimaryMs);
  const primary = await tryModel(config.geminiModel, image, mimeType, primaryDeadline, config.geminiPrimaryMs);
  if (primary) return { data: primary, model: config.geminiModel };

  const fallbackModel = config.geminiFallbackModel;
  if (!fallbackModel || fallbackModel === config.geminiModel) return null;
  const fallback = await tryModel(fallbackModel, image, mimeType, deadline, FALLBACK_ATTEMPT_MS);
  return fallback ? { data: fallback, model: fallbackModel } : null;
}

export async function gradeCoffeeImage(image: Buffer, mimeType: string): Promise<CoffeeGradeResult> {
  const started = Date.now();
  if (!config.geminiApiKeys.length) {
    throw new AiUnavailableError('AI grading is not configured (GEMINI_API_KEY is missing). Enter the grade and price manually.');
  }

  const answer = await askGemini(image, mimeType);
  if (!answer) {
    throw new AiUnavailableError('Gemini is busy or unreachable. Enter the grade and price yourself, or try again in a minute.');
  }
  const { data, model } = answer;

  if (data.is_coffee === false) throw new NotCoffeeImageError(String(data.not_coffee_reason || 'no beans visible'));

  const validTier = (ECX_COFFEE_GRADES as readonly string[]).includes(data.grade_tier);
  const tier: EcxGradeTier = validTier ? data.grade_tier : 'Under Grade';
  const gradeMatch = /G([1-5])$/.exec(tier);
  const prices = priceRange(tier);

  const isNumber = (value: unknown) => value !== null && value !== '' && Number.isFinite(Number(value));
  const isText = (value: unknown) => typeof value === 'string' && value.trim() !== '';
  const fallbackFields = [
    !validTier && 'grade_tier',
    !isNumber(data.defect_percentage) && 'defect_percentage',
    !isText(data.color_quality) && 'color_quality',
    !isNumber(data.uniformity_score) && 'uniformity_score',
    !isText(data.moisture_level) && 'moisture_level',
    !isText(data.confidence) && 'confidence',
    !isText(data.summary_english) && 'summary_english',
    !isText(data.sorting_advice_english) && 'sorting_advice_english',
    !asStrings(data.tips_oromo).length && 'tips_oromo',
    !asStrings(data.tips_amharic).length && 'tips_amharic',
  ].filter((field): field is string => Boolean(field));
  if (fallbackFields.length) console.warn(`[Grader] ${model} did not return: ${fallbackFields.join(', ')}`);

  return {
    grade_tier: tier,
    processing_type: tier.startsWith('Washed') || tier === 'Specialty Q1' ? 'Washed' : tier === 'Under Grade' ? 'Unknown' : 'Natural',
    grade_number: gradeMatch ? Number(gradeMatch[1]) : tier.startsWith('Specialty') ? 1 : 0,
    defect_percentage: Number(data.defect_percentage) || 0,
    color_quality: String(data.color_quality || 'unknown'),
    uniformity_score: Number(data.uniformity_score) || 0,
    moisture_level: String(data.moisture_level || 'unknown'),
    confidence: String(data.confidence || 'unknown'),
    is_fallback: false,
    provider: model,
    model_role: model === config.geminiModel ? 'primary' : 'fallback',
    primary_model: config.geminiModel,
    fallback_fields: fallbackFields,
    estimated_price_min_etb: prices.min,
    estimated_price_max_etb: prices.max,
    summary_english: String(data.summary_english || ''),
    sorting_advice_english: String(data.sorting_advice_english || ''),
    tips_oromo: asStrings(data.tips_oromo),
    tips_amharic: asStrings(data.tips_amharic),
    processing_time_ms: Date.now() - started,
  };
}
