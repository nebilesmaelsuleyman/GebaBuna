'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Coffee,
  Phone,
  Mail,
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, otpLogin, register, switchDemoRole } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'otp'>('login');
  const [identifier, setIdentifier] = useState('0917112233');
  const [password, setPassword] = useState('farmer123456');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Registration form state
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'farmer' | 'buyer' | 'admin'>('farmer');
  const [regWoreda, setRegWoreda] = useState('Mana');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const ok = await login(identifier, password);
    if (ok) {
      router.push('/');
    } else {
      setErrorMsg('Invalid login credentials. Please use the quick demo buttons below or check your details.');
    }
    setSubmitting(false);
  };

  const handleDemoSelect = async (role: 'farmer' | 'buyer' | 'admin', path: string) => {
    await switchDemoRole(role);
    router.push(path);
  };

  const handleOtpLogin = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    const ok = await otpLogin(identifier, otpCode);
    if (ok) {
      router.push('/farmer');
    } else {
      setErrorMsg('OTP login failed. For demo mode, use code 123456.');
    }
    setSubmitting(false);
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
    if (ok) {
      if (regRole === 'admin') {
        router.push('/admin');
      } else {
        router.push(regRole === 'farmer' ? '/farmer' : '/buyer');
      }
    } else {
      setErrorMsg('Registration failed. Please check all fields are filled correctly.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-coffee-50 to-white">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-coffee-200 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-coffee-600 flex items-center justify-center mx-auto shadow-md">
            <Coffee className="w-6 h-6 text-coffee-950" />
          </div>
          <h2 className="text-2xl font-extrabold text-coffee-950">
            {activeTab === 'login' ? 'Sign in to Buna Fair Price' : activeTab === 'otp' ? 'Phone OTP Verification' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-coffee-600">
            {activeTab === 'login'
              ? 'Enter your phone number or email with password'
              : activeTab === 'otp'
              ? 'Enter the 6-digit code sent to your phone'
              : 'Join the transparent coffee exchange in Jimma Zone'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-coffee-100 p-1 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'login' ? 'bg-white text-coffee-950 shadow' : 'text-coffee-600 hover:text-coffee-950'
            }`}
          >
            Password Login
          </button>
          <button
            onClick={() => { setActiveTab('otp'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'otp' ? 'bg-white text-coffee-950 shadow' : 'text-coffee-600 hover:text-coffee-950'
            }`}
          >
            Phone OTP
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`flex-1 py-2 rounded-lg transition-all text-center ${
              activeTab === 'register' ? 'bg-white text-coffee-950 shadow' : 'text-coffee-600 hover:text-coffee-950'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-coffee-900 block mb-1">
                Phone Number or Email:
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-coffee-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0917112233 or email@domain.com"
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-coffee-950 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-coffee-900 block mb-1">Password:</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-coffee-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-coffee-950 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Verifying...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-coffee-100 space-y-2">
              <label className="font-semibold text-coffee-900 block mb-1">Phone OTP Demo (Farmer Placeholder):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2.5 text-xs text-coffee-950 font-medium focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <button
                  type="button"
                  onClick={handleOtpLogin}
                  disabled={submitting}
                  className="px-4 rounded-xl bg-coffee-900 text-white text-xs font-bold hover:bg-coffee-800"
                >
                  OTP
                </button>
              </div>
              <p className="text-[10px] text-coffee-500">TODO: connect real SMS provider. Demo code is 123456.</p>
            </div>
          </form>
        ) : (
          /* Register Form */
          <form
            onSubmit={async (e) => {
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
              if (ok) {
                router.push(regRole === 'farmer' ? '/farmer' : '/buyer');
              } else {
                setErrorMsg('Registration failed. Check fields or use demo accounts below.');
              }
            }}
            className="space-y-3.5 text-xs"
          >
            <div>
              <label className="font-semibold text-coffee-900 block mb-1">Full Name:</label>
              <input
                type="text"
                placeholder="e.g. Tolera Gemeda"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-coffee-900 block mb-1">Role:</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3 py-2 text-xs text-coffee-950 font-medium"
                >
                  <option value="farmer">Smallholder Farmer</option>
                  <option value="buyer">Commercial Buyer</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-coffee-900 block mb-1">Woreda:</label>
                <select
                  value={regWoreda}
                  onChange={(e) => setRegWoreda(e.target.value)}
                  className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3 py-2 text-xs text-coffee-950 font-medium"
                >
                  <option value="Mana">Mana</option>
                  <option value="Gomma">Gomma</option>
                  <option value="Limmu Kosa">Limmu Kosa</option>
                  <option value="Agaro">Agaro</option>
                  <option value="Gera">Gera</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-coffee-900 block mb-1">Phone Number (Ethiopian):</label>
              <input
                type="text"
                placeholder="09..."
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-coffee-900 block mb-1">Email (optional):</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950"
              />
            </div>

            <div>
              <label className="font-semibold text-coffee-900 block mb-1">Password:</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-coffee-50/50 border border-coffee-300 rounded-xl px-3.5 py-2 text-xs text-coffee-950"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-forest-700 hover:bg-forest-600 text-white font-bold text-xs tracking-wide shadow-md transition-all mt-2"
            >
              {submitting ? 'Registering...' : 'Complete Registration & Enter'}
            </button>
          </form>
        )}

        {/* Quick Demo Access for Judges */}
        <div className="pt-4 border-t border-coffee-100 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-700 justify-center">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Demo Account Logins:</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoSelect('farmer', '/farmer')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-semibold flex items-center justify-between transition-colors"
            >
              <span>🌾 Gemechu Daba (Gold Farmer, Mana)</span>
              <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded font-mono">farmer123456</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('buyer', '/buyer')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-forest-50 hover:bg-forest-100 border border-forest-200 text-forest-950 font-semibold flex items-center justify-between transition-colors"
            >
              <span>🏢 Oromia Union (Fair Buyer 96%)</span>
              <span className="text-[10px] bg-forest-200 px-2 py-0.5 rounded font-mono">buyer123456</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSelect('admin', '/admin')}
              className="w-full py-2.5 px-3.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-950 font-semibold flex items-center justify-between transition-colors"
            >
              <span>👑 Jimma Agri Bureau (Admin Oversight)</span>
              <span className="text-[10px] bg-red-200 px-2 py-0.5 rounded font-mono">admin123456</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
