'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Trophy,
  Award,
  Medal,
  Star,
  ShieldCheck,
  MapPin,
  TrendingUp,
  Building,
  User,
  CheckCircle2,
  Filter,
} from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'farmers' | 'buyers'>('farmers');
  const [selectedWoreda, setSelectedWoreda] = useState<string>('all');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fRes, bRes] = await Promise.all([
          api.getFarmerLeaderboard(selectedWoreda),
          api.getBuyerLeaderboard(),
        ]);
        if (fRes.success && fRes.data) setFarmers(fRes.data);
        if (bRes.success && bRes.data) setBuyers(bRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedWoreda]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-100 text-gold-900 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5 text-gold-700" />
          <span>Jimma Coffee Honor Roll & Transparency Index</span>
        </div>
        <h1 className="text-3xl font-extrabold text-coffee-950 sm:text-4xl tracking-tight">
          Excellence & Ethical Trade Leaderboards
        </h1>
        <p className="text-sm text-coffee-600 max-w-2xl leading-relaxed">
          Celebrating top quality Jimma coffee producers and recognizing commercial buyers who uphold fair prices above the statutory ECX floor.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-coffee-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'farmers'
                ? 'bg-coffee-900 text-gold-300 shadow-md ring-2 ring-coffee-700'
                : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
            }`}
          >
            <Award className="w-4 h-4 text-gold-400" />
            Top Smallholder Farmers (Quality)
          </button>

          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'buyers'
                ? 'bg-coffee-900 text-gold-300 shadow-md ring-2 ring-coffee-700'
                : 'bg-white text-coffee-700 border border-coffee-200 hover:bg-coffee-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-forest-400" />
            Most Fair Commercial Buyers
          </button>
        </div>

        {activeTab === 'farmers' && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-coffee-500" />
            <select
              value={selectedWoreda}
              onChange={(e) => setSelectedWoreda(e.target.value)}
              className="bg-white border border-coffee-200 rounded-xl px-3 py-1.5 text-xs text-coffee-900 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="all">All Woredas</option>
              <option value="Mana">Mana Woreda</option>
              <option value="Gomma">Gomma Woreda</option>
              <option value="Limmu Kosa">Limmu Kosa Woreda</option>
              <option value="Agaro">Agaro Woreda</option>
              <option value="Gera">Gera Woreda</option>
            </select>
          </div>
        )}
      </div>

      {/* Farmers Leaderboard */}
      {activeTab === 'farmers' && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {farmers.slice(0, 3).map((f, index) => {
              const badgeColors = [
                'from-amber-400 to-gold-600 text-coffee-950',
                'from-slate-300 to-slate-400 text-coffee-950',
                'from-amber-600 to-amber-700 text-white',
              ];
              const borderColors = ['border-gold-300', 'border-slate-300', 'border-amber-400'];

              return (
                <div
                  key={f.id}
                  className={`bg-white rounded-2xl p-6 border-2 ${borderColors[index]} shadow-md space-y-4 relative overflow-hidden`}
                >
                  <div
                    className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl bg-gradient-to-r ${badgeColors[index]} text-xs font-black shadow`}
                  >
                    Rank #{f.rank} {f.badge}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <div aria-label={`${f.fullName} initials`} className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-sm font-black text-forest-800">{f.fullName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
                    <div>
                      <h3 className="font-bold text-coffee-950 text-base">{f.fullName}</h3>
                      <span className="text-xs text-coffee-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gold-600" /> {f.woreda}, Jimma
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-3 px-3.5 rounded-xl bg-coffee-50/70 border border-coffee-100">
                    <div>
                      <span className="text-coffee-500 text-[10px] block">Cupping Score:</span>
                      <strong className="text-forest-700 text-base font-extrabold">{f.qualityScore} pts</strong>
                    </div>
                    <div>
                      <span className="text-coffee-500 text-[10px] block">Volume Sold:</span>
                      <strong className="text-coffee-900 text-base font-extrabold">
                        {f.totalKgSold?.toLocaleString()} kg
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-coffee-600">
                    <span>Trades: {f.completedTrades} Completed</span>
                    <span className="text-gold-700 font-bold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-gold-500 text-gold-500" /> {f.averageRating}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-2xl border border-coffee-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-coffee-50/80 text-coffee-700 font-semibold border-b border-coffee-200 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-6">Rank</th>
                    <th className="py-3 px-6">Smallholder Farmer</th>
                    <th className="py-3 px-6">Woreda</th>
                    <th className="py-3 px-6">Quality Cupping Score</th>
                    <th className="py-3 px-6">Volume Traded (Kg)</th>
                    <th className="py-3 px-6">Completed Trades</th>
                    <th className="py-3 px-6 text-right">Farmer Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-coffee-100 text-coffee-900">
                  {farmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-coffee-50/50 transition-colors">
                      <td className="py-4 px-6 font-bold text-coffee-950">#{farmer.rank}</td>
                      <td className="py-4 px-6 font-bold text-coffee-900 flex items-center gap-2">
                        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-50 text-[9px] font-black text-forest-800">{farmer.fullName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                        {farmer.fullName}
                      </td>
                      <td className="py-4 px-6">{farmer.woreda}</td>
                      <td className="py-4 px-6 font-extrabold text-forest-700">{farmer.qualityScore} pts</td>
                      <td className="py-4 px-6 font-bold">{farmer.totalKgSold?.toLocaleString()} kg</td>
                      <td className="py-4 px-6 text-coffee-600">{farmer.completedTrades}</td>
                      <td className="py-4 px-6 text-right">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-900 border border-gold-300">
                          {farmer.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Buyers Leaderboard */}
      {activeTab === 'buyers' && (
        <div className="bg-white rounded-2xl border border-coffee-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-coffee-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-coffee-950 text-base">
                Regional Fair Buyer Certification Rankings
              </h3>
              <p className="text-xs text-coffee-600">
                Audited by Jimma Zone Agriculture Bureau based on compliance with statutory floor benchmarks and prompt farmer payouts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-coffee-50/80 text-coffee-700 font-semibold border-b border-coffee-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-6">Rank</th>
                  <th className="py-3 px-6">Commercial Coffee Buyer</th>
                  <th className="py-3 px-6">Representative</th>
                  <th className="py-3 px-6">Fairness Score</th>
                  <th className="py-3 px-6">Volume Purchased (Kg)</th>
                  <th className="py-3 px-6">Completed Trades</th>
                  <th className="py-3 px-6 text-right">Certification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100 text-coffee-900">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-coffee-50/50 transition-colors">
                    <td className="py-4 px-6 font-bold text-coffee-950">#{buyer.rank}</td>
                    <td className="py-4 px-6 font-bold text-coffee-900">
                      <div>{buyer.companyName}</div>
                      <span className="text-[10px] text-coffee-500 font-normal uppercase tracking-wider">
                        {buyer.businessType?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-coffee-700">{buyer.ownerName}</td>
                    <td className="py-4 px-6">
                      <span className="text-base font-black text-forest-700">{buyer.fairnessScore}%</span>
                      <span className="text-[10px] text-forest-600 block">Above Statutory Floor</span>
                    </td>
                    <td className="py-4 px-6 font-bold">{buyer.totalKgBought?.toLocaleString()} kg</td>
                    <td className="py-4 px-6 text-coffee-600">{buyer.numberCompletedTrades}</td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-forest-100 text-forest-800 border border-forest-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                        {buyer.fairnessBadge || 'Fair Buyer Certified'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
