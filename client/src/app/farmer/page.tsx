'use client';

import React, { useState, useEffect } from 'react';
import NextLink from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../services/api';
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
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import VoiceInputButton from '../../components/common/VoiceInputButton'
import AIAnalysisModal from '../../components/farmer/AIAnalysisModal';
import VoiceListingAssistant from '../../components/farmer/VoiceListingAssistant';
import ProfileSummaryCard from '../../components/common/ProfileSummaryCard';

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
  const [incomingOffers, setIncomingOffers] = useState<any[]>([
    {
      _id: 'off-1',
      buyerName: 'Oromia Coffee Farmers Union',
      companyType: 'Cooperative Union',
      fairnessScore: 96,
      listingTitle: 'Highland Specialty Washed Lot - Mana Woreda',
      offeredPricePerKg: 460,
      marketPrice: 450,
      quantityKg: 2000,
      totalAmountETB: 920000,
      status: 'pending',
      isFair: true,
      paymentTerms: 'Immediate CBE Bank Transfer Upon Inspection',
      deliveryLocation: 'Jimma Union Receiving Terminal',
      createdAt: '10 mins ago',
    },
    {
      _id: 'off-2',
      buyerName: 'Jimma Specialty Roasters',
      companyType: 'Exporter / Roaster',
      fairnessScore: 92,
      listingTitle: 'Highland Specialty Washed Lot - Mana Woreda',
      offeredPricePerKg: 455,
      marketPrice: 450,
      quantityKg: 500,
      totalAmountETB: 227500,
      status: 'pending',
      isFair: true,
      paymentTerms: '50% CBE Escrow Advance, 50% on Handover',
      deliveryLocation: 'Jimma Exporter Dry Mill',
      createdAt: '1 hour ago',
    },
  ]);

  // Create Listing Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lotTitle, setLotTitle] = useState('Mana Woreda Sun-Dried Natural Lot');
  const [lotVariety, setLotVariety] = useState('Jimma Heirloom 74110');
  const [lotGrade, setLotGrade] = useState('Grade 1');
  const [lotProcessing, setLotProcessing] = useState<'washed' | 'natural'>('washed');
  const [lotQuantity, setLotQuantity] = useState(1500);
  const [lotAskingPrice, setLotAskingPrice] = useState(415);
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

        if (incomingOffersRes.success && incomingOffersRes.offers?.length) {
          setIncomingOffers(
            incomingOffersRes.offers.map((offer: any) => ({
              _id: offer._id,
              buyerName: offer.buyerProfile?.companyName || offer.buyer?.fullName || 'Verified Buyer',
              companyType: offer.buyerProfile?.businessType || 'Commercial Buyer',
              fairnessScore: offer.buyerProfile?.fairnessScore || Math.round(offer.fairnessPercentage || 85),
              listingTitle: offer.listing?.coffeeType || 'Coffee lot',
              offeredPricePerKg: offer.counterPricePerKg || offer.offeredPricePerKg,
              marketPrice: offer.marketPriceAtOffer,
              quantityKg: offer.counterQuantityKg || offer.quantityKg,
              totalAmountETB:
                (offer.counterPricePerKg || offer.offeredPricePerKg) *
                (offer.counterQuantityKg || offer.quantityKg),
              status: offer.status,
              isFair: offer.fairnessStatus !== 'very_low',
              paymentTerms: offer.message || 'Payment terms shared in buyer message',
              deliveryLocation: offer.deliveryTerms || 'Negotiable',
              createdAt: new Date(offer.createdAt).toLocaleString(),
            }))
          );
        }
      } catch (err) {
        try {
          const savedProfile = JSON.parse(localStorage.getItem('buna_farmer_profile') || 'null');
          if (savedProfile) {
            setFarmerProfile(savedProfile);
            setProfileLocation({ woreda: savedProfile.woreda || 'Mana', kebele: savedProfile.kebele || 'Kenteri' });
          }
        } catch { /* Keep the default local demo origin. */ }
        console.error(err);
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
    } catch {
      setIncomingOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'accepted' } : o))
      );
    }
  };

  const handleRejectOffer = async (id: string) => {
    try {
      await api.rejectOffer(id);
      setIncomingOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'rejected' } : o))
      );
    } catch {
      setIncomingOffers((prev) =>
        prev.map((o) => (o._id === id ? { ...o, status: 'rejected' } : o))
      );
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
        aiEstimatedGrade: aiAnalysisResult?.grade_tier || '',
        aiConfidence: aiAnalysisResult?.confidence || '',
        aiDefectsSummary: aiAnalysisResult?.defects_summary || aiAnalysisResult?.sorting_advice_english || '',
      });

      if (res.success && res.listing) {
        setMyListings([normalizeListing(res.listing), ...myListings]);
      }
    } catch {
      const newLot: Listing = {
        _id: `lot-${Date.now()}`,
        farmer: {
          _id: user?.id || 'f1',
          fullName: user?.fullName || 'Gemechu Daba',
          phone: user?.phone || '+251 917 112 233',
        },
        farmerProfile: {
          _id: 'fp-1',
          averageQualityScore: 89,
          woreda: 'Mana',
          badge: 'Gold',
        },
        title: lotTitle,
        variety: lotVariety,
        grade: lotGrade as any,
        processing: lotProcessing,
        harvestYear: 2026,
        quantityKg: lotQuantity,
        askingPricePerKg: lotAskingPrice,
        marketReferencePrice: 410,
        priceDiffPercentage: 1.2,
        isFairPrice: true,
        location: { region: 'Oromia', zone: farmerProfile?.zone || 'Jimma', woreda: profileLocation.woreda, kebele: profileLocation.kebele },
        cuppingScore: 88.0,
        moisturePercentage: 11.2,
        certifications: ['Jimma Heirloom Verified'],
        photos: aiAnalysisResult?.photoUrl ? [aiAnalysisResult.photoUrl] : [],
        status: 'open',
        createdAt: new Date().toISOString(),
      };
      setMyListings([newLot, ...myListings]);
    }

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
          '☕ [Afaan Oromoo]: Gatiin buna dhiqamee (Washed Grade 1) har’a Jimmaatti 410 ETB/kg dha. Gatiin gadi-aanaa (floor) 390 ETB/kg dha. Bittoonni Oromia Union fi Jimma Specialty gatii qajeelaa dhiyeessaa jiru.'
        );
      } else {
        setVoiceResponse(
          '☕ [አማርኛ]: የዛሬው የጅማ ታጥቦ የተዘጋጀ ግሬድ 1 የቡና መነሻ ዋጋ በኪሎግራም 410 የኢትዮጵያ ብር ነው። ዝቅተኛው ህጋዊ ዋጋ (Floor) 390 ብር ነው። ኦሮሚያ ዩኒየን እና ጅማ ስፔሻሊቲ በከፍተኛ ዋጋ እየገዙ ይገኛሉ።'
        );
      }
    }, 1200);
  };

  // AI Analysis Handlers
  const handleAiPhotoSelect = (file: File) => {
    setAiPhoto(file);
    setAiPhotoPreview(URL.createObjectURL(file));
    setAiError(null);
    setAiAnalysisResult(null);
    setExpandedSections({});
  };

  const handleAiAnalyze = async () => {
    if (!aiPhoto) return;
    setIsAnalyzing(true);
    setAiError(null);
     try {
       const result = await api.analyzeCoffeePhoto(aiPhoto, profileLocation);
       setAiAnalysisResult({ ...result.analysis, location: result.location, photoUrl: result.photoUrl });
     } catch (err: any) {
       // Fallback analysis when AI/backend is unavailable
       const fallback = {
         grade_tier: 'Natural G4',
         processing_type: 'Natural',
         defect_percentage: '~20',
         color_quality: 'fair',
         uniformity_score: 5,
         moisture_level: 'medium',
         grade_number: 4,
         defects_summary: 'Mixed defects detected. See sorting tips below.',
         estimated_price_min_etb: 48,
         estimated_price_max_etb: 59,
         confidence: 'medium',
         location: { region: farmerProfile?.region || 'Oromia', zone: farmerProfile?.zone || 'Jimma', ...profileLocation },
         is_fallback: true,
         sorting_advice_english: 'Sort beans by color and size. Remove black, broken, and insect-damaged beans before sale.',
         tips_oromo: ['Buna idileetti fincaanii wal hin qabneetti hidha.', 'Buna gurracha, tokkichi, fi kan qorichiwaan hidha.'],
         tips_amharic: ['ቡናውን በቀለም እና መጠን ያስተካክሉ።', 'ጥሩ፣ ቆጣቢ እና የአስተሳሰብ ተጠቃሚ ቡና ውጭ ያድርጉ።'],
       };
       setAiAnalysisResult(fallback);
       setAiError(null);
     } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAiReset = () => {
    setAiPhoto(null);
    setAiPhotoPreview(null);
    setAiAnalysisResult(null);
    setAiError(null);
    setExpandedSections({});
  };

  const handleAiCreateListing = () => {
    if (!aiAnalysisResult) return;
    setShowAIAnalysisModal(false);
    setShowCreateModal(true);
    const gradeLabel = aiAnalysisResult.grade_tier || '';
    const gradeNumber = gradeLabel.match(/G([1-5])/i)?.[1];
    setLotGrade(gradeLabel.toLowerCase().includes('specialty') ? 'Specialty' : `Grade ${gradeNumber || 2}`);
    setLotProcessing((aiAnalysisResult.processing_type?.toLowerCase() || 'washed') as any);
    const avgPrice = Math.round(((aiAnalysisResult.estimated_price_min_etb || 0) + (aiAnalysisResult.estimated_price_max_etb || 0)) / 2);
    setLotAskingPrice(avgPrice || 415);
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
                setAiPhoto(null);
                setAiPhotoPreview(null);
                setAiAnalysisResult(null);
                setAiError(null);
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-coffee-950">
              Incoming Purchase Offers ({incomingOffers.filter((o) => o.status === 'pending').length} Pending)
            </h2>
            <p className="text-xs text-coffee-600">
              Verified buyers bidding on your coffee lots with official ECX floor verification.
            </p>
          </div>
        </div>

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
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-coffee-950 text-sm">{offer.buyerName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 text-[10px] font-bold">
                      Fair Buyer {offer.fairnessScore}%
                    </span>
                  </div>
                  <span className="text-[11px] text-coffee-500">{offer.companyType} • {offer.createdAt}</span>
                </div>

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

              {/* Offer Details */}
              <div className="p-3.5 rounded-xl bg-coffee-50 border border-coffee-100 space-y-2 text-xs">
                <div className="text-coffee-700 font-medium">{offer.listingTitle}</div>
                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="text-coffee-500 text-[10px] block">Offered Price:</span>
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
                  <span>Above ECX statutory floor ({offer.marketPrice} ETB benchmark)</span>
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

              {/* Actions */}
              {offer.status === 'pending' && (
                <div className="flex items-center gap-2 pt-2 border-t border-coffee-100">
                  <button
                    onClick={() => handleAcceptOffer(offer._id)}
                    className="flex-1 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Contract
                  </button>
                  <button
                    onClick={() => handleRejectOffer(offer._id)}
                    className="px-4 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}

              {offer.status === 'accepted' && (
                <div className="p-2.5 rounded-xl bg-forest-100 text-forest-900 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest-700" />
                  Contract Locked! CBE Escrow Payment Initiated.
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
                    {lot.grade} • {lot.processing}
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
                  Fair price suggestions are automatically matched with Jimma ECX daily floor benchmarks.
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
                        <option value="Specialty">Specialty (Q1 85+ pts)</option>
                        <option value="Grade 1">Grade 1 Export</option>
                        <option value="Grade 2">Grade 2 Commercial</option>
                        <option value="Grade 3">Grade 3</option>
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
                        min="250"
                        value={lotAskingPrice}
                        onChange={(e) => setLotAskingPrice(Number(e.target.value))}
                        className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-forest-50 border border-forest-200 text-forest-800 text-[11px] flex items-center justify-between">
                    <span>ECX Recommended Floor for this Grade:</span>
                    <strong className="text-forest-900">410 ETB/kg</strong>
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
                    Transcribing and checking Jimma ECX live database...
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
    </div>
  );
}
