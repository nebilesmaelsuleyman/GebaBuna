'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Coffee, Lock, Phone, Sparkles } from 'lucide-react';

const demos = [
  {
    role: 'farmer' as const,
    path: '/farmer',
    name: 'Gemechu Daba',
    detail: 'Gold farmer · Mana',
    hint: 'Voice listing and incoming bids',
  },
  {
    role: 'buyer' as const,
    path: '/buyer',
    name: 'Oromia Union',
    detail: 'Fair buyer · 96',
    hint: 'Offers held to the ECX floor',
  },
  {
    role: 'admin' as const,
    path: '/admin',
    name: 'Jimma Agri Bureau',
    detail: 'Oversight',
    hint: 'Verification queue and price gap',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, otpLogin, register, switchDemoRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'otp'>('login');
  const [identifier, setIdentifier] = useState('0917112233');
  const [password, setPassword] = useState('farmer123456');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');

  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'farmer' | 'buyer'>('farmer');
  const [regWoreda, setRegWoreda] = useState('Mana');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const ok = await login(identifier, password);
    setSubmitting(false);
    if (ok) router.push('/');
    else setErrorMsg('Those credentials were not accepted. Use a demo account, or check the phone and password.');
  };

  const handleDemoSelect = async (role: 'farmer' | 'buyer' | 'admin', path: string) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await switchDemoRole(role);
      router.push(path);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const ok = await otpLogin(identifier, otpCode);
    setSubmitting(false);
    if (ok) router.push('/farmer');
    else setErrorMsg('OTP was not accepted. The demo code is 123456.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const ok = await register({
      fullName: regFullName,
      phone: regPhone,
      email: regEmail,
      password: regPassword,
      role: regRole,
      woreda: regWoreda,
    });
    setSubmitting(false);
    if (ok) router.push(regRole === 'farmer' ? '/farmer' : '/buyer');
    else setErrorMsg('Registration did not complete. Check the fields and try again.');
  };

  return (
    <div className="mx-auto grid min-h-[78vh] max-w-[1100px] items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-coffee-950 text-gold-300">
          <Coffee className="h-6 w-6" />
        </div>
        <p className="page-kicker">Judge path</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-coffee-950">Walk the trade, not the settings.</h1>
        <p className="mt-3 text-sm leading-relaxed text-coffee-600">
          Start as Gemechu. Speak a listing, grade a photo, then accept a bid that sits above the ECX floor. Switch to the union to see the same lot from the buyer side.
        </p>
        <div className="mt-6 space-y-2">
          {demos.map((demo) => (
            <button
              key={demo.role}
              type="button"
              onClick={() => handleDemoSelect(demo.role, demo.path)}
              disabled={submitting}
              className="surface flex disabled:cursor-wait disabled:opacity-60 w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:-translate-y-0.5"
            >
              <span>
                <span className="block text-sm font-bold text-coffee-950">{demo.name}</span>
                <span className="block text-xs text-coffee-500">{demo.hint}</span>
              </span>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gold-800">{demo.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="surface p-6 sm:p-8 lg:col-span-7">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-coffee-950">
            {activeTab === 'login' ? 'Sign in' : activeTab === 'otp' ? 'Phone code' : 'Create an account'}
          </h2>
          <p className="mt-1 text-sm text-coffee-600">
            {activeTab === 'otp' ? 'Demo code is 123456.' : 'Password, a one-time code, or a new account.'}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 rounded-full bg-coffee-100 p-1 text-xs font-bold">
          {([
            ['login', 'Password'],
            ['otp', 'OTP'],
            ['register', 'Register'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setActiveTab(id); setErrorMsg(null); }}
              className={`rounded-full py-2 ${activeTab === id ? 'bg-white text-coffee-950 shadow-sm' : 'text-coffee-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-cherry-200 bg-cherry-50 px-4 py-3 text-sm text-cherry-800">
            {errorMsg}
          </div>
        )}

        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm font-semibold text-coffee-900">
              Phone or email
              <span className="relative mt-1.5 block">
                <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input className="field pl-10" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              </span>
            </label>
            <label className="block text-sm font-semibold text-coffee-900">
              Password
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input className="field pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coffee-950 py-3.5 text-sm font-bold text-cream-50"
            >
              {submitting ? 'Checking…' : 'Enter portal'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {activeTab === 'otp' && (
          <form onSubmit={handleOtpLogin} className="space-y-4">
            <label className="block text-sm font-semibold text-coffee-900">
              Phone number
              <input className="field mt-1.5" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </label>
            <label className="block text-sm font-semibold text-coffee-900">
              Six-digit code
              <input className="field mt-1.5 tracking-[0.3em]" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required />
            </label>
            <p className="flex items-center gap-1.5 text-xs text-coffee-500">
              <Sparkles className="h-3.5 w-3.5 text-gold-600" />
              SMS is not connected yet. Use 123456 for the demo farmer.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coffee-950 py-3.5 text-sm font-bold text-cream-50"
            >
              {submitting ? 'Checking…' : 'Verify and continue'}
            </button>
          </form>
        )}

        {activeTab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <label className="block text-sm font-semibold text-coffee-900">
              Full name
              <input className="field mt-1.5" value={regFullName} onChange={(e) => setRegFullName(e.target.value)} required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-coffee-900">
                Role
                <select className="field mt-1.5" value={regRole} onChange={(e) => setRegRole(e.target.value as 'farmer' | 'buyer')}>
                  <option value="farmer">Farmer</option>
                  <option value="buyer">Buyer</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-coffee-900">
                Woreda
                <select className="field mt-1.5" value={regWoreda} onChange={(e) => setRegWoreda(e.target.value)}>
                  {['Mana', 'Gomma', 'Limmu Kosa', 'Agaro', 'Gera'].map((woreda) => (
                    <option key={woreda} value={woreda}>{woreda}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-semibold text-coffee-900">
              Phone
              <input className="field mt-1.5" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="09…" required />
            </label>
            <label className="block text-sm font-semibold text-coffee-900">
              Email
              <input className="field mt-1.5" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-coffee-900">
              Password
              <input className="field mt-1.5" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-forest-700 py-3.5 text-sm font-bold text-white"
            >
              {submitting ? 'Creating…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
