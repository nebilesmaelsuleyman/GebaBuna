'use client';

import React from 'react';
import NextLink from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  MapPin,
  Play,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { PublicStats } from '../types';

// Estimated 2025/26 green-coffee prices, ETB/kg. Reference = server/src/constants/coffeePrices.ts.
// Broker column assumes roadside collectors pay about 78% of the reference price.
const ecxRows = [
  { origin: 'Jimma G4 · Mana', process: 'Natural', broker: '560', ecx: '720', buna: '745', advantage: '+33%' },
  { origin: 'Jimma G3 · Gomma', process: 'Natural', broker: '650', ecx: '830', buna: '860', advantage: '+32%' },
  { origin: 'Limu G2 · Seka Chekorsa', process: 'Washed', broker: '820', ecx: '1,040', buna: '1,075', advantage: '+31%' },
  { origin: 'Jimma G1 · Agaro', process: 'Natural', broker: '850', ecx: '1,080', buna: '1,120', advantage: '+32%' },
  { origin: 'Limu G1 · Kossa', process: 'Washed', broker: '900', ecx: '1,150', buna: '1,195', advantage: '+33%' },
];

const steps = [
  {
    n: '01',
    title: 'Speak the harvest',
    body: 'A farmer records quantity and asking price in Afaan Oromoo or Amharic. No forms, no literacy barrier.',
  },
  {
    n: '02',
    title: 'Grade the beans',
    body: 'A photo returns an ECX-style grade, defect notes, and a fair price range before a buyer ever sees the lot.',
  },
  {
    n: '03',
    title: 'Hold the floor',
    body: 'Offers under the protection floor are rejected by the server. Payment is tracked against the price the farmer actually accepted.',
  },
];

