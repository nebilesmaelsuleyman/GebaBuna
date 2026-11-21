'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminStats } from '../../types';
import AdminRegistry from '../../components/admin/AdminRegistry';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Scale,
  Users,
  Store,
  DollarSign,
  Coffee,
  Building,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';

export default function AdminPortalPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalFarmers: 0,
    totalBuyers: 0,
    pendingVerifications: 0,
    totalListings: 0,
    completedTrades: 0,
    totalKgTraded: 0,
    totalETBValue: 0,
    avgPricePaid: 0,
    avgMarketPrice: 0,
    fairnessRatioOverall: 0,
    flaggedBuyersCount: 0,
  });
  const [pendingBuyers, setPendingBuyers] = useState<any[]>([]);
  const [flaggedBuyers, setFlaggedBuyers] = useState<any[]>([]);
  const [chartData, setChartData] = useState<Array<{ month: string; ecxBenchmark: number; avgPricePaid: number; kg: number }>>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [auditMessage, setAuditMessage] = useState<string | null>(null);

  const loadAdminData = React.useCallback(async () => {
      try {
        const [statsRes, pendingRes] = await Promise.all([api.getAdminStats(), api.getPendingBuyers()]);

        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
          if (statsRes.chartData) {
            setChartData(
              statsRes.chartData.map((point: any) => ({
                month: point.month,
                ecxBenchmark: point.marketPrice ?? point.ecxBenchmark,
                avgPricePaid: point.paidPrice ?? point.avgPricePaid,
                kg: point.kg ?? 0,
              }))
            );
          }
          if (statsRes.flaggedBuyers) {
            setFlaggedBuyers(statsRes.flaggedBuyers);
          }
        }

        if (pendingRes.success && pendingRes.buyers) {
          setPendingBuyers(pendingRes.buyers.map((buyer: any) => ({
            ...buyer,
            status: buyer.verificationStatus || buyer.status || 'pending',
            documents: buyer.uploadedDocuments || [],
          })));
        }
      } catch (err: any) {
        setLoadError(
          err?.status === 401 || err?.status === 403
            ? 'Sign in as the Jimma Agri Bureau admin to see live statistics.'
            : err?.message || 'Could not load admin statistics.'
        );
      }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApproveBuyer = async (id: string, name: string) => {
    try {
      await api.verifyBuyer(id, 'approve', 'Approved by Jimma Bureau officer', '', {
        validTradeLicense: true,
        validExportLicense: true,
        tinValid: true,
        noPastViolations: true,
      });

      setPendingBuyers((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'verified', verificationStatus: 'verified' } : b))
      );
      setStats((prev) => ({
        ...prev,
        pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
      }));
      setAuditMessage(`✓ Trade License verified for ${name}. Buyer granted live marketplace bidding access.`);
      setTimeout(() => setAuditMessage(null), 4000);
    } catch (err: any) {
      setAuditMessage(`⚠️ Failed to approve ${name}: ${err.message || 'server error'}`);
      setTimeout(() => setAuditMessage(null), 5000);
    }
  };

  const handleRejectBuyer = async (id: string, name: string) => {
    try {
      await api.verifyBuyer(
        id,
        'reject',
        'License verification failed in demo workflow',
        'Missing or invalid trade/export documentation.'
      );

      setPendingBuyers((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'rejected', verificationStatus: 'rejected' } : b))
      );
      setStats((prev) => ({
        ...prev,
        pendingVerifications: Math.max(0, prev.pendingVerifications - 1),
      }));
      setAuditMessage(`⚠️ Application rejected for ${name}. Notice dispatched to applicant.`);
      setTimeout(() => setAuditMessage(null), 4000);
    } catch (err: any) {
      setAuditMessage(`⚠️ Failed to reject ${name}: ${err.message || 'server error'}`);
      setTimeout(() => setAuditMessage(null), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {loadError && (
        <div className="rounded-2xl border border-cherry-200 bg-cherry-50 px-4 py-3 text-sm text-cherry-800">{loadError}</div>
      )}

      {/* Bureau Regulatory Seal Banner */}
      <div className="bg-gradient-to-r from-red-950 via-coffee-950 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-red-900/50 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-900 border border-red-700/60 flex items-center justify-center p-3 flex-shrink-0 shadow-lg">
              <ShieldCheck className="w-10 h-10 text-red-200" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                  Jimma Zone Agriculture & Natural Resources Bureau
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-red-800 text-red-100 text-xs font-bold">
                  Official Oversight
                </span>
              </div>
              <p className="text-xs text-coffee-200">
                Oromia Regional Government • Smallholder Coffee Price Protection & Verification Registry
              </p>
              <div className="text-[11px] text-gold-300 font-medium">
                Officer: {user?.fullName || 'Not signed in'}
              </div>
            </div>
          </div>
        </div>

        {/* Bureau KPI Grid */}
        <div className="mt-6 space-y-4 border-t border-red-900/60 pt-6 text-xs">
          {[
            {
              title: 'People',
              items: [
                { label: 'Active farmers', value: stats.totalFarmers.toLocaleString(), tone: 'text-white' },
                { label: 'Active buyers', value: stats.totalBuyers.toLocaleString(), tone: 'text-white' },
                { label: 'Verified buyers', value: (stats.verifiedBuyers ?? 0).toLocaleString(), tone: 'text-forest-300' },
                { label: 'Pending approvals', value: stats.pendingVerifications.toLocaleString(), tone: 'text-amber-300' },
                { label: 'Removed accounts', value: (stats.removedUsers ?? 0).toLocaleString(), tone: 'text-red-300' },
                { label: 'Watchlist (fairness < 50)', value: stats.flaggedBuyersCount.toLocaleString(), tone: 'text-red-300' },
              ],
            },
            {
              title: 'Market',
              items: [
                { label: 'Open lots', value: `${(stats.openListings ?? 0).toLocaleString()} · ${(stats.openKgListed ?? 0).toLocaleString()} kg`, tone: 'text-white' },
                { label: 'Open offers', value: (stats.openOffers ?? 0).toLocaleString(), tone: 'text-white' },
                { label: 'Trades in progress', value: (stats.tradesInProgress ?? 0).toLocaleString(), tone: 'text-white' },
                { label: 'Settled trades', value: stats.completedTrades.toLocaleString(), tone: 'text-white' },
                { label: 'Volume traded', value: `${stats.totalKgTraded.toLocaleString()} kg`, tone: 'text-gold-400' },
                { label: 'Paid to farmers', value: `${(stats.totalETBValue / 1000000).toFixed(2)}M ETB`, tone: 'text-gold-400' },
                { label: 'Avg paid vs reference', value: `${stats.avgPricePaid.toLocaleString()} / ${stats.avgMarketPrice.toLocaleString()} ETB · ${stats.fairnessRatioOverall}%`, tone: 'text-forest-300' },
              ],
            },
          ].map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-coffee-400">{group.title}</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                {group.items.map((item) => (
                  <div key={item.label}>
                    <span className="block text-[11px] text-coffee-300">{item.label}</span>
                    <span className={`text-base font-bold sm:text-lg ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {auditMessage && (
        <div className="p-4 rounded-2xl bg-forest-900 text-white border border-forest-600 shadow-md flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-forest-300 flex-shrink-0" />
          <span>{auditMessage}</span>
        </div>
      )}

      {/* Verification Queue & Flagged Predatory Middlemen Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Verification Queue (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-coffee-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-coffee-100">
            <div>
              <h2 className="text-lg font-bold text-coffee-950 flex items-center gap-2">
                <Building className="w-5 h-5 text-coffee-800" />
                Buyer Verification Queue ({pendingBuyers.filter((b) => b.status === 'pending').length})
              </h2>
              <span className="text-xs text-coffee-600">
                Authenticate Trade Licenses & TIN numbers with Ministry of Trade databases before allowing coffee bids.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
              Verification Required
            </span>
          </div>

          <div className="space-y-4">
            {pendingBuyers.map((buyer) => (
              <div
                key={buyer._id}
                className="p-5 rounded-2xl bg-coffee-50/60 border border-coffee-200 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-coffee-950 text-base">{buyer.companyName}</h3>
                    <div className="text-xs text-coffee-600">
                      Owner: <strong>{buyer.ownerName}</strong> ({buyer.businessType}) • {buyer.phone}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto ${
                      buyer.status === 'verified'
                        ? 'bg-forest-600 text-white'
                        : buyer.status === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-500 text-coffee-950'
                    }`}
                  >
                    {buyer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs py-2 px-3 rounded-xl bg-white border border-coffee-100">
                  <div>
                    <span className="text-coffee-500 text-[10px] block">License Number:</span>
                    <strong className="text-coffee-900 font-mono">{buyer.tradeLicenseNumber}</strong>
                  </div>
                  <div>
                    <span className="text-coffee-500 text-[10px] block">TIN Registration:</span>
                    <strong className="text-coffee-900 font-mono">{buyer.tinNumber}</strong>
                  </div>
                  <div>
                    <span className="text-coffee-500 text-[10px] block">CBE Escrow Bank:</span>
                    <strong className="text-coffee-900 truncate block">Jimma Branch</strong>
                  </div>
                </div>

                <div className="text-xs text-coffee-700 flex items-center gap-3">
                  <span className="font-semibold text-coffee-900">Submitted Documents:</span>
                  {buyer.documents?.length ? buyer.documents.map((doc: any, index: number) => (
                    <a key={`${doc.fileUrl}-${index}`} href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold-700 hover:underline">
                      <FileText className="w-3.5 h-3.5" /> {doc.title} <span className="text-coffee-500">({String(doc.docType || 'other').replaceAll('_', ' ')})</span>
                    </a>
                  )) : <span className="text-red-700">No supporting documents uploaded</span>}
                </div>

                {buyer.status === 'pending' ? (
                  <div className="flex gap-3 pt-2 border-t border-coffee-200">
                    <button
                      onClick={() => handleApproveBuyer(buyer._id, buyer.companyName)}
                      className="px-4 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" /> Approve Commercial License
                    </button>
                    <button
                      onClick={() => handleRejectBuyer(buyer._id, buyer.companyName)}
                      className="px-4 py-2 rounded-xl border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-xs transition-colors"
                    >
                      <X className="w-4 h-4" /> Reject License
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-forest-700 font-bold flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Verification decision logged into regional smallholder registry.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Flagged Predatory Middlemen (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-coffee-200 p-6 shadow-sm space-y-6">
          <div className="pb-3 border-b border-coffee-100">
            <h3 className="font-bold text-coffee-950 text-base flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Predatory Offer Watchlist
            </h3>
            <p className="text-xs text-coffee-600 mt-0.5">
              Buyers flagged for bidding below ECX statutory floor prices.
            </p>
          </div>

          <div className="space-y-4">
            {flaggedBuyers.map((fb) => (
              <div
                key={fb._id}
                className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-red-950 text-sm">{fb.companyName}</h4>
                    <span className="text-[11px] text-red-800">Agent: {fb.ownerName || fb.user?.fullName || 'Unknown'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-red-700 text-white text-[10px] font-black uppercase tracking-wider">
                    {fb.user?.isActive === false ? 'Removed' : fb.verificationStatus || 'flagged'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-white/80 border border-red-100">
                  <div>
                    <span className="text-[10px] text-red-700 block">Fairness Score:</span>
                    <strong className="text-red-950 font-black text-sm">{fb.fairnessScore}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-700 block">Volume bought:</span>
                    <strong className="text-red-950 font-black text-sm">{(fb.totalKgBought || 0).toLocaleString()} kg</strong>
                  </div>
                </div>

                {(fb.rejectionReason || fb.adminNotes || fb.reason) && (
                  <p className="text-[11px] text-red-900 leading-relaxed bg-white/60 p-2.5 rounded-lg border border-red-100">
                    {fb.rejectionReason || fb.adminNotes || fb.reason}
                  </p>
                )}

                <div className="text-[11px] text-red-800 font-semibold pt-1">
                  {fb.verificationStatus === 'verified'
                    ? 'Still allowed to bid. Review below and suspend or remove if floor violations are confirmed.'
                    : 'Cannot bid: only verified buyers can make offers.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regional Market Fairness Trend Chart */}
      <div className="bg-white rounded-2xl border border-coffee-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-coffee-100">
          <div>
            <h3 className="font-bold text-coffee-950 text-base">
              Jimma Zone Market Fairness Trend
            </h3>
            <span className="text-xs text-coffee-600">
              Comparison between official ECX statutory benchmarks and actual average prices paid by commercial buyers to smallholders.
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-coffee-800">
              <span className="w-3 h-3 rounded bg-coffee-800 inline-block" /> ECX Floor Benchmark
            </span>
            <span className="flex items-center gap-1.5 text-forest-700">
              <span className="w-3 h-3 rounded bg-forest-600 inline-block" /> Actual Price Paid to Farmer
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0e6dc" />
              <XAxis dataKey="month" stroke="#7e3e29" fontSize={12} />
              <YAxis stroke="#7e3e29" fontSize={12} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#230e09',
                  borderRadius: '12px',
                  color: '#fff',
                  border: '1px solid #7e3e29',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="ecxBenchmark" fill="#cf9067" name="ECX Benchmark (ETB/kg)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="avgPricePaid" fill="#438567" name="Actual Price Paid (ETB/kg)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 rounded-xl bg-forest-50 border border-forest-200 text-xs text-forest-900 leading-relaxed">
          {chartData.some((p) => p.ecxBenchmark > 0) ? (() => {
            const traded = chartData.filter((p) => p.ecxBenchmark > 0);
            const avgGap = traded.reduce((sum, p) => sum + (p.avgPricePaid - p.ecxBenchmark) / p.ecxBenchmark, 0) / traded.length;
            const pct = Math.round(avgGap * 1000) / 10;
            return <><strong>From recorded trades:</strong> farmers were paid on average <strong>{pct > 0 ? '+' : ''}{pct}%</strong> relative to the reference price over the months shown.</>;
          })() : 'No settled trades yet. This summary is calculated from real trades once they are recorded.'}
        </div>
      </div>

      <AdminRegistry onChanged={loadAdminData} />
    </div>
  );
}
