'use client';

import React from 'react';
import { Cpu } from 'lucide-react';

/** True when a value shown for this field is a default rather than something the AI returned. */
export function isFallbackField(result: any, key: string): boolean {
  if (!result || result.provider === 'manual') return false;
  if (result.provider === 'sample') return true;
  const value = result[key];
  const missing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  return missing || Boolean(result.fallback_fields?.includes(key));
}

export function FallbackTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 align-middle text-[9px] font-extrabold uppercase tracking-wide text-amber-800">
      fallback
    </span>
  );
}

/** Which model produced the grade: main model, backup model, the farmer, or demo sample data. */
export function GradedByBadge({ result }: { result: any }) {
  const provider: string = result?.provider || '';
  let text: string;
  let tone: string;
  if (provider === 'manual') {
    text = 'Entered by the farmer (no AI)';
    tone = 'bg-coffee-100 text-coffee-900';
  } else if (provider === 'sample') {
    text = 'Demo sample values (fallback, not AI)';
    tone = 'bg-amber-100 text-amber-900';
  } else if (!provider) {
    text = 'Model not reported (fallback values)';
    tone = 'bg-amber-100 text-amber-900';
  } else if (result.model_role === 'fallback') {
    text = `Graded by ${provider} · backup model${result.primary_model ? ` (${result.primary_model} was busy)` : ''}`;
    tone = 'bg-amber-100 text-amber-900';
  } else {
    text = `Graded by ${provider} · main model`;
    tone = 'bg-white text-forest-900';
  }
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm ${tone}`}>
      <Cpu className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}

interface PriceRangeEditorProps {
  min: number | null | undefined;
  max: number | null | undefined;
  value: number;
  onChange: (price: number) => void;
  gradeLabel?: string;
}

/** Asking price input bounded by the ECX range for the grade; warns outside the range. */
export function PriceRangeEditor({ min, max, value, onChange, gradeLabel }: PriceRangeEditorProps) {
  const hasRange = Boolean(min && max);
  const below = hasRange && value > 0 && value < (min as number);
  const above = hasRange && value > (max as number);

  return (
    <div className="space-y-2 rounded-2xl border border-gold-200 bg-gold-50 p-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-extrabold text-gold-900">Your asking price (ETB per kg)</span>
        {hasRange && (
          <span className="text-gold-800">
            ECX range{gradeLabel ? ` for ${gradeLabel}` : ''}: <strong>{min!.toLocaleString()} – {max!.toLocaleString()}</strong>
          </span>
        )}
      </div>
      <input
        type="number"
        min={1}
        value={value || ''}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-xl border border-gold-300 bg-white px-3 py-2.5 text-lg font-black text-coffee-950 outline-none focus:border-forest-500"
      />
      {hasRange && (
        <input
          type="range"
          min={min as number}
          max={max as number}
          step={5}
          value={Math.min(Math.max(value || (min as number), min as number), max as number)}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-forest-600"
          aria-label="Asking price within the ECX range"
        />
      )}
      {!hasRange && <p className="text-[11px] text-coffee-600">No ECX price range exists for this grade; set the price you agree with buyers.</p>}
      {below && <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">Below the ECX floor of {min!.toLocaleString()} ETB/kg. You would be selling under the protected price.</p>}
      {above && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">Above the ECX ceiling of {max!.toLocaleString()} ETB/kg. Buyers are unlikely to accept this.</p>}
    </div>
  );
}

/** Starting price inside the ECX range: the midpoint, rounded to 5 ETB. */
export function midpointPrice(min: number | null | undefined, max: number | null | undefined, fallback: number): number {
  if (!min || !max) return fallback;
  return Math.round((min + max) / 2 / 5) * 5;
}
