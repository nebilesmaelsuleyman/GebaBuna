'use client';

import React, { useState, useEffect, useRef } from 'react';
import NextLink from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api, AiGradingError } from '../../services/api';
import { formatGrade, Grade, REFERENCE_PRICES } from '../../utils/coffeePrices';
import { Listing, Offer } from '../../types';
import {
  User,
  Award,
  Plus,
  Mic,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  MapPin,
  TrendingUp,
  FileText,
  DollarSign,
  Coffee,
  X,
  Volume2,
  Brain,
  Pencil,
  Trash2,
  RotateCcw,
  ShieldCheck,
  History,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import VoiceInputButton from '../../components/common/VoiceInputButton'
import AIAnalysisModal from '../../components/farmer/AIAnalysisModal';
import { ManualGradeResult } from '../../components/farmer/ManualGradeForm';
import VoiceListingAssistant from '../../components/farmer/VoiceListingAssistant';
import ProfileSummaryCard from '../../components/common/ProfileSummaryCard';
import TraceabilityModal from '../../components/common/TraceabilityModal';

export default function FarmerPortalPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [farmerProfile, setFarmerProfile] = useState<any>(null);
  const [profileLocation, setProfileLocation] = useState({ woreda: 'Mana', kebele: 'Kenteri' });
  const [farmerTrades, setFarmerTrades] = useState<any[]>([]);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [incomingOffers, setIncomingOffers] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Counter & Traceability States
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');
  const [counterSubmitting, setCounterSubmitting] = useState<boolean>(false);
  const [expandedHistoryOfferId, setExpandedHistoryOfferId] = useState<string | null>(null);
  const [traceabilityTargetUser, setTraceabilityTargetUser] = useState<{ id: string; name: string } | null>(null);

  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lotTitle, setLotTitle] = useState('Mana Woreda Sun-Dried Natural Lot');
  const [lotVariety, setLotVariety] = useState('Jimma Heirloom 74110');
  const [lotGrade, setLotGrade] = useState('Grade 1');
  const [lotProcessing, setLotProcessing] = useState<'washed' | 'natural'>('washed');
  const [lotQuantity, setLotQuantity] = useState(1500);
  const [lotAskingPrice, setLotAskingPrice] = useState(1165);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Voice Simulator Modal
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showVoiceListingAssistant, setShowVoiceListingAssistant] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // AI Coffee Bean Analysis Modal
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [aiPhoto, setAiPhoto] = useState<File | null>(null);
  const [aiPhotoPreview, setAiPhotoPreview] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiManualEntry, setAiManualEntry] = useState<{ title: string; photoUrl?: string } | null>(null);
  const aiRunRef = useRef(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const normalizeListing = (item: any): Listing => ({
    _id: item._id,
    farmer: item.farmer || {
      _id: user?.id || 'farmer',
      fullName: user?.fullName || 'Farmer',
      phone: user?.phone || '',
    },
    farmerProfile: item.farmerProfile,
    title: item.title || item.coffeeType || 'Coffee lot',
    variety: item.variety || 'Jimma Heirloom',
    grade: item.grade,
    processing: item.processing,
    harvestYear: item.harvestYear || 2026,
    quantityKg: item.quantityKg,
    askingPricePerKg: item.askingPricePerKg,
    marketReferencePrice: item.marketReferencePrice || 0,
    priceDiffPercentage: item.priceDiffPercentage || 0,
    isFairPrice: item.isFairPrice ?? true,
    location: item.location || {
      region: 'Oromia',
      zone: 'Jimma',
      woreda: 'Mana',
      kebele: 'Kenteri',
    },
    cuppingScore: item.cuppingScore,
    moisturePercentage: item.moisturePercentage,
    certifications: item.certifications || [],
    photos: item.photos || [],
    status: item.status === 'in_negotiation' ? 'under_offer' : item.status,
    createdAt: item.createdAt || new Date().toISOString(),
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [myListingsRes, incomingOffersRes, tradesRes, profileRes] = await Promise.all([
          api.getMyListings(),
          api.getIncomingOffers(),
          api.getTrades(),
          api.getFarmerProfile(),
        ]);

        if (myListingsRes.success) setMyListings((myListingsRes.listings || []).map(normalizeListing));
        if (tradesRes.success) setFarmerTrades(tradesRes.trades || []);
        if (profileRes.success) {
          setFarmerProfile(profileRes.profile);
          setProfileLocation({ woreda: profileRes.profile?.woreda || 'Mana', kebele: profileRes.profile?.kebele || 'Kenteri' });
        }

        if (incomingOffersRes.success) {
          setIncomingOffers(
            incomingOffersRes.offers.map((offer: any) => ({
              _id: offer._id,
              buyerId: offer.buyer?._id || offer.buyer,
              buyerName: offer.buyerProfile?.companyName || offer.buyer?.fullName || 'Verified Buyer',
              companyType: offer.buyerProfile?.businessType || 'Commercial Buyer',
              fairnessScore: offer.buyerProfile?.fairnessScore || Math.round(offer.fairnessPercentage || 85),
              listingTitle: offer.listing?.coffeeType || 'Coffee lot',
              offeredPricePerKg: offer.currentPricePerKg || offer.counterPricePerKg || offer.offeredPricePerKg,
              marketPrice: offer.marketPriceAtOffer,
              quantityKg: offer.currentQuantityKg || offer.counterQuantityKg || offer.quantityKg,
              totalAmountETB:
                (offer.currentPricePerKg || offer.counterPricePerKg || offer.offeredPricePerKg) *
                (offer.currentQuantityKg || offer.counterQuantityKg || offer.quantityKg),
              status: offer.status,
              round: offer.round || 1,
              maxRounds: offer.maxRounds || 3,
              currentTurn: offer.currentTurn || (offer.status === 'countered' ? (offer.counteredBy === 'farmer' ? 'buyer' : 'farmer') : 'farmer'),
              lastActionBy: offer.lastActionBy || offer.counteredBy || 'buyer',
              negotiationHistory: offer.negotiationHistory || [],
              isFair: offer.fairnessStatus !== 'very_low',
              paymentTerms: offer.message || 'Payment terms shared in buyer message',
              deliveryLocation: offer.deliveryTerms || 'Negotiable',
              createdAt: new Date(offer.createdAt).toLocaleString(),
            }))
          );
        }
      } catch (err: any) {
        setLoadError(
          err?.status === 401 || err?.status === 403
            ? 'Sign in as a farmer to see your lots and offers.'
            : err?.message || 'Could not load your dashboard.'
        );
      }
    }
    loadData();
  }, []);

  const completedSales = farmerTrades.filter((trade) => ['paid', 'completed'].includes(trade.status));
  const totalSalesETB = completedSales.reduce((sum, trade) => sum + (Number(trade.totalAmountETB) || 0), 0);
  const premiumEarned = completedSales.reduce((sum, trade) => sum + ((Number(trade.agreedPricePerKg) || 0) - (Number(trade.marketReferencePrice) || 0)) * (Number(trade.agreedQuantityKg) || 0), 0);
  const estimatedProfit = farmerProfile?.estimatedCostPerKg == null
    ? null
    : completedSales.reduce((sum, trade) => sum + ((Number(trade.agreedPricePerKg) || 0) - Number(farmerProfile.estimatedCostPerKg)) * (Number(trade.agreedQuantityKg) || 0), 0);
  const salesByMonth = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthTrades = completedSales.filter((trade) => {
      const d = new Date(trade.completedAt || trade.updatedAt || trade.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === key;
    });
    return {
      month: date.toLocaleString('en', { month: 'short' }),
      quantity: monthTrades.reduce((sum, trade) => sum + (Number(trade.agreedQuantityKg) || 0), 0),
      sales: monthTrades.reduce((sum, trade) => sum + (Number(trade.totalAmountETB) || 0), 0),
      estimatedProfit: farmerProfile?.estimatedCostPerKg == null ? null : monthTrades.reduce((sum, trade) => sum + ((Number(trade.agreedPricePerKg) || 0) - Number(farmerProfile.estimatedCostPerKg)) * (Number(trade.agreedQuantityKg) || 0), 0),
    };
  });

  const saveListingChanges = async () => {
    if (!editingListing) return;
    try {
      const response = await api.updateListing(editingListing._id, { askingPricePerKg: Number(editPrice), quantityKg: Number(editQuantity) });
      setMyListings((previous) => previous.map((listing) => listing._id === editingListing._id ? normalizeListing(response.listing) : listing));
      setEditingListing(null);
    } catch (error: any) {
      alert(error.message || 'Could not update this listing.');
    }
  };

  const cancelListing = async (listing: Listing) => {
    if (!window.confirm(`Remove “${listing.title}” from the marketplace?`)) return;
    try {
      await api.deleteListing(listing._id);
      setMyListings((previous) => previous.map((item) => item._id === listing._id ? { ...item, status: 'cancelled' } : item));
    } catch (error: any) {
      alert(error.message || 'Could not remove this listing.');
    }
  };

  const handleAcceptOffer = async (id: string) => {
    try {
      await api.acceptOffer(id);
      setIncomingOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'accepted' } : o))
      );
    } catch (error: any) {
      alert(error.message || 'Could not accept this offer.');
    }
  };

  const handleRejectOffer = async (id: string) => {
    try {
      await api.rejectOffer(id);
      setIncomingOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'rejected' } : o))
      );
    } catch (error: any) {
      alert(error.message || 'Could not reject this offer.');
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
        setIncomingOffers((prev) =>
          prev.map((o) =>
            o._id === id
              ? {
                  ...o,
                  status: 'countered',
                  offeredPricePerKg: priceNum,
                  totalAmountETB: priceNum * o.quantityKg,
                  round: res.offer.round || (o.round || 1) + 1,
                  currentTurn: 'buyer',
                  lastActionBy: 'farmer',
                  negotiationHistory: res.offer.negotiationHistory || o.negotiationHistory,
                }
              : o
          )
        );
        setCounteringOfferId(null);
        setCounterPrice('');
        setCounterMessage('');
      }
    } catch (error: any) {
      alert(error.message || 'Could not submit counter-offer.');
    } finally {
      setCounterSubmitting(false);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createListing({
        coffeeType: lotTitle,
        processing: lotProcessing,
        grade: lotGrade,
        quantityKg: lotQuantity,
        askingPricePerKg: lotAskingPrice,
        harvestDate: 'November 2026',
        woreda: profileLocation.woreda,
        kebele: profileLocation.kebele,
        description: lotVariety,
        moisturePercentage: 11.2,
        photos: aiAnalysisResult?.photoUrl ? [aiAnalysisResult.photoUrl] : [],
        ...(aiAnalysisResult && aiAnalysisResult.provider !== 'manual'
          ? {
              aiEstimatedGrade: aiAnalysisResult.grade_tier || '',
              aiConfidence: aiAnalysisResult.confidence || '',
              aiDefectsSummary: aiAnalysisResult.defects_summary || aiAnalysisResult.sorting_advice_english || '',
            }
          : {}),
      });

      if (res.success && res.listing) {
        setMyListings([normalizeListing(res.listing), ...myListings]);
      }
    } catch (error: any) {
      setCreateError(error.message || 'Could not create this listing.');
      return;
    }
    setCreateError(null);

    setCreateSuccess(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setCreateSuccess(false);
    }, 1800);
  };

  const handleSimulateVoice = (queryText: string) => {
    setVoiceQuery(queryText);
    setIsRecording(true);
    setVoiceResponse(null);

    setTimeout(() => {
      setIsRecording(false);
      if (queryText.includes('Buna') || queryText.includes('gatii')) {
        setVoiceResponse(
          '☕ [Afaan Oromoo]: Gatiin buna dhiqamee (Washed Grade 1) har’a Jimmaatti 1,150 ETB/kg dha. Gatiin gadi-aanaa (floor) 1,070 ETB/kg dha. Bittoonni Oromia Union fi Jimma Specialty gatii qajeelaa dhiyeessaa jiru.'
        );
      } else {
        setVoiceResponse(
          '☕ [አማርኛ]: የዛሬው የጅማ ታጥቦ የተዘጋጀ ግሬድ 1 የቡና መነሻ ዋጋ በኪሎግራም 1,150 የኢትዮጵያ ብር ነው። ዝቅተኛው ዋጋ (Floor) 1,070 ብር ነው። ኦሮሚያ ዩኒየን እና ጅማ ስፔሻሊቲ በከፍተኛ ዋጋ እየገዙ ይገኛሉ።'
        );
      }
    }, 1200);
  };

  // AI Analysis Handlers
  const handleAiPhotoSelect = (file: File) => {
    setAiPhoto(file);
    setAiPhotoPreview(URL.createObjectURL(file));
    setAiError(null);
    setAiManualEntry(null);
    setAiAnalysisResult(null);
    setExpandedSections({});
  };

  const handleAiAnalyze = async () => {
    if (!aiPhoto) return;
    const run = ++aiRunRef.current;
    setIsAnalyzing(true);
    setAiError(null);
    try {
      const result = await api.analyzeCoffeePhoto(aiPhoto, profileLocation);
      if (run !== aiRunRef.current) return;
      setAiManualEntry(null);
      setAiAnalysisResult({ ...result.analysis, location: result.location, photoUrl: result.photoUrl });
    } catch (err: any) {
      if (run !== aiRunRef.current) return;
      setAiManualEntry(
        err instanceof AiGradingError
          ? { title: err.title, photoUrl: err.photoUrl }
          : { title: 'AI is not responding right now' }
      );
      setAiError(err.message || 'AI grading is unavailable right now. Enter the grade and price yourself.');
    } finally {
      if (run === aiRunRef.current) setIsAnalyzing(false);
    }
  };

  const handleAiSkipToManual = () => {
    aiRunRef.current++;
    setIsAnalyzing(false);
    setAiError('Choose the ECX grade and your asking price below.');
    setAiManualEntry({ title: 'Manual grading' });
  };

  const handleAiReset = () => {
    aiRunRef.current++;
    setIsAnalyzing(false);
    setAiPhoto(null);
    setAiPhotoPreview(null);
    setAiAnalysisResult(null);
    setAiError(null);
    setAiManualEntry(null);
    setExpandedSections({});
  };

  const handleAiManualSubmit = (result: ManualGradeResult) => {
    setAiAnalysisResult(result);
    setShowAIAnalysisModal(false);
    setShowCreateModal(true);
    setLotGrade(result.grade);
    setLotProcessing(result.processing_type.toLowerCase() as 'washed' | 'natural');
    setLotAskingPrice(result.asking_price_etb);
  };

  const handleAiCreateListing = (askingPrice: number) => {
    if (!aiAnalysisResult) return;
    setShowAIAnalysisModal(false);
    setShowCreateModal(true);
    const gradeLabel = aiAnalysisResult.grade_tier || '';
    const gradeNumber = gradeLabel.match(/G([1-5])/i)?.[1];
    setLotGrade(gradeLabel.toLowerCase().includes('specialty') ? 'Specialty' : `Grade ${gradeNumber || 2}`);
    setLotProcessing(aiAnalysisResult.processing_type?.toLowerCase() === 'natural' ? 'natural' : 'washed');
    setLotAskingPrice(askingPrice);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 space-y-10">
      {/* Farmer Profile Hero */}
      <ProfileSummaryCard
        avatar={user?.avatar}
        avatarAlt="Farmer avatar"
        avatarFallback={(user?.fullName || 'Gemechu Daba').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
        name={user?.fullName || 'Gemechu Daba'}
        badge={<span className="flex items-center gap-1 rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-black text-coffee-950 shadow"><Award className="h-3.5 w-3.5" />Rank #1 Gold Farmer</span>}
        details={<><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gold-300" />{profileLocation.woreda}, {profileLocation.kebele} · {farmerProfile?.zone || 'Jimma'}</span><span>•</span><span>Farm: {farmerProfile?.farmSizeHectares ?? '—'} hectares</span><span>•</span><span className="font-bold text-forest-300">Quality: {farmerProfile?.averageQualityScore ?? '—'} pts</span></>}
        actions={<>
            <NextLink href="/farmer/profile" className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20"><User className="w-4 h-4" /> Edit profile</NextLink>
            <button
              onClick={() => setShowVoiceListingAssistant(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-gold-500/25 transition-all border border-gold-300"
            >
              <Mic className="w-4 h-4 text-coffee-950 animate-pulse" />
              <span>Sell with Voice (Sagaleen Gurguri)</span>
            </button>

            <button
              onClick={() => {
                handleAiReset();
                setShowAIAnalysisModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 border border-forest-400/50 text-forest-50 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Brain className="w-4 h-4 text-forest-300" />
              <span>AI Bean Analysis</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>List New Harvest</span>
            </button>
        </>}
        stats={[
          { label: 'Completed sales', value: <>{completedSales.reduce((sum, trade) => sum + (Number(trade.agreedQuantityKg) || 0), 0).toLocaleString()} <small className="text-sm font-semibold">kg</small></>, detail: `${completedSales.length} settled trades`, tone: 'light' },
          { label: 'Sales revenue', value: <>{totalSalesETB.toLocaleString()} <small className="text-sm font-semibold">ETB</small></>, detail: 'From paid or completed trades', tone: 'gold' },
          { label: 'Premium over ECX', value: <>{Math.max(0, premiumEarned).toLocaleString()} <small className="text-sm font-semibold">ETB</small></>, detail: 'Compared with trade benchmark', tone: 'light' },
          { label: 'Estimated profit', value: <>{estimatedProfit === null ? '—' : `${Math.round(estimatedProfit).toLocaleString()} ETB`}</>, detail: estimatedProfit === null ? 'Add cost/kg in your profile' : 'Revenue minus estimated production cost', tone: 'green' },
        ]}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => setShowVoiceListingAssistant(true)} className="surface p-5 text-left transition hover:-translate-y-0.5">
          <p className="font-mono text-[11px] font-bold text-gold-700">01 · Voice</p>
          <h2 className="mt-2 text-base font-extrabold text-coffee-950">Speak the lot</h2>
          <p className="mt-1 text-sm text-coffee-600">Afaan Oromoo or Amharic. Quantity, then price, then publish.</p>
        </button>
        <button type="button" onClick={() => { handleAiReset(); setShowAIAnalysisModal(true); }} className="surface p-5 text-left transition hover:-translate-y-0.5">
          <p className="font-mono text-[11px] font-bold text-forest-700">02 · Grade</p>
          <h2 className="mt-2 text-base font-extrabold text-coffee-950">Photograph the beans</h2>
          <p className="mt-1 text-sm text-coffee-600">A photo returns an ECX-style grade and a fair price band.</p>
        </button>
        <a href="#incoming-offers" className="surface p-5 transition hover:-translate-y-0.5">
          <p className="font-mono text-[11px] font-bold text-cherry-700">03 · Floor</p>
          <h2 className="mt-2 text-base font-extrabold text-coffee-950">Accept a protected bid</h2>
          <p className="mt-1 text-sm text-coffee-600">Offers are shown against the ECX benchmark before you lock a contract.</p>
        </a>
      </section>

      <section className="rounded-3xl border border-coffee-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-extrabold text-coffee-950">Sales performance</h2><p className="mt-1 text-xs text-coffee-600">Volume, revenue, and estimated profit from paid and completed trades.</p></div><span className="rounded-full bg-forest-50 px-3 py-1.5 text-[11px] font-bold text-forest-800">Premium above ECX: {Math.round(premiumEarned).toLocaleString()} ETB</span></div>
        {completedSales.length ? <div className="grid gap-6 lg:grid-cols-3">
          <div><p className="mb-2 text-xs font-bold text-coffee-700">Volume sold (kg)</p><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesByMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee7dc" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 10 }} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} kg`, 'Volume sold']} /><Bar dataKey="quantity" fill="#78936d" radius={[7, 7, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div></div>
          <div><p className="mb-2 text-xs font-bold text-coffee-700">Gross sales (ETB)</p><div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee7dc" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`, 'Gross sales']} /><Bar dataKey="sales" fill="#397449" radius={[7, 7, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div></div>
          <div><p className="mb-2 text-xs font-bold text-coffee-700">Estimated profit after production cost</p>{farmerProfile?.estimatedCostPerKg == null ? <div className="flex h-56 items-center justify-center rounded-2xl bg-coffee-50 px-6 text-center text-sm text-coffee-600">Add your estimated production cost per kg in your profile to see profit by month.</div> : <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesByMonth}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee7dc" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#796d5b', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ETB`, 'Estimated profit']} /><Bar dataKey="estimatedProfit" fill="#c2862e" radius={[7, 7, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div>}</div>
        </div> : <div className="flex h-44 items-center justify-center rounded-2xl bg-coffee-50 text-center text-sm text-coffee-600">Completed trade data will appear here after a sale is marked paid or completed.</div>}
        <p className="mt-3 text-[11px] text-coffee-500">Estimated profit is not accounting profit. It is calculated from completed sales and your private production cost per kg.</p>
      </section>

      {/* Incoming Offers from Verified Buyers */}
      {loadError && (
        <div className="rounded-2xl border border-cherry-200 bg-cherry-50 px-4 py-3 text-sm text-cherry-800">{loadError}</div>
      )}

      <div id="incoming-offers" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-coffee-950">
              Incoming Purchase Offers ({incomingOffers.filter((o) => o.status === 'pending').length} Pending)
            </h2>
            <p className="text-xs text-coffee-600">
              Verified buyers bidding on your coffee lots checked against the protection floor.
            </p>
          </div>
        </div>

        {incomingOffers.length === 0 && !loadError && (
          <p className="surface px-5 py-6 text-sm text-coffee-600">No offers yet. Verified buyers will appear here when they bid on your lots.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {incomingOffers.map((offer) => (
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
              {/* Card Header */}
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-coffee-950 text-sm">{offer.buyerName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 text-[10px] font-bold">
                      Fair Buyer {offer.fairnessScore}%
                    </span>
                  </div>
                  <span className="text-[11px] text-coffee-500 block mt-0.5">
                    {offer.companyType} • {offer.createdAt}
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

              {/* Traceability Button */}
              {offer.buyerId && (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setTraceabilityTargetUser({
                        id: offer.buyerId,
                        name: offer.buyerName,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-800 text-[11px] font-bold transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-forest-600" />
                    Buyer Background & Past Trades
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
                    R1: Buyer Offer
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

              {/* Offer Details */}
              <div className="p-3.5 rounded-xl bg-coffee-50 border border-coffee-100 space-y-2 text-xs">
                <div className="text-coffee-700 font-medium">{offer.listingTitle}</div>
                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-coffee-500 text-[10px] block">
                      {offer.status === 'countered' && offer.lastActionBy === 'farmer'
                        ? 'Your Proposed Price:'
                        : 'Current Proposed Price:'}
                    </span>
                    <span className="text-xl font-black text-coffee-950">
                      {offer.offeredPricePerKg}{' '}
                      <span className="text-xs font-semibold text-coffee-600">ETB/kg</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-coffee-500 text-[10px] block">Volume & Value:</span>
                    <span className="font-bold text-forest-700 text-sm">
                      {offer.quantityKg.toLocaleString()} kg ({offer.totalAmountETB.toLocaleString()} ETB)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-forest-700 font-semibold pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-forest-600" />
                  <span>Above the protection floor ({offer.marketPrice} ETB reference)</span>
                </div>
              </div>

              <div className="text-[11px] text-coffee-600 space-y-1">
                <div>
                  <strong>Payment:</strong> {offer.paymentTerms}
                </div>
                <div>
                  <strong>Delivery:</strong> {offer.deliveryLocation}
                </div>
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
                    <History className="w-3.5 h-3.5 text-coffee-500" />
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
                                (step.senderRole === 'farmer' ? 'You (Farmer)' : 'Buyer')}
                              :
                            </span>{' '}
                            <span className="text-coffee-800">
                              {step.action === 'accepted'
                                ? 'Accepted offer'
                                : step.action === 'rejected'
                                ? 'Declined offer'
                                : `Proposed ${step.pricePerKg} ETB/kg`}
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

              {/* Actions & Counter Form */}
              {(offer.status === 'pending' || offer.status === 'countered') && (
                <div>
                  {offer.currentTurn === 'farmer' ? (
                    <div>
                      {counteringOfferId === offer._id ? (
                        <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-3 text-xs">
                          <span className="font-bold text-coffee-950 block">
                            Propose Counter-Offer (Round {(offer.round || 1) + 1} of 3)
                          </span>
                          <p className="text-[11px] text-coffee-600">
                            Adjust the price back up toward your target (Minimum protection floor:{' '}
                            {offer.marketPrice} ETB/kg).
                          </p>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-bold text-coffee-700 block mb-0.5">
                                Your Counter Price (ETB / Kg):
                              </label>
                              <input
                                type="number"
                                placeholder={`e.g. ${offer.offeredPricePerKg + 50}`}
                                value={counterPrice}
                                onChange={(e) => setCounterPrice(e.target.value)}
                                className="w-full bg-white border border-coffee-300 rounded-lg px-3 py-1.5 text-xs font-bold text-coffee-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-coffee-700 block mb-0.5">
                                Note / Reason for Counter (Optional):
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. High cupping score lot, can do this fair middle price"
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
                                Final Round (Round 3 of 3 reached): Counter-offers are disabled. You
                                must Accept or Decline.
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptOffer(offer._id)}
                              className="flex-1 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept Contract ({offer.offeredPricePerKg} ETB)
                            </button>

                            {offer.round < 3 ? (
                              <button
                                onClick={() => {
                                  setCounteringOfferId(offer._id);
                                  setCounterPrice(String(offer.offeredPricePerKg + 50));
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
                        Your counter-offer ({offer.offeredPricePerKg} ETB/kg) is pending Buyer&apos;s
                        response.
                      </span>
                      <button
                        onClick={() => handleRejectOffer(offer._id)}
                        className="text-[11px] text-red-600 hover:underline font-bold"
                      >
                        Cancel Deal
                      </button>
                    </div>
                  )}
                </div>
              )}

              {offer.status === 'accepted' && (
                <div className="p-2.5 rounded-xl bg-forest-100 text-forest-900 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  Contract Locked! CBE Escrow Payment Initiated.
                </div>
              )}

              {offer.status === 'rejected' && (
                <div className="p-2 rounded-xl bg-red-50 text-red-800 text-[11px] font-semibold text-center">
                  Negotiation Closed — Offer Declined.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active Harvest Listings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-coffee-950">My Active Harvest Listings</h2>
            <p className="text-xs text-coffee-600">Currently visible to licensed commercial coffee buyers.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs font-bold text-gold-700 hover:text-gold-900 flex items-center gap-1"
          >
            + Add Another Harvest
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myListings.length === 0 && <div className="rounded-2xl border border-dashed border-coffee-300 bg-white p-8 text-center text-sm text-coffee-600">You have no harvest listings yet. Add your first harvest to start receiving buyer offers.</div>}
        {myListings.map((lot) => (
            <div key={lot._id} className={`bg-white rounded-2xl border border-coffee-200 p-5 shadow-sm space-y-3 ${lot.status === 'cancelled' ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                    {formatGrade(lot.processing, lot.grade)}
                  </span>
                  <h3 className="font-bold text-coffee-950 text-base">{lot.title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${lot.status === 'cancelled' ? 'bg-coffee-100 text-coffee-600' : lot.status === 'sold' ? 'bg-blue-100 text-blue-800' : 'bg-forest-100 text-forest-800'}`}>
                  {lot.status?.replace('_', ' ') || 'open'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs py-2 bg-coffee-50/60 rounded-xl px-3 border border-coffee-100">
                <div>
                  <span className="text-coffee-500 text-[10px] block">Quantity:</span>
                  <strong>{lot.quantityKg.toLocaleString()} kg</strong>
                </div>
                <div>
                  <span className="text-coffee-500 text-[10px] block">Asking Price:</span>
                  <strong className="text-forest-700">{lot.askingPricePerKg} ETB/kg</strong>
                </div>
                <div>
                  <span className="text-coffee-500 text-[10px] block">ECX Benchmark:</span>
                  <strong>{lot.marketReferencePrice} ETB</strong>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 text-coffee-500">
                <span>Location: {lot.location?.woreda || 'Mana'}, {lot.location?.kebele || 'Kenteri'}</span>
                <div className="flex items-center gap-2">
                  {['open', 'under_offer'].includes(lot.status) && <button onClick={() => { setEditingListing(lot); setEditPrice(String(lot.askingPricePerKg)); setEditQuantity(String(lot.quantityKg)); }} className="inline-flex items-center gap-1 rounded-lg border border-coffee-200 px-2.5 py-1.5 font-bold text-coffee-700 hover:bg-coffee-50"><Pencil className="h-3 w-3" /> Edit</button>}
                  {lot.status !== 'cancelled' && lot.status !== 'sold' && <button onClick={() => cancelListing(lot)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Remove</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={(event) => { event.preventDefault(); void saveListingChanges(); }} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl">
            <div><h3 className="text-lg font-extrabold text-coffee-950">Edit harvest listing</h3><p className="mt-1 text-xs text-coffee-600">{editingListing.title}</p></div>
            <label className="block text-xs font-bold text-coffee-700">Asking price (ETB/kg)<input required type="number" min="1" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} className="mt-1.5 w-full rounded-xl border border-coffee-200 px-3 py-3 text-sm" /></label>
            <label className="block text-xs font-bold text-coffee-700">Available quantity (kg)<input required type="number" min="1" value={editQuantity} onChange={(event) => setEditQuantity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-coffee-200 px-3 py-3 text-sm" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingListing(null)} className="rounded-xl border border-coffee-200 px-4 py-2.5 text-xs font-bold text-coffee-700">Cancel</button><button type="submit" className="rounded-xl bg-forest-700 px-4 py-2.5 text-xs font-bold text-white">Save changes</button></div>
          </form>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-coffee-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-coffee-100 text-coffee-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  New Harvest Entry
                </span>
                <h3 className="text-xl font-extrabold text-coffee-950">
                  List Coffee for Verified Buyers
                </h3>
                <p className="text-xs text-coffee-600">
                  Fair price suggestions are matched with estimated 2025/26 Jimma reference prices.
                </p>
              </div>

              {createSuccess ? (
                <div className="p-6 rounded-2xl bg-forest-50 border border-forest-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-forest-600 mx-auto" />
                  <p className="text-sm font-bold text-forest-900">
                    Harvest Lot listed successfully on the Jimma marketplace!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateListing} className="space-y-4 text-xs">
                  {createError && (
                    <div className="rounded-xl border border-cherry-200 bg-cherry-50 px-3 py-2 text-cherry-800">{createError}</div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <label className="font-semibold text-coffee-900 block">Lot Title:</label>
                      <VoiceInputButton
                        label="Speak in your language"
                        className="py-1.5 px-2.5 text-[10px]"
                        onTranscript={(text) => setLotTitle(text)}
                      />
                    </div>
                    <input
                      type="text"
                      value={lotTitle}
                      onChange={(e) => setLotTitle(e.target.value)}
                      className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <label className="font-semibold text-coffee-900 block">Coffee Variety:</label>
                      <VoiceInputButton
                        label="Speak in your language"
                        className="py-1.5 px-2.5 text-[10px]"
                        onTranscript={(text) => setLotVariety(text)}
                      />
                    </div>
                    <input
                      type="text"
                      value={lotVariety}
                      onChange={(e) => setLotVariety(e.target.value)}
                      className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">Coffee Grade:</label>
                      <select
                        value={lotGrade}
                        onChange={(e) => setLotGrade(e.target.value)}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                      >
                        <option value="Specialty">Specialty (cup 85+)</option>
                        <option value="Grade 1">G1</option>
                        <option value="Grade 2">G2</option>
                        <option value="Grade 3">G3</option>
                        <option value="Grade 4">G4</option>
                        <option value="Grade 5">G5</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">Processing:</label>
                      <select
                        value={lotProcessing}
                        onChange={(e) => setLotProcessing(e.target.value as any)}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                      >
                        <option value="washed">Washed</option>
                        <option value="natural">Natural (Sun-dried)</option>
                        <option value="honey">Honey / Pulped</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">Harvest Weight (Kg):</label>
                      <input
                        type="number"
                        min="100"
                        value={lotQuantity}
                        onChange={(e) => setLotQuantity(Number(e.target.value))}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-coffee-900 block mb-1">
                        Asking Price (ETB/kg):
                      </label>
                      <input
                        type="number"
                        min="500"
                        value={lotAskingPrice}
                        onChange={(e) => setLotAskingPrice(Number(e.target.value))}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-[11px] flex items-center justify-between">
                    <span>Protection floor for this grade:</span>
                    <strong className="text-forest-900">{REFERENCE_PRICES[lotProcessing]?.[lotGrade as Grade]?.floor.toLocaleString() ?? '—'} ETB/kg</strong>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-coffee-300 text-coffee-800 font-semibold hover:bg-coffee-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold tracking-wide shadow transition-colors"
                    >
                      Publish Coffee Lot
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voice Inquiry Simulator Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-coffee-200 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowVoiceModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-coffee-100 text-coffee-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-500 text-coffee-950 flex items-center justify-center">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-coffee-950">
                    Voice Price Assistant (8422 IVR)
                  </h3>
                  <p className="text-xs text-coffee-600">
                    Afaan Oromoo & Amharic voice intelligence for smallholder farmers.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label className="font-semibold text-coffee-900 block">
                  Select or speak a sample inquiry in your language:
                </label>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSimulateVoice("Buna dhiqamee Grade 1 gatiin har'aa Jimmaatti meeqa?")}
                    className="w-full text-left p-3 rounded-xl bg-coffee-50 hover:bg-coffee-100 border border-coffee-200 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-coffee-900 block">
                        ☕ [Afaan Oromoo]: "Buna dhiqamee Grade 1 gatiin har'aa Jimmaatti meeqa?"
                      </span>
                      <span className="text-[11px] text-coffee-500">
                        (What is today's washed Grade 1 price in Jimma?)
                      </span>
                    </div>
                    <Volume2 className="w-4 h-4 text-gold-600 group-hover:scale-110 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleSimulateVoice("የጅማ ስፔሻሊቲ ታጥቦ የተዘጋጀ ቡና የዛሬው ዋጋ ስንት ነው?")}
                    className="w-full text-left p-3 rounded-xl bg-coffee-50 hover:bg-coffee-100 border border-coffee-200 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-bold text-coffee-900 block">
                        ☕ [አማርኛ]: "የጅማ ስፔሻሊቲ ታጥቦ የተዘጋጀ ቡና የዛሬው ዋጋ ስንት ነው?"
                      </span>
                      <span className="text-[11px] text-coffee-500">
                        (What is today's Jimma specialty washed coffee price?)
                      </span>
                    </div>
                    <Volume2 className="w-4 h-4 text-gold-600 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Simulated Audio Response */}
              {isRecording ? (
                <div className="p-6 rounded-2xl bg-coffee-950 text-white text-center space-y-2 animate-pulse">
                  <div className="flex justify-center items-center gap-1.5 h-6">
                    <span className="w-1.5 h-4 bg-gold-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-6 bg-gold-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-3 bg-gold-400 rounded-full animate-bounce delay-200" />
                    <span className="w-1.5 h-5 bg-gold-400 rounded-full animate-bounce" />
                  </div>
                  <p className="text-xs font-semibold text-gold-300">
                    Transcribing and checking Jimma reference prices...
                  </p>
                </div>
              ) : voiceResponse ? (
                <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-forest-900">
                    <CheckCircle2 className="w-4 h-4 text-forest-700" />
                    Voice Assistant Response:
                  </div>
                  <p className="text-coffee-900 leading-relaxed font-medium">{voiceResponse}</p>
                  <div className="pt-2 border-t border-forest-200 text-[10px] text-forest-700 font-semibold">
                    ✓ SMS confirmation sent to farmer's mobile (0917112233) via shortcode 8422
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* AI Coffee Bean Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIAnalysisModal}
        onClose={() => {
          setShowAIAnalysisModal(false);
          handleAiReset();
        }}
        onAnalyze={handleAiAnalyze}
        onCreateListing={handleAiCreateListing}
        photo={aiPhoto}
        photoPreview={aiPhotoPreview}
        analysisResult={aiAnalysisResult}
        isAnalyzing={isAnalyzing}
        error={aiError}
        manualEntry={aiManualEntry}
        onManualSubmit={handleAiManualSubmit}
        onSkipToManual={handleAiSkipToManual}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        onPhotoSelect={handleAiPhotoSelect}
        location={profileLocation}
        onLocationChange={setProfileLocation}
      />

      {/* Voice-First Farmer Listing Assistant (Powered by Addis AI) */}
      <VoiceListingAssistant
        isOpen={showVoiceListingAssistant}
        onClose={() => setShowVoiceListingAssistant(false)}
        profileLocation={profileLocation}
        onListingCreated={(newListing) => {
          setMyListings((prev) => [normalizeListing(newListing), ...prev]);
          setCreateSuccess(true);
          setTimeout(() => setCreateSuccess(false), 5000);
        }}
      />

      {/* Buyer Traceability & Past History Modal */}
      {traceabilityTargetUser && (
        <TraceabilityModal
          userId={traceabilityTargetUser.id}
          userName={traceabilityTargetUser.name}
          userRole="buyer"
          onClose={() => setTraceabilityTargetUser(null)}
        />
      )}
    </div>
  );
}
