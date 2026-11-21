'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { History, Leaf, Receipt, RotateCcw, Search, Store, UserX } from 'lucide-react';
import { api } from '../../services/api';
import { formatGrade } from '../../utils/coffeePrices';
import { AdminAuditEntry, AdminTradeRow, AdminUserRow } from '../../types';

type Tab = 'farmer' | 'buyer' | 'trades' | 'audit';
type StatusFilter = 'all' | 'active' | 'removed';

const kg = (value: number) => `${Math.round(value || 0).toLocaleString()} kg`;
const etb = (value: number) => `${Math.round(value || 0).toLocaleString()} ETB`;
const date = (value?: string) => (value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function PremiumBadge({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-coffee-400">—</span>;
  const tone = pct >= 0 ? 'bg-forest-50 text-forest-800' : pct >= -7 ? 'bg-amber-50 text-amber-800' : 'bg-cherry-50 text-cherry-800';
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{pct > 0 ? '+' : ''}{pct}%</span>;
}

function VerificationBadge({ status }: { status?: string }) {
  const tone: Record<string, string> = {
    verified: 'bg-forest-600 text-white',
    pending: 'bg-amber-400 text-coffee-950',
    rejected: 'bg-cherry-600 text-white',
    suspended: 'bg-coffee-800 text-white',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone[status || ''] || 'bg-coffee-100 text-coffee-700'}`}>
      {status || 'unverified'}
    </span>
  );
}

const AUDIT_LABELS: Record<AdminAuditEntry['action'], string> = {
  user_removed: 'Removed account',
  user_restored: 'Restored account',
  buyer_approved: 'Approved buyer',
  buyer_rejected: 'Rejected buyer',
  buyer_suspended: 'Suspended buyer',
};

export default function AdminRegistry({ onChanged }: { onChanged?: () => void }) {
  const [tab, setTab] = useState<Tab>('farmer');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [trades, setTrades] = useState<AdminTradeRow[]>([]);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'trades') setTrades((await api.getAdminTrades()).trades);
      else if (tab === 'audit') setAudit((await api.getAuditLog()).entries);
      else setUsers((await api.getAdminUsers(tab, status, submittedQuery)).users);
    } catch (err: any) {
      setError(err?.message || 'Could not load records.');
    } finally {
      setLoading(false);
    }
  }, [tab, status, submittedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setRemovingId(null);
    setNotice(null);
  };

  const confirmRemove = async (row: AdminUserRow) => {
    if (removeReason.trim().length < 5) {
      setError('Write a reason of at least 5 characters. It is stored in the audit log.');
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      const res = await api.removeUser(row.id, removeReason.trim());
      setNotice(res.message);
      setRemovingId(null);
      setRemoveReason('');
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Could not remove this account.');
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (row: AdminUserRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      const res = await api.restoreUser(row.id);
      setNotice(res.message);
      await load();
      onChanged?.();
    } catch (err: any) {
      setError(err?.message || 'Could not restore this account.');
    } finally {
      setBusyId(null);
    }
  };

  const totals = users.reduce(
    (sum, u) => ({ kg: sum.kg + (u.kgTraded || 0), etb: sum.etb + (u.etbTraded || 0), trades: sum.trades + (u.settledTrades || 0) }),
    { kg: 0, etb: 0, trades: 0 }
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'farmer', label: 'Farmers', icon: <Leaf className="h-4 w-4" /> },
    { id: 'buyer', label: 'Buyers', icon: <Store className="h-4 w-4" /> },
    { id: 'trades', label: 'Trades', icon: <Receipt className="h-4 w-4" /> },
    { id: 'audit', label: 'Audit log', icon: <History className="h-4 w-4" /> },
  ];

  const actionCell = (row: AdminUserRow) =>
    row.isActive ? (
      <button
        onClick={() => { setRemovingId(row.id); setRemoveReason(''); setError(null); }}
        className="inline-flex items-center gap-1 rounded-lg border border-cherry-200 px-2.5 py-1.5 text-[11px] font-bold text-cherry-700 transition hover:bg-cherry-50"
      >
        <UserX className="h-3.5 w-3.5" /> Remove
      </button>
    ) : (
      <button
        onClick={() => restore(row)}
        disabled={busyId === row.id}
        className="inline-flex items-center gap-1 rounded-lg border border-forest-200 px-2.5 py-1.5 text-[11px] font-bold text-forest-700 transition hover:bg-forest-50 disabled:opacity-50"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Restore
      </button>
    );

  const statusCell = (row: AdminUserRow) =>
    row.isActive ? (
      <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-bold text-forest-800">Active</span>
    ) : (
      <div>
        <span className="rounded-full bg-cherry-100 px-2 py-0.5 text-[11px] font-bold text-cherry-800">Removed {date(row.removedAt)}</span>
        {row.removedReason && <p className="mt-1 max-w-[180px] text-[11px] leading-snug text-coffee-500">{row.removedReason}</p>}
      </div>
    );

  const removeRow = (row: AdminUserRow, colSpan: number) =>
    removingId === row.id && (
      <tr className="bg-cherry-50/60">
        <td colSpan={colSpan} className="px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-xs font-semibold text-cherry-900 sm:w-64">
              Remove {row.companyName || row.fullName}? Sign-in is blocked and open {tab === 'farmer' ? 'listings and offers' : 'offers'} are withdrawn. Trade history is kept.
            </p>
            <input
              autoFocus
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmRemove(row)}
              placeholder="Reason (stored in the audit log)"
              className="flex-1 rounded-lg border border-cherry-200 bg-white px-3 py-2 text-xs outline-none focus:border-cherry-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmRemove(row)}
                disabled={busyId === row.id}
                className="rounded-lg bg-cherry-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-cherry-500 disabled:opacity-50"
              >
                {busyId === row.id ? 'Removing…' : 'Confirm removal'}
              </button>
              <button onClick={() => setRemovingId(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-coffee-700 hover:bg-white">
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );

  const th = 'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-coffee-500';
  const td = 'px-4 py-3 align-top text-xs text-coffee-900';

  return (
    <section className="space-y-5 rounded-2xl border border-coffee-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-coffee-100 pb-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-bold text-coffee-950">Registry & enforcement</h2>
          <p className="mt-0.5 text-xs text-coffee-600">Every farmer and buyer, what they sold or bought, every trade, and every decision this office has made.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-coffee-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
                tab === t.id ? 'bg-white text-coffee-950 shadow-sm' : 'text-coffee-600 hover:text-coffee-900'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {(tab === 'farmer' || tab === 'buyer') && (
        <form
          onSubmit={(e) => { e.preventDefault(); setSubmittedQuery(query.trim()); }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'buyer' ? 'Search company, owner, license, TIN, phone or email, then press Enter' : 'Search name, phone, woreda, kebele or cooperative, then press Enter'}
              className="w-full rounded-xl border border-coffee-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-coffee-400"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-xl border border-coffee-200 bg-white px-3 py-2.5 text-xs font-semibold text-coffee-800"
          >
            <option value="all">All accounts</option>
            <option value="active">Active only</option>
            <option value="removed">Removed only</option>
          </select>
        </form>
      )}

      {notice && <div className="rounded-xl border border-forest-200 bg-forest-50 px-4 py-2.5 text-xs font-semibold text-forest-900">{notice}</div>}
      {error && <div className="rounded-xl border border-cherry-200 bg-cherry-50 px-4 py-2.5 text-xs font-semibold text-cherry-800">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-coffee-100">
        {loading ? (
          <p className="px-4 py-10 text-center text-xs text-coffee-500">Loading…</p>
        ) : tab === 'farmer' ? (
          <table className="w-full min-w-[980px]">
            <thead className="bg-coffee-50/70"><tr>
              <th className={th}>Farmer</th><th className={th}>Location</th><th className={th}>Quality</th><th className={th}>Open lots</th>
              <th className={th}>Sold</th><th className={th}>Earned</th><th className={th}>vs reference</th><th className={th}>Status</th><th className={th} />
            </tr></thead>
            <tbody className="divide-y divide-coffee-100">
              {users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className={u.isActive ? '' : 'bg-coffee-50/50 opacity-80'}>
                    <td className={td}><p className="font-bold">{u.fullName}</p><p className="text-coffee-500">{u.phone || u.email}</p></td>
                    <td className={td}><p>{u.woreda || '—'}{u.kebele ? ` · ${u.kebele}` : ''}</p><p className="text-coffee-500">{u.cooperative || 'No cooperative'}</p></td>
                    <td className={td}>{u.qualityScore != null ? <><strong>{Math.round(u.qualityScore)}</strong>/100{u.qualityRank ? <span className="text-coffee-500"> · #{u.qualityRank}</span> : null}</> : '—'}</td>
                    <td className={td}>{u.openListings || 0}<span className="text-coffee-500"> · {kg(u.openKgListed || 0)}</span></td>
                    <td className={td}><strong>{kg(u.kgTraded)}</strong><p className="text-coffee-500">{u.settledTrades} trade{u.settledTrades === 1 ? '' : 's'}{u.tradesInProgress ? ` · ${u.tradesInProgress} in progress` : ''}</p></td>
                    <td className={td}>{etb(u.etbTraded)}</td>
                    <td className={td}><PremiumBadge pct={u.premiumOverReferencePct} /></td>
                    <td className={td}>{statusCell(u)}</td>
                    <td className={`${td} text-right`}>{actionCell(u)}</td>
                  </tr>
                  {removeRow(u, 9)}
                </React.Fragment>
              ))}
            </tbody>
            {users.length > 0 && (
              <tfoot className="bg-coffee-50/70 text-xs font-bold text-coffee-900"><tr>
                <td className="px-4 py-3" colSpan={4}>{users.length} farmer{users.length === 1 ? '' : 's'}</td>
                <td className="px-4 py-3">{kg(totals.kg)}</td><td className="px-4 py-3">{etb(totals.etb)}</td><td colSpan={3} />
              </tr></tfoot>
            )}
          </table>
        ) : tab === 'buyer' ? (
          <table className="w-full min-w-[1040px]">
            <thead className="bg-coffee-50/70"><tr>
              <th className={th}>Buyer</th><th className={th}>License · TIN</th><th className={th}>Verification</th><th className={th}>Fairness</th>
              <th className={th}>Bought</th><th className={th}>Paid farmers</th><th className={th}>vs reference</th><th className={th}>Status</th><th className={th} />
            </tr></thead>
            <tbody className="divide-y divide-coffee-100">
              {users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className={u.isActive ? '' : 'bg-coffee-50/50 opacity-80'}>
                    <td className={td}><p className="font-bold">{u.companyName || u.fullName}</p><p className="text-coffee-500">{u.fullName} · {u.email || u.phone}</p></td>
                    <td className={`${td} font-mono text-[11px]`}><p>{u.tradeLicenseNumber || '—'}</p><p className="text-coffee-500">{u.tinNumber || '—'}</p></td>
                    <td className={td}><VerificationBadge status={u.verificationStatus} /></td>
                    <td className={td}>{u.fairnessScore != null ? <strong className={u.fairnessScore < 50 ? 'text-cherry-700' : ''}>{Math.round(u.fairnessScore)}%</strong> : '—'}</td>
                    <td className={td}><strong>{kg(u.kgTraded)}</strong><p className="text-coffee-500">{u.settledTrades} trade{u.settledTrades === 1 ? '' : 's'} · {u.openOffers} open offer{u.openOffers === 1 ? '' : 's'}</p></td>
                    <td className={td}>{etb(u.etbTraded)}</td>
                    <td className={td}><PremiumBadge pct={u.premiumOverReferencePct} /></td>
                    <td className={td}>{statusCell(u)}</td>
                    <td className={`${td} text-right`}>{actionCell(u)}</td>
                  </tr>
                  {removeRow(u, 9)}
                </React.Fragment>
              ))}
            </tbody>
            {users.length > 0 && (
              <tfoot className="bg-coffee-50/70 text-xs font-bold text-coffee-900"><tr>
                <td className="px-4 py-3" colSpan={4}>{users.length} buyer{users.length === 1 ? '' : 's'}</td>
                <td className="px-4 py-3">{kg(totals.kg)}</td><td className="px-4 py-3">{etb(totals.etb)}</td><td colSpan={3} />
              </tr></tfoot>
            )}
          </table>
        ) : tab === 'trades' ? (
          <table className="w-full min-w-[900px]">
            <thead className="bg-coffee-50/70"><tr>
              <th className={th}>Date</th><th className={th}>Farmer → Buyer</th><th className={th}>Coffee</th><th className={th}>Quantity</th>
              <th className={th}>Price vs reference</th><th className={th}>Total</th><th className={th}>Status</th>
            </tr></thead>
            <tbody className="divide-y divide-coffee-100">
              {trades.map((t) => {
                const pct = t.referencePricePerKg ? Math.round(((t.pricePerKg - t.referencePricePerKg) / t.referencePricePerKg) * 1000) / 10 : null;
                return (
                  <tr key={t.id}>
                    <td className={td}>{date(t.completedAt || t.createdAt)}</td>
                    <td className={td}><p className="font-bold">{t.farmerName}</p><p className="text-coffee-500">→ {t.buyerName}</p></td>
                    <td className={td}><p>{formatGrade(t.processing, t.grade)}</p><p className="text-coffee-500">{t.woreda || ''}</p></td>
                    <td className={td}>{kg(t.quantityKg)}</td>
                    <td className={td}><p><strong>{t.pricePerKg.toLocaleString()}</strong> <span className="text-coffee-500">/ {t.referencePricePerKg.toLocaleString()} ETB</span></p><PremiumBadge pct={pct} /></td>
                    <td className={td}>{etb(t.totalETB)}</td>
                    <td className={td}><span className="rounded-full bg-coffee-100 px-2 py-0.5 text-[11px] font-bold capitalize text-coffee-800">{t.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead className="bg-coffee-50/70"><tr>
              <th className={th}>When</th><th className={th}>Decision</th><th className={th}>Account</th><th className={th}>Reason</th><th className={th}>Officer</th>
            </tr></thead>
            <tbody className="divide-y divide-coffee-100">
              {audit.map((a) => (
                <tr key={a._id}>
                  <td className={td}>{new Date(a.createdAt).toLocaleString('en-GB')}</td>
                  <td className={td}><strong>{AUDIT_LABELS[a.action] || a.action}</strong></td>
                  <td className={td}>{a.targetName} <span className="text-coffee-500">({a.targetRole})</span></td>
                  <td className={`${td} max-w-[320px]`}>{a.reason || <span className="text-coffee-400">—</span>}</td>
                  <td className={td}>{a.admin?.fullName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading &&
          ((tab === 'trades' && trades.length === 0) ||
            (tab === 'audit' && audit.length === 0) ||
            ((tab === 'farmer' || tab === 'buyer') && users.length === 0)) && (
            <p className="px-4 py-10 text-center text-xs text-coffee-500">
              {tab === 'audit' ? 'No decisions recorded yet. Approvals, rejections, and removals appear here.' : 'No records match.'}
            </p>
          )}
      </div>
    </section>
  );
}
