'use client';

import React from 'react';

export interface ProfileSummaryStat {
  label: string;
  value: React.ReactNode;
  detail?: string;
  tone?: 'gold' | 'green' | 'light';
}

interface ProfileSummaryCardProps {
  avatar?: string | null;
  avatarAlt: string;
  avatarFallback: string;
  name: React.ReactNode;
  badge?: React.ReactNode;
  details?: React.ReactNode;
  actions?: React.ReactNode;
  stats: ProfileSummaryStat[];
}

const valueTone = {
  gold: 'text-gold-300',
  green: 'text-forest-300',
  light: 'text-cream-50',
};

export default function ProfileSummaryCard({
  avatar,
  avatarAlt,
  avatarFallback,
  name,
  badge,
  details,
  actions,
  stats,
}: ProfileSummaryCardProps) {
  const visibleAvatar = avatar && !avatar.includes('bottts/') ? avatar : null;
  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-coffee-800 bg-coffee-950 p-5 text-cream-100 shadow-[0_20px_50px_rgba(22,13,9,0.28)] sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_5%_100%,rgba(34,110,70,0.35),transparent_42%),radial-gradient(ellipse_at_100%_0%,rgba(196,46,30,0.22),transparent_40%)]" />
      <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <div className="h-[68px] w-[68px] shrink-0 rounded-2xl border-2 border-gold-400 bg-coffee-800 p-1 shadow-lg sm:h-20 sm:w-20">
            {visibleAvatar ? (
              <img src={visibleAvatar} alt={avatarAlt} className="h-full w-full rounded-xl bg-coffee-900 object-cover" />
            ) : (
              <div role="img" aria-label={avatarAlt} className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-forest-700 to-coffee-900 text-2xl font-black tracking-wide text-gold-300">
                {avatarFallback}
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-cream-50 sm:text-2xl">{name}</h1>
              {badge}
            </div>
            {details && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coffee-300">{details}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5 xl:max-w-[48%] xl:justify-end">{actions}</div>}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
            <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-coffee-300">{stat.label}</span>
            <div className={`mt-2 text-xl font-extrabold tracking-tight sm:text-2xl ${valueTone[stat.tone || 'light']}`}>{stat.value}</div>
            {stat.detail && <span className="mt-1.5 block text-[10px] font-medium text-forest-200">{stat.detail}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
