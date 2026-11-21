'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../services/api';
import { Trade } from '../../../../types';
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
  Star,
  Medal,
  BadgePercent,
  BarChart2,
  Users,
  Package,
  MapPin,
  UserCheck,
  CreditCard,
  AlertTriangle,
  HelpCircle,
  Flag,
  Crown,
  Eye,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useLanguage } from '../../../../context/LanguageContext';

// Grade color mapping (module-level so ScoreCard can use it)
const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A+': return 'bg-gold-500 text-white';
    case 'A': return 'bg-forest-600 text-white';
    case 'B': return 'bg-blue-600 text-white';
    case 'C': return 'bg-amber-600 text-white';
    case 'F': return 'bg-red-600 text-white';
    default: return 'bg-coffee-400 text-white';
  }
};

const getGradeIcon = (grade: string) => {
  switch (grade) {
    case 'A+': return <Crown className="w-4 h-4" />;
    case 'A': return <Medal className="w-4 h-4" />;
    case 'B': return <Star className="w-4 h-4" />;
    case 'C': return <BadgePercent className="w-4 h-4" />;
    case 'F': return <Flag className="w-4 h-4" />;
    default: return <ShieldCheck className="w-4 h-4" />;
  }
};

export default function TradeReportCardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState(false);

  // Translations
  const translations = {
    om: {
      title: 'Kaartaa Warraquu',
      subtitle: 'Buusuun Biyya Jimmaatti',
      tradeRef: 'Koodii Guddifachaa',
      date: 'Guyyaa',
      farmer: 'Qottuu',
      buyer: 'Gadaa',
      woreda: 'Woreda',
      coffeeGrade: 'Gireesii Buna',
      quantity: 'Miidhaa (kg)',
      pricePerKg: 'Gatii kg',
      floorPrice: 'Gatii Gabaabaa',
      totalETB: 'Waldaa ETB',
      settlementDate: "Guyyaa Deebi'ee",
      reportCard: 'Kaartaa Warraquu',
      priceGrade: 'Gireesii Gatii',
      premiumAboveFloor: 'Gatii Ol Kaabaa',
      paymentSpeed: "Xiqqina Deebi'ii",
      farmerFeedback: 'Fayyadamaa Qottuu',
      printReceipt: 'Baafii Kaffaltii',
      downloadPdf: "PDF Socho'uu",
      backToTrades: "Deebi'ee Guddifachaa",
      verifiedTrade: 'Guddifachaa Hubattee',
      smallholderImpact: 'Ballasuu Qottuu Guddaa',
      priceFairness: 'Mirkaneessa Gatii',
      paymentTimeliness: "Xiqqina Deebi'ii",
      qualityDelivered: "Kwaliteettii Deebi'ee",
      overallScore: 'Waldaa',
      gradeLegend: 'A+ = Gatii ol kaabaa, A = Gatii tola, B = Gireesii dhugaa, C = Gatii gadi gabaabaa, F = Gatii gatii dhufaa',
      premium: 'Gatii Ol Kaabaa',
      aboveFloor: 'Gatii gabaabaa irratti',
      fairBuyer: 'Gadaa Tola',
      completed: "Milkaa'ee",
      premiumAmount: 'ETB/kg ol kaabaa',
      paymentWithin: 'keessa',
      hours: "saa'aa",
      days: 'guyyaa',
      officialRecord: 'Buusuun Opishaa Gulufaa Jimma Zone Agri Bureau',
      taxReceipt: 'Baafii Kaffaltii',
      contractPerformance: "Danda'ama Guddifachaa",
      smallholderReport: 'Warraga Qottuu Guddaa',
      viewDetails: 'Baloo Biyyee',
      close: 'Dabali',
    },
    am: {
      title: 'የግብይት ሪፖርት ካርድ',
      subtitle: 'የጅማ ዞን ባለሙያ ቁጠባ',
      tradeRef: 'የግብይት ኮድ',
      date: 'ቀን',
      farmer: 'ገበሬ',
      buyer: 'ገዢ',
      woreda: 'ወረዳ',
      coffeeGrade: 'የቡና ደረጃ',
      quantity: 'መጠን (ኪ.ግ)',
      pricePerKg: 'ዋጋ በኪ.ግ',
      floorPrice: 'የታች ዋጋ',
      totalETB: 'ጠቅላላ በኢትቢ',
      settlementDate: 'የፈቃድ ቀን',
      reportCard: 'የሪፖርት ካርድ',
      priceGrade: 'የዋጋ ደረጃ',
      premiumAboveFloor: 'ከታች ዋጋ በላይ የሚከፈለው',
      paymentSpeed: 'የክፍያ ፍጥነት',
      farmerFeedback: 'የገበሬ አስተያየት',
      printReceipt: 'ሪሲት አትም',
      downloadPdf: 'PDF አውርድ',
      backToTrades: 'ወደ ግብይቶች ተመለስ',
      verifiedTrade: 'የተረጋገጠ ግብይት',
      smallholderImpact: 'ላይ ያሉ ገበሬዎች በላይ የሚያስፈልገው',
      priceFairness: 'የዋጋ ፍትሐት',
      paymentTimeliness: 'የክፍያ ጊዜ ፍትሐት',
      qualityDelivered: 'የተሰጠው ዋና ጥራት',
      overallScore: 'ጠቅላላ ውጤት',
      gradeLegend: 'A+ = በጣም ጥሩ, A = ጥሩ, B = መካከለኛ, C = በታች, F = አልተሻለም',
      premium: 'ከፍተኛ ዋጋ',
      aboveFloor: 'የታች ዋጋ ላይ',
      fairBuyer: 'ፍትሐት ያለው ገዢ',
      completed: 'ተጠናቋል',
      premiumAmount: 'ኢትቢ/ኪ.ግ ከፍተኛ',
      paymentWithin: 'ውስጥ',
      hours: 'ሰዓት',
      days: 'ቀን',
      officialRecord: 'የጅማ ዞን የሚስተር ቢሮ የተሟላ የቁጠባ መረጃ',
      taxReceipt: 'የካፍያ ሪሲት',
      contractPerformance: 'የግብይት አፈፃፀም',
      smallholderReport: 'የሚከሰቱ ገበሬዎች ሪፖርት',
      viewDetails: '᥊ሆነቱን ይመልከቱ',
      close: 'ዝጋ',
    },
    en: {
      title: 'Trade Report Card',
      subtitle: 'Jimma Zone Official Record',
      tradeRef: 'Trade Reference',
      date: 'Date',
      farmer: 'Farmer',
      buyer: 'Buyer',
      woreda: 'Woreda',
      coffeeGrade: 'Coffee Grade',
      quantity: 'Quantity (kg)',
      pricePerKg: 'Price/kg',
      floorPrice: 'Floor Price',
      totalETB: 'Total ETB',
      settlementDate: 'Settlement Date',
      reportCard: 'Report Card',
      priceGrade: 'Price Grade',
      premiumAboveFloor: 'Premium Above Floor',
      paymentSpeed: 'Payment Speed',
      farmerFeedback: 'Farmer Feedback',
      printReceipt: 'Print Receipt',
      downloadPdf: 'Download PDF',
      backToTrades: 'Back to Trades',
      verifiedTrade: 'Verified Trade',
      smallholderImpact: 'Smallholder Impact',
      priceFairness: 'Price Fairness',
      paymentTimeliness: 'Payment Timeliness',
      qualityDelivered: 'Quality Delivered',
      overallScore: 'Overall Score',
      gradeLegend: 'A+ = Premium, A = Excellent, B = Good, C = Below Avg, F = Unfair',
      premium: 'Premium',
      aboveFloor: 'Above Floor',
      fairBuyer: 'Fair Buyer',
      completed: 'Completed',
      premiumAmount: 'ETB/kg Premium',
      paymentWithin: 'within',
      hours: 'hrs',
      days: 'days',
      officialRecord: 'Jimma Zone Agriculture Bureau Official Record',
      taxReceipt: 'Tax Receipt',
      contractPerformance: 'Contract Performance',
      smallholderReport: 'Smallholder Report',
      viewDetails: 'View Details',
      close: 'Close',
    },
  };

  const tr = translations[language] || translations.en;

  useEffect(() => {
    async function loadTrade() {
      try {
        setLoading(true);
        const res = await api.getTrade(tradeId);
        if (res.success && res.trade) {
          setTrade(res.trade);
        } else {
          setError('Trade not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load trade');
      } finally {
        setLoading(false);
      }
    }
    loadTrade();
  }, [tradeId]);

  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-1.5 h-12">
            <span className="w-2 h-8 bg-gold-400 rounded-full animate-bounce" />
            <span className="w-2 h-10 bg-gold-400 rounded-full animate-bounce delay-100" />
            <span className="w-2 h-6 bg-gold-400 rounded-full animate-bounce delay-200" />
            <span className="w-2 h-9 bg-gold-400 rounded-full animate-bounce" />
          </div>
          <p className="text-coffee-600">{t('Loading report card...') || 'Loading report card...'}</p>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-coffee-900 mb-2">{tr.close}</h2>
        <p className="text-coffee-600 mb-6">{error || 'Trade not found'}</p>
        <button
          onClick={() => router.push('/buyer/trades')}
          className="px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl font-semibold transition-colors"
        >
          {tr.backToTrades}
        </button>
      </div>
    );
  }

  const reportCard = trade.reportCard;
  const premiumAboveFloor = trade.agreedPricePerKg - trade.marketReferencePrice;
  const premiumPercentage = trade.marketReferencePrice > 0
    ? ((premiumAboveFloor / trade.marketReferencePrice) * 100).toFixed(1)
    : '0';

  // Calculate overall score (0-100)
  const priceScore = reportCard.priceFairnessGrade === 'A+' ? 100 :
                     reportCard.priceFairnessGrade === 'A' ? 90 :
                     reportCard.priceFairnessGrade === 'B' ? 75 :
                     reportCard.priceFairnessGrade === 'C' ? 60 : 40;
  const paymentScore = reportCard.paymentTimelinessScore || 85;
  const qualityScore = 90;
  const overallScore = Math.round((priceScore + paymentScore + qualityScore) / 3);

  return (
    <div className={printMode ? 'print-only' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6'}>
      {/* Print Header */}
      <div className="print:hidden flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-coffee-100 hover:bg-coffee-200 text-coffee-700 transition-colors"
          aria-label="Back"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 rounded-xl bg-coffee-100 hover:bg-coffee-200 text-coffee-700 font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            {tr.downloadPdf}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-forest-600 hover:bg-forest-700 text-white font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            {tr.printReceipt}
          </button>
        </div>
      </div>

      {/* Report Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-coffee-200 overflow-hidden print:shadow-none print:border-2 print:border-coffee-400">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-coffee-950 via-forest-950 to-coffee-900 text-white p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <Coffee className="w-full h-full text-gold-400" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gold-500 to-amber-600 p-1.5 flex-shrink-0 shadow-lg">
                <div className="w-full h-full rounded-xl bg-coffee-950 flex items-center justify-center">
                  <Coffee className="w-8 h-8 sm:w-10 sm:h-10 text-gold-400" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{tr.title}</h1>
                <p className="text-gold-200 text-sm sm:text-base">{tr.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-right sm:text-left">
              <div className="px-4 py-2 rounded-xl bg-gold-500/20 border border-gold-500/50 text-gold-100 text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {tr.verifiedTrade}
              </div>
              <div className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/50 text-green-200 text-xs font-bold uppercase tracking-wider">
                {tr.completed}
              </div>
            </div>
          </div>
        </div>

        {/* Trade Reference & Date */}
        <div className="px-6 sm:px-8 py-4 border-b border-coffee-100 bg-coffee-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-gold-700" />
            </div>
            <div>
              <span className="text-[10px] text-coffee-500 uppercase tracking-wider block">{tr.tradeRef}</span>
              <span className="font-mono text-lg font-bold text-coffee-950">{trade.tradeReference}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-coffee-700">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{trade.contractDate}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-4 border-l border-coffee-200 pl-4">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{tr.settlementDate}: {trade.settlementDate}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Party Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Farmer Card */}
            <div className="bg-forest-50/50 border border-forest-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-forest-800">
                <Users className="w-5 h-5" />
                <span className="font-bold text-base">{tr.farmer}</span>
              </div>
              <div className="space-y-2 pl-7 border-l-2 border-forest-300">
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">{trade.farmer.fullName}</span>
                  <span className="font-semibold text-coffee-950">{trade.farmerProfile?.fullName || trade.farmer.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">{tr.woreda}</span>
                  <span className="font-semibold text-coffee-950">{trade.listing?.location?.woreda || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">Phone</span>
                  <span className="font-semibold text-coffee-950">{trade.farmer.phone}</span>
                </div>
                {trade.farmerProfile && (
                  <div className="flex justify-between text-sm">
                    <span className="text-coffee-600">Quality Rank</span>
                    <span className="font-bold text-gold-700 flex items-center gap-1">
                      <Medal className="w-3.5 h-3.5" /> #{trade.farmerProfile.qualityRank}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Card */}
            <div className="bg-coffee-50/50 border border-coffee-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-coffee-800">
                <Store className="w-5 h-5" />
                <span className="font-bold text-base">{tr.buyer}</span>
              </div>
              <div className="space-y-2 pl-7 border-l-2 border-coffee-300">
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">{trade.buyer.fullName}</span>
                  <span className="font-semibold text-coffee-950">{trade.buyerProfile?.companyName || trade.buyer.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">Business Type</span>
                  <span className="font-semibold text-coffee-950 capitalize">{trade.buyerProfile?.businessType || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-coffee-600">Fairness Score</span>
                  <span className="font-bold text-forest-700 flex items-center gap-1">
                    <BadgePercent className="w-3.5 h-3.5" /> {trade.buyerProfile?.fairnessScore || '—'}%
                  </span>
                </div>
                {trade.buyerProfile && (
                  <div className="flex justify-between text-sm">
                    <span className="text-coffee-600">Fairness Rank</span>
                    <span className="font-bold text-gold-700 flex items-center gap-1">
                      <Medal className="w-3.5 h-3.5" /> #{trade.buyerProfile.fairnessRank}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coffee Lot Details */}
          <div className="bg-white border border-coffee-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-coffee-900 border-b border-coffee-100 pb-3">
              <Coffee className="w-5 h-5" />
              <h3 className="font-bold text-lg">{tr.coffeeGrade}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">{tr.quantity}</span>
                <span className="font-bold text-xl text-coffee-950">{trade.agreedQuantityKg.toLocaleString()} kg</span>
              </div>
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">{tr.pricePerKg}</span>
                <span className="font-bold text-xl text-forest-700">{trade.agreedPricePerKg} ETB/kg</span>
              </div>
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">{tr.floorPrice}</span>
                <span className="font-bold text-xl text-amber-700">{trade.marketReferencePrice} ETB/kg</span>
              </div>
              <div className="p-3 rounded-xl bg-gold-50/50 border border-gold-200">
                <span className="text-[10px] text-gold-700 uppercase tracking-wider block mb-1">{tr.premium}</span>
                <span className="font-bold text-xl text-gold-800 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +{premiumAboveFloor} ETB/kg
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">{tr.totalETB}</span>
                <span className="font-bold text-xl text-coffee-950">{trade.totalAmountETB.toLocaleString()} ETB</span>
              </div>
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">{tr.woreda}</span>
                <span className="font-bold text-xl text-coffee-950">{trade.listing?.location?.woreda || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">Grade</span>
                <span className="font-bold text-xl text-coffee-950">{trade.listing?.grade || '—'}</span>
              </div>
              <div className="p-3 rounded-xl bg-coffee-50/50">
                <span className="text-[10px] text-coffee-500 uppercase tracking-wider block mb-1">Processing</span>
                <span className="font-bold text-xl text-coffee-950 capitalize">{trade.listing?.processing || '—'}</span>
              </div>
            </div>
          </div>

          {/* Report Card Scores */}
          <div className="bg-gradient-to-r from-coffee-50 to-forest-50 border border-coffee-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-coffee-900">
              <BarChart2 className="w-5 h-5" />
              <h3 className="font-bold text-lg">{tr.reportCard}</h3>
            </div>

            {/* Overall Score */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-coffee-200">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500 to-amber-600 flex items-center justify-center text-white">
                  <span className="text-3xl font-black">{overallScore}</span>
                </div>
                <div>
                  <span className="font-bold text-lg text-coffee-950">{tr.overallScore}</span>
                  <p className="text-xs text-coffee-500">/ 100</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${overallScore >= 90 ? 'bg-gold-100 text-gold-800' : overallScore >= 75 ? 'bg-forest-100 text-forest-800' : overallScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                  {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : overallScore >= 60 ? 'Fair' : 'Poor'}
                </span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreCard
                icon={<DollarSign className="w-5 h-5" />}
                title={tr.priceFairness}
                score={priceScore}
                grade={reportCard.priceFairnessGrade}
                color="gold"
                detail={`${tr.premiumAboveFloor}: ${reportCard.premiumOverFloorETB}`}
              />
              <ScoreCard
                icon={<CreditCard className="w-5 h-5" />}
                title={tr.paymentTimeliness}
                score={paymentScore}
                grade={reportCard.paymentTimelinessScore >= 90 ? 'A+' : reportCard.paymentTimelinessScore >= 80 ? 'A' : 'B'}
                color="forest"
                detail={`${reportCard.paymentTimelinessScore}%`}
              />
              <ScoreCard
                icon={<Package className="w-5 h-5" />}
                title={tr.qualityDelivered}
                score={qualityScore}
                grade='A'
                color="coffee"
                detail={`${tr.farmerFeedback}`}
              />
            </div>
          </div>

          {/* Farmer Feedback */}
          <div className="bg-coffee-50/50 border border-coffee-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-coffee-900 mb-3">
              <MessageSquare className="w-5 h-5" />
              <h3 className="font-bold text-lg">{tr.farmerFeedback}</h3>
            </div>
            <p className="text-coffee-700 italic leading-relaxed">"{trade.reportCard?.notes || reportCard.notes || 'No feedback provided.'}"</p>
          </div>

          {/* Official Footer */}
          <div className="border-t-2 border-coffee-200 pt-4 space-y-2 text-center text-sm">
            <p className="font-bold text-coffee-900">{tr.officialRecord}</p>
            <p className="text-coffee-600">Buusuun Kaffaltii Jimma Zone Agri Bureau | የጅማ ዞን የሚስተር ቢሮ የተሟላ</p>
            <p className="text-[10px] text-coffee-400 uppercase tracking-wider">
              Buna Fair Price (ቡና ዋጋ) Platform | Trade ID: {trade._id} | Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function ScoreCard({ icon, title, score, grade, color, detail }: {
  icon: React.ReactNode;
  title: string;
  score: number;
  grade: string;
  color: 'gold' | 'forest' | 'coffee';
  detail: string;
}) {
  const colors = {
    gold: { bg: 'bg-gold-50', border: 'border-gold-200', text: 'text-gold-800', iconBg: 'bg-gold-100' },
    forest: { bg: 'bg-forest-50', border: 'border-forest-200', text: 'text-forest-800', iconBg: 'bg-forest-100' },
    coffee: { bg: 'bg-coffee-50', border: 'border-coffee-200', text: 'text-coffee-800', iconBg: 'bg-coffee-100' },
  };
  const c = colors[color];

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className={`${c.iconBg} p-2 rounded-xl`}>{icon}</div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-black ${getGradeColor(grade)}`}>
          {grade} {getGradeIcon(grade)}
        </span>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-coffee-600">{title}</span>
        <span className="text-2xl font-black text-coffee-950">{score}</span>
      </div>
      <p className={`text-xs ${c.text} font-medium`}>{detail}</p>
    </div>
  );
}

function Calendar({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MessageSquare({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
