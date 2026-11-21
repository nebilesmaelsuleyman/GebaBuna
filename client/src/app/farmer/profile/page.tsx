'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle2, Loader2, MapPin, Save, UserRound } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';

type ProfileForm = {
  fullName: string; email: string; phone: string; shortBio: string;
  region: string; zone: string; woreda: string; kebele: string;
  farmSizeHectares: string; numberOfTrees: string; estimatedCostPerKg: string;
  coffeeVarieties: string; processingMethods: string; certifications: string;
  cooperativeMembership: string; preferredLanguage: 'om' | 'am' | 'en';
};

const baseForm: ProfileForm = {
  fullName: '', email: '', phone: '', shortBio: '', region: 'Oromia', zone: 'Jimma',
  woreda: '', kebele: '', farmSizeHectares: '', numberOfTrees: '', estimatedCostPerKg: '',
  coffeeVarieties: '', processingMethods: 'washed, natural', certifications: '',
  cooperativeMembership: '', preferredLanguage: 'om',
};

const inputClass = 'mt-1.5 w-full rounded-xl border border-coffee-200 bg-white px-3.5 py-3 text-sm text-coffee-950 outline-none transition focus:border-forest-500 focus:ring-4 focus:ring-forest-100';
const usableAvatar = (value?: string) => value && !value.includes('bottts/') ? value : '';

