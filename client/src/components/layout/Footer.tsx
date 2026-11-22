'use client';

import React from 'react';
import NextLink from 'next/link';
import { Coffee, ShieldCheck, Phone, Send, TrendingUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const marketLinks = [
    { href: '/market', label: 'Price Board (2025/26 estimates)' },
    { href: '/leaderboard', label: 'Washing Station Scores' },
    { href: '/marketplace', label: 'Direct Grade Allocations' },
  ];

  const farmerLinks = [
    { href: '/marketplace', label: 'AI Crop Valuation Bot' },
    { href: '/farmer', label: 'Voice Trade Protocol' },
    { href: '/market', label: 'Depots & Logistics' },
  ];

  return (
    <footer className="mt-12 bg-coffee-950 text-cream-100">
      <div className="brand-stripe h-1" />
      <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-10">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cherry-600">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-cream-50">
                GebaBuna
              </span>
            </div>
            <p className="text-sm leading-relaxed text-coffee-300">
              Ethiopian coffee, priced in the open. ECX floors, AI grading, and direct farmer-to-buyer settlement — in Afaan Oromoo, Amharic, and English.
            </p>
            <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-forest-700 bg-forest-900/60 px-2.5 py-1 text-[11px] font-semibold text-forest-200">
              <ShieldCheck className="h-3 w-3" />
              ECX &amp; CTA aligned
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              Market
            </h4>
            {marketLinks.map((l) => (
              <NextLink key={l.label} href={l.href} className="text-sm text-coffee-300 transition-colors hover:text-cream-50">
                {l.label}
              </NextLink>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              Farmers
            </h4>
            {farmerLinks.map((l) => (
              <NextLink key={l.label} href={l.href} className="text-sm text-coffee-300 transition-colors hover:text-cream-50">
                {l.label}
              </NextLink>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
              Reach farmers where they are
            </h4>
            <a
              href="https://t.me/bunajimmabot"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <Send className="h-4 w-4 shrink-0 text-gold-300" />
              <div>
                <div className="text-sm font-semibold text-cream-50">Telegram Bot</div>
                <div className="text-[11px] text-coffee-300">@bunajimmabot</div>
              </div>
            </a>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
              <Phone className="h-4 w-4 shrink-0 text-forest-300" />
              <div>
                <div className="text-sm font-semibold text-cream-50">SMS &amp; IVR</div>
                <div className="text-[11px] text-coffee-300">8422 · free in Jimma Zone</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 text-[11px] text-coffee-400 sm:flex-row">
          <span>© {new Date().getFullYear()} GebaBuna (ገባ ቡና). Addis Ababa, Ethiopia.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-forest-300">
              <TrendingUp className="h-3 w-3" /> Direct farm transparency
            </span>
            <span className="flex items-center gap-1 text-gold-300">
              <ShieldCheck className="h-3 w-3" /> Floor price protected
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
