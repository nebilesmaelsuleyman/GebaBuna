/**
 * Estimated 2025/26 Jimma green-coffee prices, ETB per kg.
 * Mirror of server/src/constants/coffeePrices.ts, used for offline fallbacks and demo data.
 * Sources: ECTA minimum export floors (Oct 2026), Jimma FOB ranges, farm-gate cherry
 * 120–185 ETB/kg, at 1 USD ≈ 155 ETB.
 */

export type Processing = 'washed' | 'natural';
export type Grade = 'Specialty' | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5';

export const REFERENCE_PRICES: Record<Processing, Record<Grade, { current: number; floor: number; ceiling: number }>> = {
  washed: {
    Specialty: { current: 1260, floor: 1170, ceiling: 1380 },
    'Grade 1': { current: 1150, floor: 1070, ceiling: 1250 },
    'Grade 2': { current: 1040, floor: 965, ceiling: 1130 },
    'Grade 3': { current: 900, floor: 835, ceiling: 980 },
    'Grade 4': { current: 790, floor: 735, ceiling: 860 },
    'Grade 5': { current: 680, floor: 630, ceiling: 740 },
  },
  natural: {
    Specialty: { current: 1200, floor: 1115, ceiling: 1310 },
    'Grade 1': { current: 1080, floor: 1005, ceiling: 1170 },
    'Grade 2': { current: 960, floor: 895, ceiling: 1040 },
    'Grade 3': { current: 830, floor: 770, ceiling: 900 },
    'Grade 4': { current: 720, floor: 670, ceiling: 790 },
    'Grade 5': { current: 620, floor: 575, ceiling: 680 },
  },
};

export const FLOOR_RATIO = 0.93;

/** Farmer protection floor: offers below this are rejected by the server. */
export function floorFor(referencePrice: number): number {
  return Math.round((referencePrice * FLOOR_RATIO) / 5) * 5;
}

/**
 * ECX-style display name, e.g. ('washed', 'Grade 1') -> 'Washed G1', ('natural', 'Specialty') -> 'Natural Specialty'.
 * The API stores grade and processing separately; this is the only format shown to users.
 */
export function formatGrade(processing: string | undefined, grade: string | undefined): string {
  if (!grade) return '—';
  if (/^(Washed|Natural|Specialty Q|Under)/i.test(grade)) return grade;
  const proc = processing ? processing.charAt(0).toUpperCase() + processing.slice(1).toLowerCase() : '';
  const short = grade.replace(/^Grade\s*/i, 'G');
  return proc ? `${proc} ${short}` : short;
}

/** ECX grades a farmer can list; matches the grader's grade_tier values except "Under Grade". */
export const ECX_GRADE_OPTIONS = [
  'Washed G1', 'Washed G2', 'Washed G3', 'Washed G4', 'Washed G5',
  'Natural G1', 'Natural G2', 'Natural G3', 'Natural G4', 'Natural G5',
  'Specialty Q1', 'Specialty Q2',
] as const;

export type EcxGradeOption = (typeof ECX_GRADE_OPTIONS)[number];

/** Listing fields and reference prices for an ECX grade. Specialty Q1 is washed, Q2 is natural. */
export function gradeReference(tier: EcxGradeOption) {
  const processing: Processing = tier.startsWith('Washed') || tier === 'Specialty Q1' ? 'washed' : 'natural';
  const grade: Grade = tier.startsWith('Specialty') ? 'Specialty' : (`Grade ${tier.slice(-1)}` as Grade);
  return { processing, grade, ...REFERENCE_PRICES[processing][grade] };
}

export const PRICE_SOURCE_NOTE = 'Estimated 2025/26 Jimma price (ECTA floors, FOB ranges; 1 USD ≈ 155 ETB)';
