'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { formatGrade } from '../../utils/coffeePrices';
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
  RotateCcw,
  Send,
  History,
  AlertCircle,
} from 'lucide-react';
import ProfileSummaryCard from '../../components/common/ProfileSummaryCard';
import TraceabilityModal from '../../components/common/TraceabilityModal';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface BuyerOfferView {
  _id: string;
  farmerId: string;
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
  round: number;
  maxRounds: number;
  currentTurn: 'farmer' | 'buyer';
  lastActionBy: 'farmer' | 'buyer';
  negotiationHistory: any[];
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
  const [fairnessScore, setFairnessScore] = useState<number | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('verified');
  const [error, setError] = useState<string | null>(null);

  // Counter & Traceability States
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');
  const [counterSubmitting, setCounterSubmitting] = useState<boolean>(false);
  const [expandedHistoryOfferId, setExpandedHistoryOfferId] = useState<string | null>(null);
  const [traceabilityTargetUser, setTraceabilityTargetUser] = useState<{ id: string; name: string } | null>(null);

  const handleAcceptOffer = async (id: string) => {
    try {
      await api.acceptOffer(id);
      setActiveOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'accepted' } : o))
      );
    } catch (err: any) {
      alert(err.message || 'Could not accept this offer.');
    }
  };

  const handleRejectOffer = async (id: string) => {
    try {
      await api.rejectOffer(id);
      setActiveOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'rejected' } : o))
      );
    } catch (err: any) {
      alert(err.message || 'Could not reject this offer.');
    }
  };

  const handleCounterOffer = async (id: string) => {
    const priceNum = Number(counterPrice);
    if (!priceNum || priceNum <= 0) {
      alert('Please enter a valid counter price per kg (ETB).');
      return;
    }
    try {
      setCounterSubmitting(true);
      const res = await api.counterOffer(id, {
        counterPricePerKg: priceNum,
        counterMessage: counterMessage || undefined,
      });
      if (res.success && res.offer) {
        setActiveOffers((prev) =>
          prev.map((o) =>
            o._id === id
              ? {
                  ...o,
                  status: 'countered',
                  offeredPricePerKg: priceNum,
                  totalAmountETB: priceNum * o.quantityKg,
                  round: res.offer.round || (o.round || 1) + 1,
                  currentTurn: 'farmer',
                  lastActionBy: 'buyer',
                  negotiationHistory: res.offer.negotiationHistory || o.negotiationHistory,
                }
              : o
          )
        );
        setCounteringOfferId(null);
        setCounterPrice('');
        setCounterMessage('');
      }
    } catch (err: any) {
      alert(err.message || 'Could not submit counter-offer.');
    } finally {
      setCounterSubmitting(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [offersRes, tradesRes] = await Promise.all([
          api.getOutgoingOffers(),
          api.getTrades(),
        ]);
        api.getMe().then((me: any) => setFairnessScore(me.profile?.fairnessScore ?? null)).catch(() => setFairnessScore(null));
        api.getBuyerProfile().then((res: any) => {
          if (res.profile?.verificationStatus) {
            setVerificationStatus(res.profile.verificationStatus);
          }
        }).catch(() => {});

        if (offersRes.success && offersRes.offers) {
          const viewOffers: BuyerOfferView[] = (offersRes.offers as any[]).map((o) => {
            const listing: any = o.listing;
            const farmer: any = o.farmer;
            const buyerProfile: any = o.buyerProfile;
            const activePrice = o.currentPricePerKg || o.counterPricePerKg || o.offeredPricePerKg;
            const activeQty = o.currentQuantityKg || o.counterQuantityKg || o.offeredQuantityKg || o.quantityKg || 1;
            return {
              _id: o._id,
              farmerId: farmer?._id || farmer || '',
              farmerName: farmer?.fullName || 'Verified Farmer',
              woreda: listing?.location?.woreda || 'Jimma',
              lotTitle: listing?.coffeeType || listing?.title || 'Coffee Lot',
              offeredPricePerKg: activePrice,
              marketFloor: o.marketPriceAtOffer || o.marketReferencePrice || 0,
              quantityKg: activeQty,
              totalAmountETB: activePrice * activeQty,
              status: o.status,
              fairnessGrade: buyerProfile?.fairnessScore
                ? buyerProfile.fairnessScore >= 90 ? 'A+' : buyerProfile.fairnessScore >= 80 ? 'A' : 'B'
                : 'A',
              paymentTerms: o.proposedPaymentTerms || o.message || 'Payment terms per contract',
              round: o.round || 1,
              maxRounds: o.maxRounds || 3,
              currentTurn: o.currentTurn || (o.status === 'countered' ? (o.counteredBy === 'farmer' ? 'buyer' : 'farmer') : 'farmer'),
              lastActionBy: o.lastActionBy || o.counteredBy || 'buyer',
              negotiationHistory: o.negotiationHistory || [],
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
              coffeeGrade: formatGrade(listing?.processing, listing?.grade),
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

  const tradesAtOrAboveFloor = completedTrades.filter((trade) => trade.pricePerKg >= trade.floorPrice).length;
  const floorSharePct = completedTrades.length ? Math.round((tradesAtOrAboveFloor / completedTrades.length) * 100) : null;
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
      {/* Pending Verification Notice Banner */}
      {verificationStatus !== 'verified' && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                <span>Account Status: {(verificationStatus || 'pending').toUpperCase()} REVIEW</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                  Awaiting System Admin Approval
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your buyer profile is currently pending official verification by the System Admin. Under regional coffee export standards, market purchasing and offer placement require an approved Trade License & TIN. Please complete any remaining details and upload your documents.
              </p>
            </div>
          </div>
          <NextLink
            href="/buyer/profile"
            className="px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>Complete Profile & Upload Documents →</span>
          </NextLink>
        </div>
      )}

      {/* Buyer Profile Header */}
      <ProfileSummaryCard
        avatar={user?.avatar}
        avatarAlt="Buyer logo"
        avatarFallback={(user?.fullName || 'Oromia Coffee Farmers Cooperative Union').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        name={user?.fullName || 'Oromia Coffee Farmers Cooperative Union'}
        badge={<span className="flex items-center gap-1 rounded-full bg-forest-600 px-2.5 py-1 text-[11px] font-bold text-white shadow"><ShieldCheck className="h-3.5 w-3.5" />Buyer Account</span>}
        details={<span className="font-bold text-gold-300">Representative: {user?.fullName || 'Buyer account'}</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <NextLink
              href="/buyer/profile"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-white/15"
            >
              Edit buyer profile
            </NextLink>
            <NextLink
              href="/marketplace"
              className="flex items-center gap-2 rounded-full bg-cherry-600 px-5 py-3 text-xs font-bold text-white shadow-md transition-colors hover:bg-cherry-500"
            >
              <Store className="w-4 h-4" />
              <span>Browse Open Harvests</span>
            </NextLink>
          </div>
        }
        stats={[
          { label: 'Fairness Score', value: fairnessScore != null ? `${Math.round(fairnessScore)}%` : '—', detail: 'From your trades and farmer reviews', tone: 'green' },
          { label: 'Total Volume Bought', value: `${completedTrades.reduce((sum, t) => sum + (Number(t.quantityKg) || 0), 0).toLocaleString()} kg`, detail: 'Smallholder lots', tone: 'light' },
          { label: 'Trades At or Above Floor', value: floorSharePct != null ? `${floorSharePct}%` : '—', detail: `${tradesAtOrAboveFloor} of ${completedTrades.length} trades`, tone: 'gold' },
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
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                  offer.status === 'accepted'
                    ? 'border-forest-400 bg-forest-50/20'
                    : offer.status === 'rejected'
                    ? 'border-red-300 opacity-60'
                    : 'border-coffee-200 hover:shadow-md'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-coffee-950 text-sm">{offer.lotTitle}</h3>
                    <span className="text-xs text-coffee-600 block mt-0.5">
                      Farmer: <strong>{offer.farmerName}</strong> ({offer.woreda})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-coffee-950 text-gold-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-coffee-800">
                      <RotateCcw className="w-3 h-3 text-gold-400" />
                      Round {offer.round || 1}/3
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        offer.status === 'accepted'
                          ? 'bg-forest-600 text-white'
                          : offer.status === 'rejected'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {offer.status}
                    </span>
                  </div>
                </div>

                {/* Farmer Traceability Button */}
                {offer.farmerId && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setTraceabilityTargetUser({
                          id: offer.farmerId,
                          name: offer.farmerName,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 text-[11px] font-bold transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
                      Farmer Traceability & Past History
                    </button>
                  </div>
                )}

                {/* Multi-Round Progress Tracker */}
                <div className="p-2.5 rounded-xl bg-coffee-50 border border-coffee-200/80 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-coffee-600">
                    <span>Negotiation Protocol (Max 3 Rounds)</span>
                    <span className="text-coffee-900 font-extrabold">Turn {offer.round || 1} of 3</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        (offer.round || 1) >= 1
                          ? 'bg-coffee-900 text-cream-50 shadow-xs'
                          : 'bg-coffee-200/50 text-coffee-500'
                      }`}
                    >
                      R1: Your Bid
                    </div>
                    <div
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        (offer.round || 1) >= 2
                          ? 'bg-coffee-900 text-cream-50 shadow-xs'
                          : 'bg-coffee-200/50 text-coffee-500'
                      }`}
                    >
                      R2: Farmer Counter
                    </div>
                    <div
                      className={`p-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        (offer.round || 1) >= 3
                          ? 'bg-amber-700 text-cream-50 shadow-xs ring-1 ring-amber-400'
                          : 'bg-coffee-200/50 text-coffee-500'
                      }`}
                    >
                      R3: Final Turn
                    </div>
                  </div>
                </div>

                {/* Price & Contract Value */}
                <div className="p-3.5 rounded-xl bg-coffee-50 border border-coffee-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-coffee-500 text-[10px] block">
                      {offer.status === 'countered' && offer.lastActionBy === 'farmer'
                        ? "Farmer's Counter Price:"
                        : 'Active Proposed Rate:'}
                    </span>
                    <span className="text-lg font-bold text-coffee-950">
                      {offer.offeredPricePerKg} ETB/kg
                    </span>
                    <span className="text-[10px] text-forest-700 block">
                      +{offer.offeredPricePerKg - offer.marketFloor} ETB above ECX reference
                    </span>
                  </div>
                  <div>
                    <span className="text-coffee-500 text-[10px] block">Total Contract:</span>
                    <span className="text-lg font-bold text-forest-800">
                      {(Number(offer.totalAmountETB) || 0).toLocaleString()} ETB
                    </span>
                    <span className="text-[10px] text-coffee-500 block">
                      ({offer.quantityKg?.toLocaleString()} kg)
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-coffee-600">
                  <strong>Terms:</strong> {offer.paymentTerms}
                </div>

                {/* Expandable Negotiation Timeline */}
                {offer.negotiationHistory && offer.negotiationHistory.length > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryOfferId(
                          expandedHistoryOfferId === offer._id ? null : offer._id
                        )
                      }
                      className="text-[11px] font-bold text-coffee-700 hover:text-coffee-950 flex items-center gap-1 transition-colors"
                    >
                      <History className="w-3 h-3 text-coffee-500" />
                      {expandedHistoryOfferId === offer._id
                        ? 'Hide Negotiation Timeline'
                        : `View Negotiation Timeline (${offer.negotiationHistory.length} turns)`}
                    </button>

                    {expandedHistoryOfferId === offer._id && (
                      <div className="mt-2 p-3 rounded-xl bg-coffee-50/70 border border-coffee-200 space-y-2 text-[11px]">
                        {offer.negotiationHistory.map((step: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between border-b border-coffee-200/50 pb-1.5 last:border-0 last:pb-0"
                          >
                            <div>
                              <span className="font-bold text-coffee-900">
                                {step.senderName ||
                                  (step.senderRole === 'buyer' ? 'You (Buyer)' : 'Farmer')}
                                :
                              </span>{' '}
                              <span className="text-coffee-800">
                                {step.action === 'accepted'
                                  ? 'Accepted proposal'
                                  : step.action === 'rejected'
                                  ? 'Declined deal'
                                  : `Offered ${step.pricePerKg} ETB/kg`}
                              </span>
                              {step.message && (
                                <p className="text-[10px] text-coffee-500 italic mt-0.5">
                                  &ldquo;{step.message}&rdquo;
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-coffee-400 whitespace-nowrap ml-2">
                              Round {step.round}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions & Interactive Counter Form */}
                {(offer.status === 'pending' || offer.status === 'countered') && (
                  <div>
                    {offer.currentTurn === 'buyer' ? (
                      <div>
                        {counteringOfferId === offer._id ? (
                          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-3 text-xs">
                            <span className="font-bold text-coffee-950 block">
                              Submit Counter-Offer (Round {(offer.round || 1) + 1} of 3)
                            </span>
                            <p className="text-[11px] text-coffee-600">
                              Propose your adjusted price (Statutory protection floor:{' '}
                              {offer.marketFloor} ETB/kg).
                            </p>
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] font-bold text-coffee-700 block mb-0.5">
                                  Your Counter Price (ETB / Kg):
                                </label>
                                <input
                                  type="number"
                                  placeholder={`e.g. ${offer.offeredPricePerKg - 25}`}
                                  value={counterPrice}
                                  onChange={(e) => setCounterPrice(e.target.value)}
                                  className="w-full bg-white border border-coffee-300 rounded-lg px-3 py-1.5 text-xs font-bold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-coffee-700 block mb-0.5">
                                  Counter Note / Justification (Optional):
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Direct pickup at Mana warehouse, immediate payment"
                                  value={counterMessage}
                                  onChange={(e) => setCounterMessage(e.target.value)}
                                  className="w-full bg-white border border-coffee-300 rounded-lg px-3 py-1.5 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleCounterOffer(offer._id)}
                                disabled={counterSubmitting}
                                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {counterSubmitting
                                  ? 'Submitting...'
                                  : `Send Counter-Offer (Round ${(offer.round || 1) + 1}/3)`}
                              </button>
                              <button
                                onClick={() => {
                                  setCounteringOfferId(null);
                                  setCounterPrice('');
                                  setCounterMessage('');
                                }}
                                className="px-3.5 py-2 rounded-xl border border-coffee-300 text-coffee-700 text-xs font-semibold hover:bg-coffee-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-2 border-t border-coffee-100">
                            {offer.round >= 3 && (
                              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                                <span>
                                  Final Round (Round 3 of 3 reached): Counter-offers are disabled.
                                  You must Accept or Decline.
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAcceptOffer(offer._id)}
                                className="flex-1 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Accept Farmer&apos;s Counter ({offer.offeredPricePerKg} ETB)
                              </button>

                              {offer.round < 3 ? (
                                <button
                                  onClick={() => {
                                    setCounteringOfferId(offer._id);
                                    setCounterPrice(String(Math.max(offer.marketFloor, offer.offeredPricePerKg - 30)));
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-coffee-950 font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-sm"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Counter-Offer
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-3 py-2 rounded-xl bg-coffee-100 text-coffee-400 font-semibold text-xs cursor-not-allowed border border-coffee-200"
                                  title="Counter limit (3 rounds) reached"
                                >
                                  Counter Limit (3/3)
                                </button>
                              )}

                              <button
                                onClick={() => handleRejectOffer(offer._id)}
                                className="px-3.5 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-coffee-50 border border-coffee-200 text-coffee-700 text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-coffee-500" />
                          Awaiting Farmer&apos;s response (Round {offer.round}/3).
                        </span>
                        <button
                          onClick={() => handleRejectOffer(offer._id)}
                          className="text-[11px] text-red-600 hover:underline font-bold"
                        >
                          Withdraw Offer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {offer.status === 'accepted' && (
                  <div className="pt-2 border-t border-coffee-100 flex items-center justify-between text-xs">
                    <span className="text-forest-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-forest-600" /> Contract Active 🎉
                    </span>
                    <button className="px-3 py-1.5 rounded-lg bg-coffee-900 text-white font-medium text-xs flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Download Agreement
                    </button>
                  </div>
                )}

                {offer.status === 'rejected' && (
                  <div className="p-2 rounded-xl bg-red-50 text-red-800 text-[11px] font-semibold text-center">
                    Negotiation Closed — Deal Declined.
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
              Official verified receipts logged on the System Admin platform.
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

      {/* Farmer Traceability & Past History Modal */}
      {traceabilityTargetUser && (
        <TraceabilityModal
          userId={traceabilityTargetUser.id}
          userName={traceabilityTargetUser.name}
          userRole="farmer"
          onClose={() => setTraceabilityTargetUser(null)}
        />
      )}
    </div>
  );
}
