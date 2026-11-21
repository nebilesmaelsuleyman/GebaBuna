'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MarketPrice } from '../../types';
import { REFERENCE_PRICES, floorFor, formatGrade } from '../../utils/coffeePrices';
import { useLanguage } from '../../context/LanguageContext';
import {
  TrendingUp,
  Scale,
  Calendar,
  AlertCircle,
  HelpCircle,
  Calculator,
  ArrowUpRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

export default function MarketPricesPage() {
  const { t } = useLanguage();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const [selectedProcessing, setSelectedProcessing] = useState<'washed' | 'natural'>('washed');
  const [calcQuantity, setCalcQuantity] = useState<number>(2000);
  const [calcPricePerKg, setCalcPricePerKg] = useState<number>(1150);

  // Dynamic Chart Data for selected Grade & Processing
  const [chartData, setChartData] = useState<any[]>([
    { date: '16 Oct', marketPrice: 1080, floorPrice: 1005, internationalRef: 1255 },
    { date: '23 Oct', marketPrice: 1100, floorPrice: 1025, internationalRef: 1270 },
    { date: '30 Oct', marketPrice: 1115, floorPrice: 1035, internationalRef: 1285 },
    { date: '06 Nov', marketPrice: 1130, floorPrice: 1050, internationalRef: 1295 },
    { date: '13 Nov', marketPrice: 1140, floorPrice: 1060, internationalRef: 1300 },
    { date: 'Today', marketPrice: 1150, floorPrice: 1070, internationalRef: 1300 },
  ]);

  useEffect(() => {
    async function loadPrices() {
      try {
        const res = await api.getMarketPrices();
        if (res.success && res.data) {
          setPrices(res.data);
          const current = res.data.find(
            (p) => p.grade === selectedGrade && p.processing === selectedProcessing
          );
          if (current) {
            setCalcPricePerKg(current.currentPricePerKgETB);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadPrices();
  }, [selectedGrade, selectedProcessing]);

  const handleGradeChange = (grade: string, processing: 'washed' | 'natural', price: number) => {
    setSelectedGrade(grade);
    setSelectedProcessing(processing);
    setCalcPricePerKg(price);

    // Adjust chart trajectory dynamically based on grade
    const base = price - 35;
    setChartData([
      { date: '16 Oct', marketPrice: base, floorPrice: floorFor(base), internationalRef: Math.round(base * 1.13) },
      { date: '23 Oct', marketPrice: base + 20, floorPrice: floorFor(base + 20), internationalRef: Math.round((base + 20) * 1.13) },
      { date: '30 Oct', marketPrice: base + 35, floorPrice: floorFor(base + 35), internationalRef: Math.round((base + 35) * 1.13) },
      { date: '06 Nov', marketPrice: base + 50, floorPrice: floorFor(base + 50), internationalRef: Math.round((base + 50) * 1.13) },
      { date: '13 Nov', marketPrice: price - 10, floorPrice: floorFor(price - 10), internationalRef: Math.round((price - 10) * 1.13) },
      { date: 'Today', marketPrice: price, floorPrice: floorFor(price), internationalRef: Math.round(price * 1.13) },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coffee-100 text-coffee-800 text-xs font-semibold">
          <TrendingUp className="w-3.5 h-3.5 text-coffee-700" />
          <span>Estimated 2025/26 Jimma prices</span>
        </div>
        <h1 className="text-3xl font-extrabold text-coffee-950 sm:text-4xl tracking-tight">
          Jimma Coffee Price Board
        </h1>
        <p className="text-sm text-coffee-700 max-w-3xl leading-relaxed">
          Estimated fair prices, protection floors, and ceilings for Jimma green coffee, derived from ECTA minimum export prices, Jimma FOB ranges, and farm-gate cherry prices (1 USD ≈ 155 ETB). Buyers on Buna cannot bid below the floor.
        </p>
      </div>

      {/* Grade Selector Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-coffee-200">
        {[
          { label: 'Washed Specialty', grade: 'Specialty', processing: 'washed', price: REFERENCE_PRICES.washed.Specialty.current },
          { label: 'Washed G1', grade: 'Grade 1', processing: 'washed', price: REFERENCE_PRICES.washed['Grade 1'].current },
          { label: 'Natural G1', grade: 'Grade 1', processing: 'natural', price: REFERENCE_PRICES.natural['Grade 1'].current },
          { label: 'Washed G2', grade: 'Grade 2', processing: 'washed', price: REFERENCE_PRICES.washed['Grade 2'].current },
          { label: 'Washed G3', grade: 'Grade 3', processing: 'washed', price: REFERENCE_PRICES.washed['Grade 3'].current },
        ].map((item) => {
          const isSelected =
            selectedGrade === item.grade && selectedProcessing === item.processing;
          return (
            <button
              key={item.label}
              onClick={() => handleGradeChange(item.grade, item.processing as any, item.price)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-coffee-900 text-gold-300 shadow-md ring-2 ring-coffee-700'
                  : 'bg-white text-coffee-800 border border-coffee-200 hover:bg-coffee-50'
              }`}
            >
              {item.label} ({item.price} ETB)
            </button>
          );
        })}
      </div>

      {/* Chart & Key Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Historical Price Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-coffee-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-coffee-100">
            <div>
              <h2 className="text-lg font-bold text-coffee-950">
                30-Day Price Movement: Jimma {selectedProcessing} {selectedGrade}
              </h2>
              <span className="text-xs text-coffee-500">
                Estimated reference prices (ETB / kg, green coffee)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-forest-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-forest-600 inline-block" /> Market Price
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Protection floor
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 font-bold hidden sm:flex">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Export Parity
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#438567" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#438567" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e6dc" />
                <XAxis dataKey="date" stroke="#7e3e29" fontSize={11} />
                <YAxis stroke="#7e3e29" fontSize={11} domain={['dataMin - 30', 'dataMax + 20']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#230e09',
                    borderRadius: '12px',
                    color: '#fff',
                    border: '1px solid #7e3e29',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="marketPrice"
                  stroke="#326a51"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMarket)"
                  name="Market Price (ETB/kg)"
                />
                <Line
                  type="monotone"
                  dataKey="floorPrice"
                  stroke="#d4a849"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Protection floor"
                />
                <Line
                  type="monotone"
                  dataKey="internationalRef"
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  name="Export Parity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-coffee-50 border border-coffee-200 text-center text-xs">
            <div>
              <span className="text-coffee-600 block">Current Benchmark</span>
              <span className="text-base font-extrabold text-forest-700">{calcPricePerKg} ETB/kg</span>
            </div>
            <div>
              <span className="text-coffee-600 block">Statutory Floor</span>
              <span className="text-base font-extrabold text-amber-700">{floorFor(calcPricePerKg)} ETB/kg</span>
            </div>
            <div>
              <span className="text-coffee-600 block">5-Week Trend (est.)</span>
              <span className="text-base font-extrabold text-forest-600">
                {(() => {
                  const first = chartData[0]?.marketPrice;
                  const last = chartData[chartData.length - 1]?.marketPrice;
                  if (!first || !last) return '—';
                  const pct = Math.round(((last - first) / first) * 1000) / 10;
                  return `${pct > 0 ? '+' : ''}${pct}%`;
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Live Crop Payout Calculator */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-coffee-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-coffee-100">
            <div className="p-2 rounded-lg bg-gold-100 text-gold-700">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-coffee-950 text-base">{t('priceCalculator')}</h3>
              <p className="text-xs text-coffee-600">Calculate harvest payout</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-coffee-900 block mb-1">
                Harvest Weight (Kilograms):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(Number(e.target.value))}
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-coffee-500">kg</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-coffee-900 block mb-1">
                Selected Price Benchmark (ETB/kg):
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={calcPricePerKg}
                  onChange={(e) => setCalcPricePerKg(Number(e.target.value))}
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-coffee-500">ETB/kg</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 space-y-2">
              <div className="flex justify-between text-coffee-700">
                <span>Gross Value at Market Rate:</span>
                <span className="font-bold">{(calcQuantity * calcPricePerKg).toLocaleString()} ETB</span>
              </div>
              <div className="flex justify-between text-coffee-700">
                <span>Minimum Protected Floor:</span>
                <span className="font-bold text-amber-800">
                  {(calcQuantity * floorFor(calcPricePerKg)).toLocaleString()} ETB
                </span>
              </div>
              <div className="pt-2 border-t border-forest-200 flex justify-between items-baseline">
                <span className="font-bold text-forest-900">Total Fair Payout:</span>
                <span className="text-xl font-black text-forest-800">
                  {(calcQuantity * calcPricePerKg).toLocaleString()} ETB
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-coffee-100/60 text-coffee-800 text-[11px] flex gap-2">
              <ShieldCheck className="w-4 h-4 text-forest-700 flex-shrink-0 mt-0.5" />
              <span>
                Verified buyers on this platform are prohibited from bidding below the protected minimum of{' '}
                <strong className="text-coffee-950">{floorFor(calcPricePerKg)} ETB/kg</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Benchmark Table */}
      <div className="bg-white rounded-2xl border border-coffee-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-coffee-950 text-base">
              All grades · estimated 2025/26
            </h3>
            <span className="text-xs text-coffee-600">
              Updated daily via Ethiopian Commodity Exchange (Jimma Branch)
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-semibold">
            Status: Active Floor Enforcement
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-coffee-50/80 text-coffee-700 font-semibold border-b border-coffee-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-6">Coffee Specification</th>
                <th className="py-3 px-6">Processing</th>
                <th className="py-3 px-6">Grade</th>
                <th className="py-3 px-6">Floor Price (Minimum)</th>
                <th className="py-3 px-6">Current Benchmark</th>
                <th className="py-3 px-6">Ceiling Price</th>
                <th className="py-3 px-6 text-right">Protection Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-100 text-coffee-900">
              {prices.map((p) => (
                <tr key={p._id} className="hover:bg-coffee-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-coffee-950">{p.coffeeType}</td>
                  <td className="py-4 px-6 capitalize">
                    <span className="px-2.5 py-0.5 rounded-full bg-coffee-100 text-coffee-800 font-medium">
                      {p.processing}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-semibold">{formatGrade(p.processing, p.grade)}</td>
                  <td className="py-4 px-6 font-bold text-amber-700">
                    {p.floorPricePerKgETB} ETB/kg
                  </td>
                  <td className="py-4 px-6 font-extrabold text-forest-800 text-base">
                    {p.currentPricePerKgETB} ETB/kg
                  </td>
                  <td className="py-4 px-6 text-coffee-600">{p.ceilingPricePerKgETB} ETB/kg</td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1 text-forest-700 font-bold text-xs bg-forest-50 px-2.5 py-1 rounded-full border border-forest-200">
                      <Check className="w-3.5 h-3.5 text-forest-600" /> Statutory Protected
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