export default function FarmerProfilePage() {
  const { user, token, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>(baseForm);
  const [profile, setProfile] = useState<any>(null);
  const [avatar, setAvatar] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAvatar(usableAvatar(user?.avatar));
    setForm((current) => ({ ...current, fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' }));
    api.getFarmerProfile().then((response) => {
      const data = response.profile;
      const account = data?.user || {};
      setProfile(data);
      setAvatar(usableAvatar(account.avatar || data.photo || user?.avatar));
      setForm({
        fullName: account.fullName || data.fullName || user?.fullName || '',
        email: account.email || data.email || user?.email || '',
        phone: account.phone || data.phone || user?.phone || '',
        shortBio: data.shortBio || '', region: data.region || 'Oromia', zone: data.zone || 'Jimma',
        woreda: data.woreda || '', kebele: data.kebele || '',
        farmSizeHectares: data.farmSizeHectares == null ? '' : String(data.farmSizeHectares),
        numberOfTrees: data.numberOfTrees == null ? '' : String(data.numberOfTrees),
        estimatedCostPerKg: data.estimatedCostPerKg == null ? '' : String(data.estimatedCostPerKg),
        coffeeVarieties: (data.coffeeVarieties || []).join(', '),
        processingMethods: (data.processingMethods || []).join(', '),
        certifications: (data.certifications || []).join(', '),
        cooperativeMembership: data.cooperativeMembership || '',
        preferredLanguage: data.preferredLanguage || user?.preferredLanguage || 'om',
      });
    }).catch(() => {
      const local = localStorage.getItem('buna_farmer_profile');
      if (local) {
        try {
          const data = JSON.parse(local);
          setProfile(data);
          setForm({ ...baseForm, ...data,
            farmSizeHectares: String(data.farmSizeHectares ?? ''), numberOfTrees: String(data.numberOfTrees ?? ''), estimatedCostPerKg: data.estimatedCostPerKg == null ? '' : String(data.estimatedCostPerKg),
            coffeeVarieties: (data.coffeeVarieties || []).join(', '), processingMethods: (data.processingMethods || []).join(', '), certifications: (data.certifications || []).join(', '),
          });
        } catch { /* Ignore invalid local demo data and use the account basics. */ }
      }
    }).finally(() => setLoading(false));
  }, [user?.id]);

  const setField = (key: keyof ProfileForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    if (!form.fullName.trim() || !form.phone.trim() || !form.woreda.trim() || !form.kebele.trim()) {
      setError('Name, phone, woreda, and kebele are required.');
      setSaving(false);
      return;
    }
    const payload = {
      ...form,
      farmSizeHectares: Number(form.farmSizeHectares || 0),
      numberOfTrees: Number(form.numberOfTrees || 0),
      estimatedCostPerKg: form.estimatedCostPerKg === '' ? null : Number(form.estimatedCostPerKg),
      coffeeVarieties: form.coffeeVarieties.split(',').map((value) => value.trim()).filter(Boolean),
      processingMethods: form.processingMethods.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean),
      certifications: form.certifications.split(',').map((value) => value.trim()).filter(Boolean),
    };
    try {
      const result = await api.updateFarmerProfile(payload);
      setProfile(result.profile);
      localStorage.removeItem('buna_farmer_profile');
      updateUser({ fullName: form.fullName, email: form.email || undefined, phone: form.phone, preferredLanguage: form.preferredLanguage });
      setMessage('Your profile is up to date.');
    } catch (saveError: any) {
      if (!token?.startsWith('demo_')) {
        setError(saveError.message || 'Could not save profile changes.');
        setSaving(false);
        return;
      }
      localStorage.setItem('buna_farmer_profile', JSON.stringify(payload));
      updateUser({ fullName: form.fullName, email: form.email || undefined, phone: form.phone, preferredLanguage: form.preferredLanguage });
      setMessage('Saved for this demo session. Connect your account to sync changes across devices.');
    }
    if (photoFile) {
      try {
        const result = await api.uploadFarmerPhoto(photoFile);
        setAvatar(result.photo);
        updateUser({ avatar: result.photo });
      } catch (photoError: any) {
        if (!token?.startsWith('demo_')) {
          setError(photoError.message || 'Could not upload the profile photo.');
          setSaving(false);
          return;
        }
        const localPhoto = await new Promise<string>((resolve) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.readAsDataURL(photoFile);
        });
        setAvatar(localPhoto); updateUser({ avatar: localPhoto });
      }
      setPhotoFile(null);
    }
    setSaving(false);
  };

  const initials = (form.fullName || 'Farmer').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const field = (key: keyof ProfileForm, label: string, placeholder = '', type = 'text') => (
    <label className="block text-xs font-semibold text-coffee-700">{label}
      <input className={inputClass} type={type} value={form[key]} placeholder={placeholder} onChange={(event) => setField(key, event.target.value)} />
    </label>
  );

  return (
    <main className="min-h-screen px-4 pb-16 pt-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/farmer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-coffee-700 hover:text-forest-700"><ArrowLeft className="h-4 w-4" /> Back to farmer dashboard</Link>
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-700">Farmer account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-coffee-950">Your profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-coffee-600">Keep your contact, farm, and origin details current so buyers can make informed offers.</p>
        </div>

        {loading ? <div className="flex min-h-64 items-center justify-center text-coffee-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading profile…</div> : (
          <form onSubmit={saveProfile} className="space-y-6">
            <section className="rounded-3xl border border-coffee-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-forest-50 ring-4 ring-forest-50">
                  {photoPreview || avatar ? <img src={photoPreview || avatar} alt="Farmer profile" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black text-forest-800">{initials}</div>}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-coffee-950">Profile photo</h2>
                  <p className="mt-1 text-xs text-coffee-600">Use a clear photo so buyers can recognize who they are trading with.</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-coffee-200 px-3.5 py-2.5 text-xs font-bold text-coffee-800 hover:bg-coffee-50"><Camera className="h-4 w-4" /> Upload photo<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={selectPhoto} /></label>
              </div>
              </div>
            </section>

            <section className="rounded-3xl border border-coffee-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-forest-50 p-2 text-forest-700"><UserRound className="h-5 w-5" /></span><div><h2 className="font-bold text-coffee-950">Contact and introduction</h2><p className="text-xs text-coffee-500">The details buyers see on your farmer profile.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">{field('fullName', 'Full name', 'Your name')}{field('email', 'Email address', 'name@example.com', 'email')}{field('phone', 'Phone number', '+251…', 'tel')}</div>
              <label className="mt-4 block text-xs font-semibold text-coffee-700">Short bio<textarea className={`${inputClass} min-h-24 resize-y`} maxLength={500} value={form.shortBio} placeholder="Tell buyers about your farm and coffee." onChange={(event) => setField('shortBio', event.target.value)} /></label>
            </section>

            <section className="rounded-3xl border border-coffee-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-gold-50 p-2 text-gold-700"><MapPin className="h-5 w-5" /></span><div><h2 className="font-bold text-coffee-950">Farm and origin</h2><p className="text-xs text-coffee-500">Used on harvest listings and AI-assisted coffee analysis.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">{field('region', 'Region', 'Oromia')}{field('zone', 'Zone', 'Jimma')}{field('woreda', 'Woreda', 'e.g. Mana')}{field('kebele', 'Kebele', 'Your kebele')}{field('farmSizeHectares', 'Farm size (hectares)', '0', 'number')}{field('numberOfTrees', 'Coffee trees', '0', 'number')}{field('estimatedCostPerKg', 'Estimated production cost (ETB/kg)', 'Optional; used for estimated margin charts', 'number')}{field('cooperativeMembership', 'Cooperative membership', 'Optional')}</div>
              <p className="mt-3 text-[11px] text-coffee-500">Profit estimates use your cost per kilogram and completed sales. Your cost is not shown to buyers.</p>
            </section>

            <section className="rounded-3xl border border-coffee-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="mb-5 font-bold text-coffee-950">Coffee and preferences</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('coffeeVarieties', 'Coffee varieties', 'Jimma Heirloom, 74110')}
                {field('processingMethods', 'Processing methods', 'washed, natural')}
                {field('certifications', 'Certifications', 'Organic, Fairtrade')}
                <label className="block text-xs font-semibold text-coffee-700">Preferred language<select className={inputClass} value={form.preferredLanguage} onChange={(event) => setField('preferredLanguage', event.target.value as ProfileForm['preferredLanguage'])}><option value="om">Afaan Oromoo</option><option value="am">አማርኛ</option><option value="en">English</option></select></label>
              </div>
            </section>

            {(error || message) && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-forest-50 text-forest-800'}`}>{error || message}</p>}
            <div className="flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-800 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : message ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save profile'}</button></div>
          </form>
        )}
      </div>
    </main>
  );
}
