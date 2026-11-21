'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Offer, Trade } from '../../types';
import {
  ShieldCheck,
  Award,
  TrendingUp,
  FileText,
  CheckCircle2,
  Clock,
  Store,
  DollarSign,
  Coffee,
  ArrowRight,
  ChevronRight,
  Printer,
  Download,
  AlertTriangle,
} from 'lucide-react';
import ProfileSummaryCard from '../../components/common/ProfileSummaryCard';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BuyerOfferView {
  _id: string;
  farmerName: string;
  woreda: string;
  lotTitle: string;
  offeredPricePerKg: number;
  marketFloor: number;
  quantityKg: number;
  totalAmountETB: number;
  status: string;
  fairnessGrade: string;
  paymentTerms: string;
}

interface BuyerTradeView {
  _id: string;
  tradeRef: string;
  farmerName: string;
  woreda: string;
  coffeeGrade: string;
  quantityKg: number;
  pricePerKg: number;
  floorPrice: number;
  totalETB: number;
  status: string;
  settlementDate: string;
  createdAt: string;
  reportCard: {
    priceGrade: string;
    premiumAboveFloor: string;
    paymentSpeed: string;
    farmerFeedback: string;
  };
}

export default function BuyerPortalPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [activeOffers, setActiveOffers] = useState<BuyerOfferView[]>([]);
  const [completedTrades, setCompletedTrades] = useState<BuyerTradeView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [offersRes, tradesRes] = await Promise.all([
          api.getOutgoingOffers(),
          api.getTrades(),
        ]);

        if (offersRes.success && offersRes.offers) {
          const viewOffers: BuyerOfferView[] = (offersRes.offers as Offer[]).map((o) => {
            const listing: any = o.listing;
            const farmer: any = o.farmer;
            const buyerProfile: any = o.buyerProfile;
            return {
              _id: o._id,
              farmerName: farmer?.fullName || 'Verified Farmer',
              woreda: listing?.location?.woreda || 'Jimma',
              lotTitle: listing?.coffeeType || listing?.title || 'Coffee Lot',
              offeredPricePerKg: o.offeredPricePerKg,
              marketFloor: o.marketReferencePrice,
              quantityKg: o.offeredQuantityKg,
              totalAmountETB: o.totalAmountETB,
              status: o.status,
              fairnessGrade: buyerProfile?.fairnessScore
                ? buyerProfile.fairnessScore >= 90 ? 'A+' : buyerProfile.fairnessScore >= 80 ? 'A' : 'B'
                : 'A',
              paymentTerms: o.proposedPaymentTerms || 'Payment terms per contract',
            };
          });
          setActiveOffers(viewOffers);
        }

        if (tradesRes.success && tradesRes.trades) {
          const viewTrades: BuyerTradeView[] = (tradesRes.trades as Trade[]).map((t) => {
            const listing: any = t.listing;
            const farmer: any = t.farmer;
            const reportCard = t.reportCard || {};
            const premiumOverFloor = t.agreedPricePerKg - t.marketReferencePrice;
            return {
              _id: t._id,
              tradeRef: t.tradeReference,
              farmerName: farmer?.fullName || 'Verified Farmer',
              woreda: listing?.location?.woreda || 'Jimma',
              coffeeGrade: listing?.grade || 'Grade 1',
              quantityKg: t.agreedQuantityKg,
              pricePerKg: t.agreedPricePerKg,
              floorPrice: t.marketReferencePrice,
              totalETB: t.totalAmountETB,
              status: t.status,
              settlementDate: t.settlementDate || t.createdAt,
              createdAt: t.createdAt,
              reportCard: {
                priceGrade: reportCard.priceFairnessGrade || 'A',
                premiumAboveFloor: `+${premiumOverFloor} ETB/kg`,
                paymentSpeed: reportCard.paymentTimelinessScore >= 90 ? '24 Hours' : reportCard.paymentTimelinessScore >= 80 ? 'Same Day' : '3-5 Days',
                farmerFeedback: reportCard.notes || 'No feedback provided.',
              },
            };
          });
          setCompletedTrades(viewTrades);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load buyer data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const settledTrades = completedTrades.filter((trade) => ['paid', 'completed'].includes(trade.status));
  const procurementByMonth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const trades = settledTrades.filter((trade) => {
      const tradeDate = new Date(trade.settlementDate || trade.createdAt);
      return `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
    });
    return {
      month: date.toLocaleString('en', { month: 'short' }),
      volume: trades.reduce((sum, trade) => sum + (Number(trade.quantityKg) || 0), 0),
      spend: trades.reduce((sum, trade) => sum + (Number(trade.totalETB) || 0), 0),
      benchmark: trades.reduce((sum, trade) => sum + (Number(trade.floorPrice) || 0) * (Number(trade.quantityKg) || 0), 0),
    };
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-1.5 h-12">
            <span className="w-2 h-8 bg-gold-400 rounded-full animate-bounce" />
            <span className="w-2 h-10 bg-gold-400 rounded-full animate-bounce delay-100" />
            <span className="w-2 h-6 bg-gold-400 rounded-full animate-bounce delay-200" />
          </div>
          <p className="text-coffee-600">Loading buyer portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-coffee-900 mb-2">Error</h2>
        <p className="text-coffee-600 mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 space-y-10">
      {/* Buyer Profile Header */}
      <ProfileSummaryCard
        avatar={user?.avatar}
        avatarAlt="Buyer logo"
        avatarFallback={(user?.fullName || 'Oromia Coffee Farmers Cooperative Union').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        name={user?.fullName || 'Oromia Coffee Farmers Cooperative Union'}
        badge={<span className="flex items-center gap-1 rounded-full bg-forest-600 px-2.5 py-1 text-[11px] font-bold text-white shadow"><ShieldCheck className="h-3.5 w-3.5" />Buyer Account</span>}
        details={<span className="font-bold text-gold-300">Representative: {user?.fullName || 'Buyer account'}</span>}
        actions={<><NextLink
            href="/buyer/profile"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-white/15"
          >Edit buyer profile</NextLink><NextLink
            href="/marketplace"
            className="flex items-center gap-2 rounded-full bg-cherry-600 px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-cherry-500"
          >
            <Store className="w-4 h-4" />
            <span>Browse Open Harvests</span>
          </NextLink></>}
        stats={[
          { label: 'Fairness Score', value: '96%', detail: 'Rank #1 Ethical Buyer', tone: 'green' },
          { label: 'Total Volume Bought', value: <>{completedTrades.reduce((sum, t) => sum + (Number(t.quantityKg) || 0), 0).toLocaleString()} <small className="text-sm font-semibold">kg</small></>, detail: 'Smallholder lots', tone: 'light' },
          { label: 'Trades Above ECX Floor', value: '100%', detail: 'Zero low-ball bids', tone: 'gold' },
          { label: 'Active Offers', value: activeOffers.length, detail: 'Pending farmer response', tone: 'green' },
        ]}
      />

      <section className="rounded-3xl border border-coffee-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5"><h2 className="text-lg font-extrabold text-coffee-950">Procurement performance</h2><p className="mt-1 text-xs text-coffee-600">Settled purchases and spend compared with the ECX reference value.</p></div>
        {settledTrades.length ? <div className="grid gap-8 lg:grid-cols-2">
          <div><p className="mb-2 text-xs font-bold text-coffee-700">Coffee purchased (kg)</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={procurementByMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee7dc" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 10 }} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, 'Volume']} /><Bar dataKey="volume" fill="#397449" radius={[7, 7, 0, 0]} maxBarSize={40} /></BarChart></ResponsiveContainer></div></div>
          <div><p className="mb-2 text-xs font-bold text-coffee-700">Spend vs ECX reference (ETB)</p><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={procurementByMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee7dc" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`]} /><Bar dataKey="benchmark" name="ECX reference" fill="#d7c5a3" radius={[6, 6, 0, 0]} /><Bar dataKey="spend" name="Paid" fill="#c2862e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        </div> : <div className="flex h-40 items-center justify-center rounded-2xl bg-coffee-50 text-center text-sm text-coffee-600">Settled trade history will appear here as you complete purchases.</div>}
      </section>

      {/* Active Submitted Offers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-coffee-950">Active Bids & Offers Sent to Farmers</h2>
            <p className="text-xs text-coffee-600">Track real-time responses from Jimma smallholders.</p>
          </div>
        </div>

        {activeOffers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-coffee-200 p-8 text-center">
            <p className="text-coffee-500 text-sm">No active offers yet. Browse harvests and make your first offer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeOffers.map((offer) => (
              <div
                key={offer._id}
                className="bg-white rounded-2xl border border-coffee-200 p-5 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-coffee-950 text-sm">{offer.lotTitle}</h3>
                    <span className="text-xs text-coffee-600">
                      Farmer: <strong>{offer.farmerName}</strong> ({offer.woreda})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      offer.status === 'accepted'
                        ? 'bg-forest-600 text-white'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {offer.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-coffee-50 border border-coffee-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-coffee-500 text-[10px] block">Offered Rate:</span>
                    <span className="text-lg font-bold text-coffee-950">{offer.offeredPricePerKg} ETB/kg</span>
                    <span className="text-[10px] text-forest-700 block">
                      +{offer.offeredPricePerKg - offer.marketFloor} ETB above floor
                    </span>
                  </div>
                  <div>
                    <span className="text-coffee-500 text-[10px] block">Total Contract:</span>
                    <span className="text-lg font-bold text-forest-800">
                      {(Number(offer.totalAmountETB) || 0).toLocaleString()} ETB
                    </span>
                    <span className="text-[10px] text-coffee-500 block">({offer.quantityKg} kg)</span>
                  </div>
                </div>

                <div className="text-[11px] text-coffee-600">
                  <strong>Terms:</strong> {offer.paymentTerms}
                </div>

                {offer.status === 'accepted' && (
                  <div className="pt-2 border-t border-coffee-100 flex items-center justify-between text-xs">
                    <span className="text-forest-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-forest-600" /> Contract Active
                    </span>
                    <button className="px-3 py-1.5 rounded-lg bg-coffee-900 text-white font-medium text-xs flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download Agreement
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Trades & Farmer Report Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-coffee-950">
              Contract Performance & Smallholder Impact Report Cards
            </h2>
            <p className="text-xs text-coffee-600">
              Official verified receipts logged on the Jimma Regional Agriculture Bureau system.
            </p>
          </div>
        </div>

        {completedTrades.length === 0 ? (
          <div className="bg-white rounded-2xl border border-coffee-200 p-8 text-center">
            <p className="text-coffee-500 text-sm">No completed trades yet. Accepted offers become trades after delivery and payment confirmation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {completedTrades.map((trade) => (
              <div
                key={trade._id}
                className="bg-white rounded-2xl border border-coffee-200 p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gold-700 tracking-wider">
                      {trade.tradeRef}
                    </span>
                    <h3 className="font-bold text-coffee-950 text-sm">
                      {trade.coffeeGrade} ({trade.woreda})
                    </h3>
                    <span className="text-xs text-coffee-600">Farmer: {trade.farmerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 text-[10px] font-black">
                      Grade {trade.reportCard.priceGrade}
                    </span>
                    <span className="text-[10px] text-coffee-400 block mt-1">{trade.settlementDate}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-forest-50/50 border border-forest-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-coffee-600">Total Volume & Payout:</span>
                    <strong className="text-coffee-950">
                      {(Number(trade.quantityKg) || 0).toLocaleString()} kg • {(Number(trade.totalETB) || 0).toLocaleString()} ETB
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-coffee-600">Smallholder Premium Paid:</span>
                    <strong className="text-forest-700 font-bold">{trade.reportCard.premiumAboveFloor}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-coffee-600">Bank Settlement Timeliness:</span>
                    <strong className="text-coffee-950">{trade.reportCard.paymentSpeed}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-coffee-50 border border-coffee-100 text-[11px] italic text-coffee-700">
                  {trade.reportCard.farmerFeedback}
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-coffee-100">
                  <button className="text-xs text-coffee-700 font-semibold hover:text-coffee-950 flex items-center gap-1">
                    <Printer className="w-3.5 h-3.5" /> Print Tax Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
