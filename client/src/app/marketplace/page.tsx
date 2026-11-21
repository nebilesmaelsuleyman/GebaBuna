'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Listing, Offer } from '../../types';
import { floorFor, formatGrade } from '../../utils/coffeePrices';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Coffee,
  X,
  Send,
  ShieldCheck,
  ArrowUpDown,
  History,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import VoiceInputButton from '../../components/common/VoiceInputButton';
import TraceabilityModal from '../../components/common/TraceabilityModal';

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { user, role } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedWoreda, setSelectedWoreda] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedProcessing, setSelectedProcessing] = useState<string>('all');
  const [buyerVerificationStatus, setBuyerVerificationStatus] = useState<string | null>(null);

  // Modal State
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [offerPrice, setOfferPrice] = useState<number>(1100);
  const [offerQuantity, setOfferQuantity] = useState<number>(1000);
  const [paymentTerms, setPaymentTerms] = useState<string>('Escrow via Commercial Bank of Ethiopia (CBE)');
  const [deliveryLocation, setDeliveryLocation] = useState<string>('Jimma Central Coffee Warehouse');
  const [offerSuccessMsg, setOfferSuccessMsg] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSubmitting, setOfferSubmitting] = useState<boolean>(false);
  const [traceabilityTargetUser, setTraceabilityTargetUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadListings();
  }, [selectedWoreda, selectedGrade, selectedProcessing]);

  useEffect(() => {
    if (role === 'buyer') {
      api.getBuyerProfile()
        .then((res) => {
          setBuyerVerificationStatus(res.profile?.verificationStatus || 'pending');
        })
        .catch(() => {
          setBuyerVerificationStatus('pending');
        });
    } else {
      setBuyerVerificationStatus(null);
    }
  }, [role]);

  async function loadListings() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedWoreda !== 'all') params.woreda = selectedWoreda;
      if (selectedGrade !== 'all') params.grade = selectedGrade;
      if (selectedProcessing !== 'all') params.processing = selectedProcessing;
      if (search) params.search = search;

      const res = await api.getListings(params);
      if (res.success && res.data) {
        setListings(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenOfferModal = (lot: Listing) => {
    setSelectedListing(lot);
    setOfferPrice(lot.askingPricePerKg);
    setOfferQuantity(lot.quantityKg);
    setOfferSuccessMsg(null);
    setOfferError(null);
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;

    setOfferSubmitting(true);
    setOfferError(null);
    try {
      const offerData = {
        listingId: selectedListing._id,
        offeredPricePerKg: offerPrice,
        quantityKg: offerQuantity,
        message: `${paymentTerms}. Delivery: ${deliveryLocation}`,
        deliveryTerms: 'buyer_pickup',
      };

      await api.createOffer(offerData);
      setOfferSuccessMsg('✓ Offer submitted successfully to farmer! Status is now PENDING negotiation.');
      setTimeout(() => {
        setSelectedListing(null);
        setOfferSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setOfferError(
        err?.status === 401 || err?.status === 403
          ? 'Sign in as a verified buyer to send offers.'
          : err?.message || 'The offer could not be sent.'
      );
    } finally {
      setOfferSubmitting(false);
    }
  };

  const isOfferFair = selectedListing
    ? offerPrice >= floorFor(selectedListing.marketReferencePrice)
    : true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100 text-forest-800 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
            <span>Direct Smallholder Coffee Marketplace</span>
          </div>
          <h1 className="text-3xl font-extrabold text-coffee-950 sm:text-4xl tracking-tight">
            Jimma Certified Coffee Harvests
          </h1>
          <p className="text-sm text-coffee-600 mt-1">
            Browse verified harvest lots from Jimma farmers with price-floor protection.
          </p>
        </div>
      </div>

      {/* Buyer Verification Status Alert */}
      {role === 'buyer' && buyerVerificationStatus && buyerVerificationStatus !== 'verified' && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                <span>Account Status: Pending System Admin Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900">
                  {buyerVerificationStatus}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your buyer account is currently in pending verification. You can browse certified harvests and price floor references, but under regional regulations, price negotiation and offer submissions are restricted until your trade license and TIN are verified by the System Admin.
              </p>
            </div>
          </div>
          <Link
            href="/buyer/profile"
            className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>Complete Profile in Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-coffee-200 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-coffee-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search farmer or variety..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadListings()}
              className="w-full bg-coffee-50/50 border border-coffee-200 rounded-xl pl-9 pr-24 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <VoiceInputButton
                label="Speak"
                className="px-2.5 py-1.5 text-[11px]"
                onTranscript={(text) => setSearch(text)}
              />
            </div>
          </div>

          {/* Woreda Filter */}
          <div>
            <select
              value={selectedWoreda}
              onChange={(e) => setSelectedWoreda(e.target.value)}
              className="w-full bg-coffee-50/50 border border-coffee-200 rounded-xl px-3 py-2 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
            >
              <option value="all">All Jimma Woredas</option>
              <option value="Mana">Mana (Highland Washed)</option>
              <option value="Gomma">Gomma (Sun-Dried Naturals)</option>
              <option value="Limmu Kosa">Limmu Kosa (High Altitude)</option>
              <option value="Gera">Gera (Forest Coffee)</option>
              <option value="Agaro">Agaro (Specialty Micro-lots)</option>
              <option value="Kersa">Kersa</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-coffee-50/50 border border-coffee-200 rounded-xl px-3 py-2 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
            >
              <option value="all">All Grades</option>
              <option value="Specialty">Specialty (cup 85+)</option>
              <option value="Grade 1">G1</option>
              <option value="Grade 2">G2</option>
              <option value="Grade 3">G3</option><option value="Grade 4">G4</option><option value="Grade 5">G5</option>
            </select>
          </div>

          {/* Processing Filter */}
          <div>
            <select
              value={selectedProcessing}
              onChange={(e) => setSelectedProcessing(e.target.value)}
              className="w-full bg-coffee-50/50 border border-coffee-200 rounded-xl px-3 py-2 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
            >
              <option value="all">All Processing Methods</option>
              <option value="washed">Washed</option>
              <option value="natural">Natural (Sun-dried)</option>
              <option value="honey">Honey / Pulped</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="py-20 text-center text-coffee-600 font-semibold">
          <Coffee className="w-8 h-8 animate-bounce mx-auto text-gold-500 mb-2" />
          Loading certified coffee lots...
        </div>
      ) : listings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-coffee-200 space-y-2">
          <p className="font-bold text-coffee-900">No coffee lots match your selected filters.</p>
          <button
            onClick={() => {
              setSelectedWoreda('all');
              setSelectedGrade('all');
              setSelectedProcessing('all');
              setSearch('');
            }}
            className="text-xs text-gold-700 font-bold hover:underline"
          >
            Reset filters to view all lots
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((lot) => (
            <div
              key={lot._id}
              className="bg-white rounded-2xl border border-coffee-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Photo & Badges */}
                <div className="relative h-48 bg-coffee-950 overflow-hidden">
                  <img
                    src={lot.photos[0] || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'}
                    alt={lot.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-coffee-950/80 backdrop-blur-md text-white text-[10px] font-bold">
                      {formatGrade(lot.processing, lot.grade)}
                    </span>
                  </div>

                  {lot.farmerProfile?.badge && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500 text-coffee-950 text-[10px] font-extrabold shadow">
                      <Award className="w-3 h-3" />
                      {lot.farmerProfile.badge} Farmer
                    </div>
                  )}

                  {lot.isFairPrice && (
                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-forest-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Fair Benchmark
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-coffee-600">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-gold-600" />
                      {lot.location?.woreda || 'Mana'}, {lot.location?.kebele || 'Kenteri'}
                    </span>
                    <span className="text-[11px] text-coffee-400">Harvest {lot.harvestYear}</span>
                  </div>

                  <h3 className="font-bold text-coffee-950 text-base group-hover:text-gold-700 transition-colors leading-snug">
                    {lot.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-coffee-600">
                    <div>
                      Farmer: <strong className="text-coffee-900">{lot.farmer.fullName}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTraceabilityTargetUser({
                          id: lot.farmer._id,
                          name: lot.farmer.fullName,
                        });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-700 hover:text-forest-900 bg-forest-50 hover:bg-forest-100 px-2 py-0.5 rounded-lg border border-forest-200 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
                      Traceability & Trades
                    </button>
                  </div>

                  {/* Lot specs */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-coffee-50/70 border border-coffee-100 text-[11px]">
                    <div>
                      <span className="text-coffee-500 block text-[10px]">Volume:</span>
                      <strong className="text-coffee-900 font-bold">{lot.quantityKg.toLocaleString()} kg</strong>
                    </div>
                    <div>
                      <span className="text-coffee-500 block text-[10px]">Cupping:</span>
                      <strong className="text-forest-700 font-bold">{lot.cuppingScore || '86'} pts</strong>
                    </div>
                    <div>
                      <span className="text-coffee-500 block text-[10px]">Moisture:</span>
                      <strong className="text-coffee-900 font-bold">{lot.moisturePercentage || '11.4'}%</strong>
                    </div>
                  </div>

                  {/* Certifications */}
                  {lot.certifications && lot.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {lot.certifications.map((c) => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Price & Action */}
              <div className="p-5 pt-0 border-t border-coffee-100 mt-2">
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="text-[10px] text-coffee-500 block">Asking Price:</span>
                    <div className="text-lg font-black text-coffee-950">
                      {lot.askingPricePerKg}{' '}
                      <span className="text-xs font-semibold text-coffee-600">ETB/kg</span>
                    </div>
                    <span className="text-[10px] text-coffee-500">
                      Reference: {lot.marketReferencePrice} ETB
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenOfferModal(lot)}
                    className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold text-xs tracking-wide shadow-sm transition-all"
                  >
                    Submit Offer →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Offer Submission Modal (Unclipped & Vertically Scrollable with Sticky Footer) */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-coffee-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-coffee-100 flex-shrink-0 flex items-start justify-between gap-3 bg-white">
              <div className="pr-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  Direct Coffee Contract & Negotiation
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-coffee-950">
                  Offer to {selectedListing.farmer.fullName}
                </h3>
                <p className="text-xs text-coffee-600">
                  {selectedListing.title} ({selectedListing.location?.woreda || 'Jimma'})
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setTraceabilityTargetUser({
                      id: selectedListing.farmer._id,
                      name: selectedListing.farmer.fullName,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 text-xs font-bold transition-colors shadow-sm shrink-0"
                >
                  <ShieldCheck className="w-4 h-4 text-forest-600" />
                  <span className="hidden sm:inline">Traceability</span>
                </button>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="p-1.5 rounded-full hover:bg-coffee-100 text-coffee-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
              {/* Multi-Round Negotiation Rule Info Banner */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Negotiation Protocol: Round 1 of 3</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Farmer asking price is <strong>{selectedListing.askingPricePerKg} ETB/kg</strong>. You can accept this price immediately to close the deal, or propose a counter-offer. A maximum of <strong>3 negotiation rounds</strong> is enforced. On round 3, counter-offers are disabled and the deal must be accepted or rejected.
                </p>
              </div>

              {role === 'buyer' && buyerVerificationStatus && buyerVerificationStatus !== 'verified' ? (
                <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-coffee-950">Verification Required to Submit Offers</h4>
                    <p className="text-xs text-coffee-600 mt-1 max-w-sm mx-auto leading-relaxed">
                      Your buyer account is currently in <strong>{buyerVerificationStatus.toUpperCase()}</strong> status. In compliance with regional coffee marketing regulations, offers and contracts can only be submitted by verified buyers.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
                    <Link
                      href="/buyer/profile"
                      className="px-4 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-sm transition-colors"
                    >
                      Complete Profile on Dashboard →
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="px-4 py-2.5 rounded-xl border border-coffee-300 text-coffee-700 hover:bg-coffee-50 font-semibold text-xs transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : offerSuccessMsg ? (
                <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-forest-600 mx-auto" />
                  <p className="text-sm font-bold text-forest-900">{offerSuccessMsg}</p>
                </div>
              ) : (
                <form id="offerForm" onSubmit={handleSubmitOffer} className="space-y-4">
                  {offerError && (
                    <div className="rounded-xl border border-cherry-200 bg-cherry-50 px-3 py-2 text-sm text-cherry-800">{offerError}</div>
                  )}

                  {/* Quick Price Strategy Buttons */}
                  <div className="flex items-center gap-2 pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => setOfferPrice(selectedListing.askingPricePerKg)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        offerPrice === selectedListing.askingPricePerKg
                          ? 'bg-forest-600 text-white border-forest-600 shadow-sm'
                          : 'bg-coffee-50 hover:bg-coffee-100 text-coffee-800 border-coffee-200'
                      }`}
                    >
                      ✓ Match Asking Price ({selectedListing.askingPricePerKg} ETB)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const floor = floorFor(selectedListing.marketReferencePrice);
                        const discountPrice = Math.max(floor, selectedListing.askingPricePerKg - 50);
                        setOfferPrice(discountPrice);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        offerPrice < selectedListing.askingPricePerKg
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-coffee-50 hover:bg-coffee-100 text-coffee-800 border-coffee-200'
                      }`}
                    >
                      ⚡ Counter-Offer (-50 ETB)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">
                        Offered Price (ETB / Kg):
                      </label>
                      <input
                        type="number"
                        min="500"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(Number(e.target.value))}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500"
                        required
                      />
                      <span className="text-[10px] text-coffee-500 mt-1 block">
                        Protection floor: {floorFor(selectedListing.marketReferencePrice)} ETB/kg
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">
                        Quantity (Kg):
                      </label>
                      <input
                        type="number"
                        min="100"
                        max={selectedListing.quantityKg}
                        value={offerQuantity}
                        onChange={(e) => setOfferQuantity(Number(e.target.value))}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500"
                        required
                      />
                      <span className="text-[10px] text-coffee-500 mt-1 block">
                        Max available: {selectedListing.quantityKg.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  {/* Real-time Fairness Indicator */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                      isOfferFair
                        ? 'bg-forest-50 border-forest-200 text-forest-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    {isOfferFair ? (
                      <CheckCircle2 className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-xs">
                        {isOfferFair ? 'Fair Offer Compliant' : 'Warning: Offer Below Statutory Floor'}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {isOfferFair
                          ? `This offer (${offerPrice} ETB/kg) meets or exceeds the protection floor (${
                              floorFor(selectedListing.marketReferencePrice)
                            } ETB/kg) and protects your buyer Fairness Score.`
                          : `Offering below ${
                              floorFor(selectedListing.marketReferencePrice)
                            } ETB/kg violates regional smallholder floor protections and will negatively impact your verified buyer rating.`}
                      </div>
                    </div>
                  </div>

                  {/* Total Value calculation */}
                  <div className="p-3.5 rounded-xl bg-coffee-100/60 border border-coffee-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-coffee-600 uppercase font-semibold">
                        Total Contract Value:
                      </span>
                      <div className="text-xl font-black text-coffee-950">
                        {(offerPrice * offerQuantity).toLocaleString()} ETB
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-coffee-200 text-coffee-800 font-semibold">
                      Standard Contract
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-coffee-900 block mb-1">
                      Proposed Payment Terms:
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-coffee-900 block mb-1">
                      Delivery / Inspection Location:
                    </label>
                    <input
                      type="text"
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Modal Sticky Footer */}
            {(!role || role !== 'buyer' || buyerVerificationStatus === 'verified') && !offerSuccessMsg && (
              <div className="px-6 py-4 border-t border-coffee-100 bg-coffee-50/70 flex-shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="w-1/3 py-2.5 rounded-xl border border-coffee-300 text-coffee-800 font-semibold hover:bg-coffee-100 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="offerForm"
                  disabled={offerSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-600 text-white font-bold tracking-wide shadow-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs"
                >
                  <Send className="w-4 h-4" />
                  {offerSubmitting ? 'Transmitting...' : 'Send Offer to Farmer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Traceability & Counterparty Background Modal */}
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
