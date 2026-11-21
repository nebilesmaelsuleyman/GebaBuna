'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, Loader2, Save, ShieldCheck, Upload } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

type BuyerForm = {
  companyName: string; ownerName: string; phone: string; email: string; businessType: string;
  region: string; zone: string; address: string; tradeLicenseNumber: string;
  exportLicenseNumber: string; tinNumber: string; yearsInBusiness: string; preferredVolumes: string;
  preferredCoffeeTypes: string;
};
const emptyForm: BuyerForm = {
  companyName: '', ownerName: '', phone: '', email: '', businessType: 'local_trader', region: 'Oromia', zone: 'Jimma',
  address: '', tradeLicenseNumber: '', exportLicenseNumber: '', tinNumber: '', yearsInBusiness: '0', preferredVolumes: '', preferredCoffeeTypes: '',
};
const inputClass = 'mt-1.5 w-full rounded-xl border border-coffee-200 bg-white px-3.5 py-3 text-sm text-coffee-950 outline-none focus:border-forest-500 focus:ring-4 focus:ring-forest-100';
const businessNames: Record<string, string> = { exporter: 'Exporter', cooperative_union: 'Cooperative or union', roaster: 'Coffee roaster', local_trader: 'Individual / local trader' };
const docNames: Record<string, string> = { trade_license: 'Trade license', export_license: 'Export license', tin_certificate: 'TIN certificate', tax_clearance: 'Tax clearance', other: 'Other supporting document' };