export default function HomePage() {
  const [stats, setStats] = React.useState<PublicStats | null>(null);

  React.useEffect(() => {
    api.getPublicStats().then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-10 md:px-8 lg:grid-cols-12 lg:pb-20 lg:pt-14">
          <div className="lg:col-span-7">
            <p className="page-kicker">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
              Jimma · Limu · Agaro · Gomma
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-coffee-950 sm:text-5xl lg:text-[3.4rem]">
              Connecting coffee farmers to fair market prices.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-coffee-700 sm:text-lg">
              GebaBuna shows smallholders a fair price and floor for their grade, grades their coffee from a photo, and lets them list a lot by voice — in Afaan Oromoo, Amharic, or English.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <NextLink
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-coffee-950 px-6 py-3.5 text-sm font-bold text-cream-50 shadow-lg transition hover:-translate-y-0.5 hover:bg-coffee-800"
              >
                Open the live demo
                <ArrowRight className="h-4 w-4" />
              </NextLink>
              <NextLink
                href="/market"
                className="inline-flex items-center gap-2 rounded-full border border-coffee-200 bg-white/80 px-6 py-3.5 text-sm font-semibold text-coffee-900 backdrop-blur transition hover:border-coffee-400"
              >
                <TrendingUp className="h-4 w-4 text-forest-600" />
                Today’s price board
              </NextLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                [stats ? stats.farmers.toLocaleString() : '—', 'Registered farmers'],
                [stats ? `${stats.kgTraded.toLocaleString()} kg` : '—', 'Coffee traded on Buna'],
                [
                  stats?.premiumOverReferencePct != null ? `${stats.premiumOverReferencePct > 0 ? '+' : ''}${stats.premiumOverReferencePct}%` : '—',
                  'Paid vs. reference price',
                ],
              ].map(([value, label]) => (
                <div key={label} className="surface px-3 py-3">
                  <dt className="text-xl font-extrabold tracking-tight text-coffee-950">{value}</dt>
                  <dd className="mt-1 text-[11px] leading-snug text-coffee-600">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-coffee-500">
              {stats ? `Live from the Buna database · ${stats.settledTrades} settled trades` : 'Live numbers appear when the Buna server is running.'}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="overflow-hidden rounded-[28px] border border-coffee-200 bg-coffee-950 shadow-[0_30px_80px_rgba(22,13,9,0.22)]">
                <img
                  src="/images/hero-harvest.jpg"
                  alt="Jimma coffee farmers harvesting ripe coffee cherries"
                  className="h-[420px] w-full object-cover sm:h-[480px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-coffee-950 via-coffee-950/10 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-coffee-950 backdrop-blur">
                  <MapPin className="h-3.5 w-3.5 text-forest-600" />
                  Mana woreda · 1,940 m
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/15 bg-coffee-950/80 p-4 text-cream-50 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gold-300">Example lot</p>
                      <p className="mt-1 text-sm font-semibold">Lemma G. · 1,200 kg Natural G4</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold tracking-tight">745</p>
                      <p className="text-[11px] text-coffee-300">ETB / kg · CBE</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-4 top-16 hidden rounded-2xl border border-coffee-200 bg-white px-4 py-3 shadow-card sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-coffee-500">Broker offer</p>
                <p className="mt-1 text-lg font-extrabold text-cherry-700 line-through decoration-cherry-400">560 ETB</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-coffee-200/80 bg-white/70" id="ecx-table">
        <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-700">The gap</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-coffee-950">
                Same lot. Three prices.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-coffee-600">
                Local brokers, the market reference, and a direct Buna bid. Estimated 2025/26 green-coffee prices in ETB per kilogram. The broker column assumes roadside collectors pay about 78% of the reference.
              </p>
            </div>
            <p className="inline-flex items-center gap-2 self-start rounded-full bg-forest-50 px-3 py-2 text-xs font-bold text-forest-800">
              <ShieldCheck className="h-4 w-4" />
              Farmers keep the spread
            </p>
          </div>

          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-coffee-100 text-[11px] uppercase tracking-[0.14em] text-coffee-500">
                    <th className="px-5 py-4 font-semibold">Origin</th>
                    <th className="px-5 py-4 font-semibold">Process</th>
                    <th className="px-5 py-4 font-semibold">Broker</th>
                    <th className="px-5 py-4 font-semibold">Market reference</th>
                    <th className="bg-gold-50/80 px-5 py-4 font-semibold text-gold-800">Buna direct</th>
                    <th className="px-5 py-4 text-right font-semibold">Lift</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-coffee-900">
                  {ecxRows.map((row) => (
                    <tr key={row.origin} className="border-b border-coffee-100 last:border-0">
                      <td className="px-5 py-4 font-semibold">{row.origin}</td>
                      <td className="px-5 py-4 text-coffee-600">{row.process}</td>
                      <td className="px-5 py-4 font-mono text-cherry-700 line-through decoration-cherry-300">{row.broker}</td>
                      <td className="px-5 py-4 font-mono">{row.ecx}</td>
                      <td className="bg-gold-50/50 px-5 py-4 font-mono font-bold text-gold-800">{row.buna}</td>
                      <td className="px-5 py-4 text-right">
                        <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-bold text-forest-800">{row.advantage}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16 md:px-8" id="innovations">
        <div className="mb-10 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-700">How a lot moves</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-coffee-950">Ninety seconds, from voice to a protected bid.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.n} className="surface p-6">
              <span className="font-mono text-xs font-bold text-gold-700">{step.n}</span>
              <h3 className="mt-3 text-lg font-bold text-coffee-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-coffee-600">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <article className="surface flex flex-col justify-between p-6 lg:col-span-7">
            <div>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-800">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-coffee-950">Photo grading before the negotiation starts</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-coffee-600">
                Screen size, defects, color, and moisture become a grade and a price band. The farmer sees the number before accepting anyone's offer.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-coffee-950 px-4 py-3 text-cream-50">
              <div>
                <p className="text-[11px] text-coffee-300">Jimma lot · washed</p>
                <p className="font-semibold">Grade 2 · screen 16+</p>
              </div>
              <p className="text-lg font-extrabold text-gold-300">1,040 ETB/kg</p>
            </div>
          </article>

          <article className="overflow-hidden rounded-[24px] border border-coffee-800 bg-coffee-950 text-cream-50 lg:col-span-5 flex flex-col justify-between shadow-xl">
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cherry-600 text-white shadow-sm">
                <Play className="h-4 w-4 fill-white translate-x-0.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-cream-50">How Farmers Use GebaBuna</p>
                <p className="text-[11px] text-coffee-300">Watch the direct trade and grading walkthrough</p>
              </div>
            </div>
            <div className="relative aspect-video w-full flex-1 min-h-[240px] bg-black">
              <iframe
                src="https://www.youtube-nocookie.com/embed/UJNDsh-ksbk?rel=0&modestbranding=1"
                title="How Farmers Use GebaBuna Platform"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </article>
        </div>
      </section>

      <section className="border-t border-coffee-200/70 bg-white/60">
        <div className="mx-auto grid max-w-[1200px] gap-4 px-4 py-16 md:px-8 md:grid-cols-2">
          <article className="surface p-7">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-800">
              <Leaf className="h-3.5 w-3.5" /> Farmers
            </p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-coffee-950">Sell without handing the margin to a broker.</h3>
            <ul className="mt-5 space-y-3 text-sm text-coffee-700">
              {['Voice listing in Afaan Oromoo and Amharic', 'A grade and a price before you accept', 'Bids under the floor are rejected'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                  {item}
                </li>
              ))}
            </ul>
            <NextLink href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-coffee-950">
              Enter as a farmer <ArrowRight className="h-4 w-4" />
            </NextLink>
          </article>
          <article className="surface p-7">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-forest-800">
              <ShoppingBag className="h-3.5 w-3.5" /> Buyers
            </p>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-coffee-950">Origin, grade, and a fairness record on every lot.</h3>
            <ul className="mt-5 space-y-3 text-sm text-coffee-700">
              {['Woreda and kebele on the listing', 'Cupping, moisture, and photo grade', 'A public score for paying above the floor'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
                  {item}
                </li>
              ))}
            </ul>
            <NextLink href="/marketplace" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-coffee-950">
              Browse open harvests <ArrowRight className="h-4 w-4" />
            </NextLink>
          </article>
        </div>
      </section>
    </div>
  );
}

