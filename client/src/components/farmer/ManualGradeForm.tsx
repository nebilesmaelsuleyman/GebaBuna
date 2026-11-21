'use client';

import React, { useState } from 'react';
import { AlertTriangle, ClipboardEdit, RefreshCw } from 'lucide-react';
import { ECX_GRADE_OPTIONS, EcxGradeOption, gradeReference, PRICE_SOURCE_NOTE } from '@/utils/coffeePrices';

export interface ManualGradeResult {
  grade_tier: EcxGradeOption;
  processing_type: 'Washed' | 'Natural';
  grade: string;
  asking_price_etb: number;
  estimated_price_min_etb: number;
  estimated_price_max_etb: number;
  provider: 'manual';
  is_fallback: true;
  photoUrl?: string;
}

interface ManualGradeFormProps {
  title?: string;
  message: string;
  photoUrl?: string;
  initialPrice?: number;
  submitLabel: string;
  onSubmit: (result: ManualGradeResult) => void;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function ManualGradeForm({ title = 'AI is not responding right now', message, photoUrl, initialPrice, submitLabel, onSubmit, onRetry, retrying }: ManualGradeFormProps) {
  const [tier, setTier] = useState<EcxGradeOption>('Washed G2');
  const reference = gradeReference(tier);
  const [price, setPrice] = useState<number>(initialPrice || reference.current);
  const belowFloor = price > 0 && price < reference.floor;

  const changeTier = (next: EcxGradeOption) => {
    setTier(next);
    setPrice(gradeReference(next).current);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!price || price <= 0) return;
    onSubmit({
      grade_tier: tier,
      processing_type: reference.processing === 'washed' ? 'Washed' : 'Natural',
      grade: reference.grade,
      asking_price_etb: price,
      estimated_price_min_etb: reference.floor,
      estimated_price_max_etb: reference.ceiling,
      provider: 'manual',
      is_fallback: true,
      photoUrl,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1 text-xs">
          <p className="text-sm font-extrabold">{title}</p>
          <p>{message}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-coffee-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-coffee-950">
          <ClipboardEdit className="h-4 w-4 text-forest-600" /> Enter grade and price manually
        </div>
        <label className="block text-xs font-bold text-coffee-700">
          ECX grade
          <select
            value={tier}
            onChange={(event) => changeTier(event.target.value as EcxGradeOption)}
            className="mt-1 w-full rounded-xl border border-coffee-200 bg-white px-3 py-2.5 font-medium outline-none focus:border-forest-500"
          >
            {ECX_GRADE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold text-coffee-700">
          Asking price (ETB per kg)
          <input
            type="number"
            min={1}
            required
            value={price || ''}
            onChange={(event) => setPrice(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-coffee-200 px-3 py-2.5 font-medium outline-none focus:border-forest-500"
          />
        </label>
        <p className="text-[11px] text-coffee-600">
          Reference for {tier}: <strong>{reference.floor.toLocaleString()} – {reference.ceiling.toLocaleString()} ETB/kg</strong> (typical {reference.current.toLocaleString()}). {PRICE_SOURCE_NOTE}.
        </p>
        {belowFloor && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            This is below the farmer-protection floor of {reference.floor.toLocaleString()} ETB/kg for {tier}.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} disabled={retrying} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-coffee-300 py-3 text-sm font-semibold text-coffee-800 transition-colors hover:bg-coffee-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} /> {retrying ? 'Trying AI...' : 'Try AI again'}
          </button>
        )}
        <button type="submit" disabled={retrying} className="flex-1 rounded-xl bg-gold-500 py-3 text-sm font-bold text-coffee-950 shadow transition-colors hover:bg-gold-400 disabled:opacity-50">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