export default function BuyerProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState<BuyerForm>(emptyForm);
  const [documents, setDocuments] = useState<any[]>([]);
  const [status, setStatus] = useState('unverified');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('trade_license');
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBuyerProfile().then(({ profile }) => {
      const account = profile?.user || {};
      setForm({
        companyName: profile.companyName || '', ownerName: account.fullName || profile.ownerName || user?.fullName || '',
        phone: account.phone || profile.phone || user?.phone || '', email: account.email || profile.email || user?.email || '',
        businessType: profile.businessType || 'local_trader', region: profile.region || '', zone: profile.zone || '', address: profile.address || '',
        tradeLicenseNumber: profile.tradeLicenseNumber || '', exportLicenseNumber: profile.exportLicenseNumber || '', tinNumber: profile.tinNumber || '',
        yearsInBusiness: String(profile.yearsInBusiness ?? 0), preferredVolumes: profile.preferredVolumes || '', preferredCoffeeTypes: (profile.preferredCoffeeTypes || []).join(', '),
      });
      setDocuments(profile.uploadedDocuments || []);
      setStatus(profile.verificationStatus || 'unverified');
      setRejectionReason(profile.rejectionReason || '');
    }).catch((err) => setError(err.message || 'Could not load your buyer profile.')).finally(() => setLoading(false));
  }, [user?.id]);

  const change = (key: keyof BuyerForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    if (selected && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Upload a PDF, JPG, PNG, or WebP file.'); setFile(null); return;
    }
    if (selected && selected.size > 10 * 1024 * 1024) { setError('File size must be 10 MB or less.'); setFile(null); return; }
    setError(''); setFile(selected);
    if (selected && !docTitle) setDocTitle(selected.name.replace(/\.[^.]+$/, ''));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const { profile } = await api.updateBuyerProfile({ ...form, yearsInBusiness: Number(form.yearsInBusiness), preferredCoffeeTypes: form.preferredCoffeeTypes.split(',').map((x) => x.trim()).filter(Boolean) });
      setStatus(profile.verificationStatus || 'pending'); setRejectionReason(profile.rejectionReason || '');
      setMessage('Profile saved. Changes to legal details have been sent for admin review.');
    } catch (err: any) { setError(err.message || 'Could not save your profile.'); }
    finally { setSaving(false); }
  };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) { setError('Choose a document to upload.'); return; }
    setUploading(true); setError(''); setMessage('');
    try {
      const result = await api.uploadBuyerDocument(file, docType, docTitle.trim() || file.name);
      setDocuments(result.profile?.uploadedDocuments || []);
      setStatus('pending'); setFile(null); setDocTitle(''); setMessage('Document uploaded securely and added to the admin verification queue.');
    } catch (err: any) { setError(err.message || 'Could not upload document.'); }
    finally { setUploading(false); }
  };
  const statusStyle = status === 'verified' ? 'bg-forest-100 text-forest-800' : status === 'rejected' ? 'bg-red-100 text-red-800' : status === 'pending' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700';

  return <main className="min-h-screen px-4 pb-16 pt-8 sm:px-6">
    <div className="mx-auto max-w-5xl">
      <Link href="/buyer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-coffee-700 hover:text-forest-700"><ArrowLeft className="h-4 w-4" /> Back to buyer dashboard</Link>
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-forest-700">Buyer account</p><h1 className="mt-2 text-3xl font-black text-coffee-950">Business profile & verification</h1><p className="mt-2 max-w-2xl text-sm text-coffee-600">Keep your organization details current and submit official documents for admin review before trading.</p></div>
        <span className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-xs font-bold capitalize ${statusStyle}`}><ShieldCheck className="h-4 w-4" /> {status}</span>
      </header>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {message && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}
      {rejectionReason && status === 'rejected' && <div className="mb-5 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800"><strong>Admin feedback:</strong> {rejectionReason} Update the details or upload corrected documents, then save to request another review.</div>}
      {loading ? <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-forest-700" /></div> : <div className="grid gap-6 lg:grid-cols-[1.35fr_.85fr]">
        <form onSubmit={save} className="space-y-6 rounded-3xl border border-coffee-200 bg-white p-5 shadow-sm sm:p-7">
          <section><h2 className="text-lg font-extrabold text-coffee-950">Contact and organization</h2><p className="mb-4 mt-1 text-xs text-coffee-600">These details identify the person and business trading on the platform.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-coffee-800">Business / organization name<input required className={inputClass} value={form.companyName} onChange={(e) => change('companyName', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Representative name<input required className={inputClass} value={form.ownerName} onChange={(e) => change('ownerName', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Email<input type="email" className={inputClass} value={form.email} onChange={(e) => change('email', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Phone<input required className={inputClass} value={form.phone} onChange={(e) => change('phone', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800 sm:col-span-2">Buyer type<select className={inputClass} value={form.businessType} onChange={(e) => change('businessType', e.target.value)}>{Object.entries(businessNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-1 block font-normal text-coffee-500">Select cooperative/union if applying as a member organization, or individual/local trader for a single-person business.</span></label>
            </div>
          </section>
          <section className="border-t border-coffee-100 pt-5"><h2 className="text-lg font-extrabold text-coffee-950">Business registration</h2><p className="mb-4 mt-1 text-xs text-coffee-600">Enter the identifiers printed on your current official documents.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-coffee-800">Trade license number<input required className={inputClass} value={form.tradeLicenseNumber} onChange={(e) => change('tradeLicenseNumber', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Taxpayer identification number (TIN)<input required className={inputClass} value={form.tinNumber} onChange={(e) => change('tinNumber', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Export license number <span className="font-normal text-coffee-500">(if applicable)</span><input className={inputClass} value={form.exportLicenseNumber} onChange={(e) => change('exportLicenseNumber', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Years operating<input type="number" min="0" max="150" className={inputClass} value={form.yearsInBusiness} onChange={(e) => change('yearsInBusiness', e.target.value)} /></label>
            </div>
          </section>
          <section className="border-t border-coffee-100 pt-5"><h2 className="text-lg font-extrabold text-coffee-950">Location and buying preferences</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-coffee-800">Region<input className={inputClass} value={form.region} onChange={(e) => change('region', e.target.value)} /></label><label className="text-xs font-bold text-coffee-800">Zone<input className={inputClass} value={form.zone} onChange={(e) => change('zone', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800 sm:col-span-2">Business address<textarea rows={2} className={inputClass} value={form.address} onChange={(e) => change('address', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Typical buying volume<input className={inputClass} placeholder="e.g. 2,000 kg per harvest" value={form.preferredVolumes} onChange={(e) => change('preferredVolumes', e.target.value)} /></label>
              <label className="text-xs font-bold text-coffee-800">Coffee types of interest<input className={inputClass} placeholder="Comma-separated" value={form.preferredCoffeeTypes} onChange={(e) => change('preferredCoffeeTypes', e.target.value)} /></label>
            </div>
          </section>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-5 py-3 text-sm font-bold text-white hover:bg-forest-800 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile</button>
        </form>
        <aside className="space-y-6">
          <form onSubmit={upload} className="rounded-3xl border border-coffee-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-extrabold text-coffee-950">Legal documents</h2><p className="mb-4 mt-1 text-xs leading-5 text-coffee-600">PDF or image, up to 10 MB each. Upload readable, current documents; admins can review them with your application.</p>
            <label className="text-xs font-bold text-coffee-800">Document type<select className={inputClass} value={docType} onChange={(e) => setDocType(e.target.value)}>{Object.entries(docNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="mt-3 block text-xs font-bold text-coffee-800">Document title<input className={inputClass} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. 2026 Trade License" /></label>
            <label className="mt-3 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-coffee-200 bg-coffee-50 px-4 py-6 text-center hover:border-forest-500"><Upload className="mb-2 h-6 w-6 text-forest-700" /><span className="text-sm font-bold text-coffee-900">{file?.name || 'Choose a file to upload'}</span><span className="mt-1 text-[11px] text-coffee-500">PDF, JPG, PNG, WebP · 10 MB max</span><input type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={selectFile} /></label>
            <button disabled={uploading || !file} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cherry-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload for review</button>
          </form>
          <section className="rounded-3xl border border-coffee-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-extrabold text-coffee-950">Submitted documents <span className="ml-1 rounded-full bg-coffee-100 px-2 py-0.5 text-xs">{documents.length}</span></h2>
            {documents.length ? <ul className="mt-4 space-y-3">{documents.map((doc, i) => <li key={`${doc.fileUrl}-${i}`} className="flex items-start gap-3 rounded-xl bg-coffee-50 p-3"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-forest-700" /><div className="min-w-0 flex-1"><a href={doc.fileUrl} target="_blank" rel="noreferrer" className="break-words text-sm font-bold text-coffee-900 underline decoration-coffee-300">{doc.title}</a><p className="mt-1 text-[11px] text-coffee-600">{docNames[doc.docType] || 'Supporting document'}{doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ''}</p></div></li>)}</ul> : <p className="mt-3 rounded-xl bg-coffee-50 p-4 text-sm text-coffee-600">No documents uploaded yet. Add your trade license and TIN certificate to begin verification.</p>}
          </section>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-900"><strong>What to submit:</strong> Cooperatives/unions should include registration and representative authorization. Individual traders should provide trade license and TIN. Exporters should also provide an export license. Admin review is required before verified trading access.</div>
        </aside>
      </div>}
    </div>
  </main>;
}
