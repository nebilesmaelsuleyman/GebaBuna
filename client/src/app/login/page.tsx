'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Coffee, Lock, Phone, Mail, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

const DEMO_OTP = '123456';

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
    name: 'System Admin',
    detail: 'Platform Admin',
    hint: 'Verification queue and price gap',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, otpLogin, register, switchDemoRole } = useAuth();

  // Authentication method: Email & Password vs Phone Number & OTP
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  // Authentication mode: Sign In vs Create Account
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Email login state
  const [email, setEmail] = useState('dejene@oromia-union.com');
  const [password, setPassword] = useState('buyer123456');

  // Phone OTP login state (Universal Demo code: 123456)
  const [phone, setPhone] = useState('0917112233');
  const [otpCode, setOtpCode] = useState(DEMO_OTP);

  // Shared registration fields
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<'farmer' | 'buyer'>('buyer');
  const [regWoreda, setRegWoreda] = useState('Mana');
  const [regCompanyName, setRegCompanyName] = useState('');

  // Email registration fields
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Phone registration fields
  const [regPhone, setRegPhone] = useState('');
  const [regOtpCode, setRegOtpCode] = useState(DEMO_OTP);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [smsToast, setSmsToast] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDemoSelect = async (role: 'farmer' | 'buyer' | 'admin', path: string) => {
    setErrorMsg(null);
    setSmsToast(null);
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

  // Simulated OTP dispatcher - shows SMS on screen and auto-fills 123456
  const handleSendOtp = (targetPhone: string, isRegister = false) => {
    if (!targetPhone.trim()) {
      setErrorMsg('Please enter a phone number first to receive the SMS code.');
      return;
    }
    setSendingOtp(true);
    setErrorMsg(null);
    setTimeout(() => {
      setSendingOtp(false);
      if (isRegister) {
        setRegOtpCode(DEMO_OTP);
      } else {
        setOtpCode(DEMO_OTP);
      }
      setSmsToast(`📲 SMS simulated to ${targetPhone.trim()}! Verification code is ${DEMO_OTP} (same for all users).`);
    }, 250);
  };

  // Sign in with Email & Password
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const res = await login(email.trim(), password);
    setSubmitting(false);
    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.message || 'Those credentials were not accepted. Please check your email and password.');
    }
  };

  // Sign in with Phone & OTP
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const res = await otpLogin(phone.trim(), otpCode.trim());
    setSubmitting(false);
    if (res.success) {
      router.push('/farmer');
    } else {
      setErrorMsg(res.message || `OTP verification was not accepted. Universal demo code is ${DEMO_OTP}.`);
    }
  };

  // Register with Email & Password
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    if (!regFullName.trim()) {
      setErrorMsg('Please enter your full name.');
      setSubmitting(false);
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Please enter a valid email address.');
      setSubmitting(false);
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    const res = await register({
      fullName: regFullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
      woreda: regRole === 'farmer' ? regWoreda : undefined,
      companyName: regRole === 'buyer' && regCompanyName.trim() ? regCompanyName.trim() : undefined,
    });
    setSubmitting(false);

    if (res.success) {
      router.push(regRole === 'farmer' ? '/farmer' : '/buyer');
    } else {
      setErrorMsg(res.message || 'Registration did not complete. Please check the fields and try again.');
    }
  };

  // Register with Phone & OTP
  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    if (!regFullName.trim()) {
      setErrorMsg('Please enter your full name.');
      setSubmitting(false);
      return;
    }
    if (!regPhone.trim()) {
      setErrorMsg('Please enter your phone number.');
      setSubmitting(false);
      return;
    }
    if (regOtpCode.trim() !== DEMO_OTP) {
      setErrorMsg(`Invalid SMS verification code. Universal demo code is ${DEMO_OTP}.`);
      setSubmitting(false);
      return;
    }

    const res = await otpLogin(regPhone.trim(), regOtpCode.trim(), {
      role: regRole,
      fullName: regFullName.trim(),
    });
    setSubmitting(false);

    if (res.success) {
      router.push(regRole === 'farmer' ? '/farmer' : '/buyer');
    } else {
      setErrorMsg(res.message || 'Registration did not complete. Please try again.');
    }
  };

  return (
    <div className="mx-auto grid min-h-[78vh] max-w-[1100px] items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-12">
      {/* Left Demo Accounts Column */}
      <div className="lg:col-span-5">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-coffee-950 text-gold-300">
          <Coffee className="h-6 w-6" />
        </div>
        <p className="page-kicker">Quick Test Accounts</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-coffee-950">
          Direct Ethiopian Coffee Trade.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-coffee-600">
          Sign in instantly with one-click test credentials or choose your preferred authentication method: Email & Password or Phone Number & SMS OTP.
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

      {/* Right Authentication Card */}
      <div className="surface p-6 sm:p-8 lg:col-span-7">
        {/* Method Selector Tabs: Email & Password vs Phone & OTP */}
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-coffee-100/90 p-1.5 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setErrorMsg(null); setSmsToast(null); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              authMethod === 'email'
                ? 'bg-white text-coffee-950 shadow-md font-extrabold'
                : 'text-coffee-600 hover:text-coffee-950'
            }`}
          >
            <Mail className="h-4 w-4 text-gold-600" />
            <span>Email & Password</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('phone'); setErrorMsg(null); setSmsToast(null); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              authMethod === 'phone'
                ? 'bg-white text-coffee-950 shadow-md font-extrabold'
                : 'text-coffee-600 hover:text-coffee-950'
            }`}
          >
            <Phone className="h-4 w-4 text-forest-600" />
            <span>Phone Number & OTP</span>
          </button>
        </div>

        {/* Action Header & Mode Toggle (Sign In vs Register) */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-coffee-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-coffee-950">
              {authMode === 'login'
                ? authMethod === 'email' ? 'Sign in with Email' : 'Sign in with Phone & OTP'
                : authMethod === 'email' ? 'Register with Email' : 'Register with Phone & OTP'}
            </h2>
            <p className="mt-0.5 text-xs text-coffee-600">
              {authMethod === 'phone'
                ? `Universal demo OTP is ${DEMO_OTP} for all numbers.`
                : 'Enter your credentials to enter the GebaBuna portal.'}
            </p>
          </div>
          <div className="flex rounded-xl bg-coffee-100 p-1 text-xs font-bold shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMsg(null); setSmsToast(null); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                authMode === 'login' ? 'bg-white text-coffee-950 shadow-sm' : 'text-coffee-600 hover:text-coffee-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMsg(null); setSmsToast(null); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                authMode === 'register' ? 'bg-white text-coffee-950 shadow-sm' : 'text-coffee-600 hover:text-coffee-900'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Error Feedback Banner */}
        {errorMsg && (
          <div className="mb-4 rounded-2xl border border-cherry-200 bg-cherry-50 px-4 py-3 text-sm text-cherry-800 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-cherry-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success / SMS Sent Feedback Toast */}
        {smsToast && (
          <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2.5 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{smsToast}</span>
          </div>
        )}

        {/* ================= METHOD 1: EMAIL & PASSWORD ================= */}
        {authMethod === 'email' && authMode === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <label className="block text-sm font-semibold text-coffee-900">
              Email Address
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input
                  type="email"
                  className="field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  required
                />
              </span>
            </label>
            <label className="block text-sm font-semibold text-coffee-900">
              Password
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input
                  className="field pl-10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coffee-950 py-3.5 text-sm font-bold text-cream-50 hover:bg-coffee-900 transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Authenticating…' : 'Sign in with Email'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {authMethod === 'email' && authMode === 'register' && (
          <form onSubmit={handleEmailRegister} className="space-y-3.5">
            <label className="block text-sm font-semibold text-coffee-900">
              Full Name
              <input
                className="field mt-1.5"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g. Abebe Bikila"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-coffee-900">
                I am registering as:
                <select
                  className="field mt-1.5 font-bold text-coffee-900"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as 'farmer' | 'buyer')}
                >
                  <option value="buyer">Coffee Buyer / Exporter</option>
                  <option value="farmer">Smallholder Farmer</option>
                </select>
              </label>

              {regRole === 'farmer' ? (
                <label className="block text-sm font-semibold text-coffee-900">
                  Jimma Woreda
                  <select className="field mt-1.5" value={regWoreda} onChange={(e) => setRegWoreda(e.target.value)}>
                    {['Mana', 'Gomma', 'Limmu Kosa', 'Agaro', 'Gera', 'Kersa'].map((woreda) => (
                      <option key={woreda} value={woreda}>{woreda}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-sm font-semibold text-coffee-900">
                  Company Name <span className="text-xs font-normal text-coffee-500">(Optional)</span>
                  <input
                    className="field mt-1.5"
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="e.g. Abyssinia Coffee PLC"
                  />
                </label>
              )}
            </div>

            <label className="block text-sm font-semibold text-coffee-900">
              Email Address
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input
                  type="email"
                  className="field pl-10"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="buyer@domain.com"
                  required
                />
              </span>
            </label>

            <label className="block text-sm font-semibold text-coffee-900">
              Password <span className="text-xs font-normal text-coffee-500">(Minimum 6 characters)</span>
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                <input
                  type="password"
                  className="field pl-10"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </span>
            </label>

            {/* Buyer pending status information notice */}
            {regRole === 'buyer' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <ShieldCheck className="h-4 w-4 text-amber-700" />
                  <span>Buyer Verification Policy</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/90">
                  Your buyer account will be created with <strong>Pending</strong> verification status. You can fill out your trade license, TIN, and corporate documents on your buyer dashboard while awaiting review by the System Admin.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-forest-700 hover:bg-forest-800 py-3.5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating account…' : 'Register with Email'}
            </button>
          </form>
        )}

        {/* ================= METHOD 2: PHONE NUMBER & OTP ================= */}
        {authMethod === 'phone' && (
          <div className="space-y-4">
            {/* Live On-Screen Simulated SMS Notification Banner */}
            <div className="rounded-2xl border-2 border-emerald-400/90 bg-emerald-50/95 p-4 text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                    💬
                  </span>
                  <span className="text-xs font-bold text-emerald-900 tracking-wide uppercase">
                    Ethio Telecom SMS Gateway · Demo Simulation
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/90 px-2 py-0.5 rounded-full">
                  Broadcast Code
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    <span className="font-bold">GebaBuna (ገባ ቡና):</span> Your one-time verification code is{' '}
                    <span className="font-mono text-base font-black text-emerald-950 bg-white px-2.5 py-0.5 rounded border border-emerald-300 tracking-widest shadow-sm">
                      {DEMO_OTP}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Universal demo code: <strong>{DEMO_OTP}</strong> works for all phone numbers and accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (authMode === 'login') setOtpCode(DEMO_OTP);
                    else setRegOtpCode(DEMO_OTP);
                    setSmsToast(`✓ Code ${DEMO_OTP} auto-filled into SMS code box!`);
                    setTimeout(() => setSmsToast(null), 3000);
                  }}
                  className="shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 shadow-sm transition-all"
                >
                  Auto-Fill {DEMO_OTP}
                </button>
              </div>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <label className="block text-sm font-semibold text-coffee-900">
                  Ethiopian Phone Number
                  <div className="mt-1.5 flex gap-2">
                    <span className="relative flex-1 block">
                      <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                      <input
                        className="field pl-10"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0911223344 or +251 9..."
                        required
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp(phone, false)}
                      disabled={sendingOtp}
                      className="rounded-xl border border-coffee-300 bg-coffee-100 hover:bg-coffee-200 px-3.5 py-2 text-xs font-bold text-coffee-900 shrink-0 transition-colors"
                    >
                      {sendingOtp ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-coffee-900">
                      Six-digit SMS Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpCode(DEMO_OTP)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full transition-colors"
                    >
                      Code is: {DEMO_OTP} (Click to fill)
                    </button>
                  </div>
                  <input
                    className="field tracking-[0.3em] font-mono text-center text-lg font-bold"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <p className="flex items-center gap-1.5 text-xs text-coffee-600 bg-coffee-50 p-2.5 rounded-xl border border-coffee-200">
                  <Sparkles className="h-4 w-4 text-gold-600 flex-shrink-0" />
                  <span>SMS OTP is the same for all demo users: <strong>{DEMO_OTP}</strong>.</span>
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coffee-950 py-3.5 text-sm font-bold text-cream-50 hover:bg-coffee-900 transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Verifying code…' : 'Verify SMS & Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handlePhoneRegister} className="space-y-3.5">
                <label className="block text-sm font-semibold text-coffee-900">
                  Full Name
                  <input
                    className="field mt-1.5"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Gemechu Daba or Oromia Export"
                    required
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-coffee-900">
                    I am registering as:
                    <select
                      className="field mt-1.5 font-bold text-coffee-900"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'farmer' | 'buyer')}
                    >
                      <option value="buyer">Coffee Buyer / Exporter</option>
                      <option value="farmer">Smallholder Farmer</option>
                    </select>
                  </label>

                  {regRole === 'farmer' ? (
                    <label className="block text-sm font-semibold text-coffee-900">
                      Jimma Woreda
                      <select className="field mt-1.5" value={regWoreda} onChange={(e) => setRegWoreda(e.target.value)}>
                        {['Mana', 'Gomma', 'Limmu Kosa', 'Agaro', 'Gera', 'Kersa'].map((woreda) => (
                          <option key={woreda} value={woreda}>{woreda}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <div className="flex items-center text-xs text-coffee-500 pt-7">
                      Pending profile created on signup
                    </div>
                  )}
                </div>

                <label className="block text-sm font-semibold text-coffee-900">
                  Ethiopian Phone Number
                  <div className="mt-1.5 flex gap-2">
                    <span className="relative flex-1 block">
                      <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-coffee-400" />
                      <input
                        className="field pl-10"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0911223344"
                        required
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSendOtp(regPhone, true)}
                      disabled={sendingOtp}
                      className="rounded-xl border border-coffee-300 bg-coffee-100 hover:bg-coffee-200 px-3.5 py-2 text-xs font-bold text-coffee-900 shrink-0 transition-colors"
                    >
                      {sendingOtp ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-coffee-900">
                      SMS Verification Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setRegOtpCode(DEMO_OTP)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full transition-colors"
                    >
                      Code is: {DEMO_OTP} (Click to fill)
                    </button>
                  </div>
                  <input
                    className="field tracking-[0.3em] font-mono text-center text-lg font-bold"
                    value={regOtpCode}
                    onChange={(e) => setRegOtpCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>

                <p className="flex items-center gap-1.5 text-xs text-coffee-600 bg-coffee-50 p-2.5 rounded-xl border border-coffee-200">
                  <Sparkles className="h-4 w-4 text-gold-600 flex-shrink-0" />
                  <span>Use universal demo OTP code <strong>{DEMO_OTP}</strong> for instant verification.</span>
                </p>

                {/* Buyer pending status information notice */}
                {regRole === 'buyer' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <ShieldCheck className="h-4 w-4 text-amber-700" />
                      <span>Buyer Verification Policy</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-900/90">
                      Your buyer account will be created with <strong>Pending</strong> verification status. You can fill out your trade license, TIN, and corporate documents on your buyer dashboard while awaiting review by the System Admin.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-forest-700 hover:bg-forest-800 py-3.5 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registering with SMS…' : 'Register with Phone & OTP'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
