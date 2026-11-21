'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Coffee,
  TrendingUp,
  Store,
  Trophy,
  User,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Send,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('navHome'), icon: Coffee },
    { href: '/market', label: t('navMarketPrices'), icon: TrendingUp },
    { href: '/marketplace', label: t('navMarketplace'), icon: Store },
    { href: '/leaderboard', label: t('navLeaderboard'), icon: Trophy },
  ];

  if (role === 'farmer') {
    navLinks.push({ href: '/farmer', label: t('navFarmerPortal'), icon: User });
  } else if (role === 'buyer') {
    navLinks.push({ href: '/buyer', label: t('navBuyerPortal'), icon: Store });
  } else if (role === 'admin') {
    navLinks.push({ href: '/admin', label: t('navAdminPortal'), icon: ShieldCheck });
  }

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'am', label: 'አማ' },
    { code: 'om', label: 'OM' },
  ];

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <div className="brand-stripe h-1" />
      <div className="border-b border-coffee-200/80 bg-cream-50/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center justify-between gap-4 px-4 md:px-10">
          <NextLink href="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coffee-950 shadow-sm transition-transform group-hover:scale-105">
              <Coffee className="h-[18px] w-[18px] text-gold-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-extrabold leading-none tracking-tight text-coffee-950">
                Buna Fair Price
              </span>
              <span className="mt-1 text-[10px] font-medium leading-none tracking-wide text-coffee-500">
                {language === 'om'
                  ? 'Gatii Bunaa Qajeelaa'
                  : language === 'am'
                  ? 'ቡና ትክክለኛ ዋጋ'
                  : 'የቡና ትክክለኛ ዋጋ'}
              </span>
            </div>
          </NextLink>

          <nav className="hidden items-center gap-1 xl:flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-coffee-950 text-cream-50'
                      : 'text-coffee-700 hover:bg-coffee-100 hover:text-coffee-950'
                  }`}
                >
                  {link.label}
                </NextLink>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center rounded-full border border-coffee-200 bg-white/70 p-0.5 text-[11px] font-bold sm:flex">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code as 'en' | 'am' | 'om')}
                  className={`rounded-full px-2 py-1 transition-colors ${
                    language === l.code
                      ? 'bg-coffee-950 text-gold-300'
                      : 'text-coffee-600 hover:text-coffee-950'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <a
              href="https://t.me/BunaFairPriceBot"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-full bg-cherry-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-cherry-500 sm:inline-flex"
            >
              <Send className="h-3.5 w-3.5" />
              Open Telegram Bot
            </a>

            {user ? (
              <div className="flex items-center gap-2 border-l border-coffee-200 pl-2">
                <div className="hidden text-right lg:block">
                  <div className="max-w-[120px] truncate text-xs font-semibold text-coffee-950">
                    {user.fullName}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-cherry-700">
                    {user.role}
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-coffee-200 bg-white">
                  <User className="h-4 w-4 text-coffee-700" />
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="rounded-full p-1.5 text-coffee-600 transition-colors hover:bg-cherry-50 hover:text-cherry-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <NextLink
                href="/login"
                title="Sign In"
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-coffee-200 bg-white text-coffee-700 transition-colors hover:border-coffee-400 md:flex"
              >
                <User className="h-4 w-4" />
              </NextLink>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full border border-coffee-200 bg-white p-2 text-coffee-800 xl:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-1 border-t border-coffee-200 bg-cream-50 px-4 pb-5 pt-3 xl:hidden">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <NextLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    isActive ? 'bg-coffee-950 text-cream-50' : 'text-coffee-800 hover:bg-coffee-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-gold-300' : 'text-cherry-600'}`} />
                  {link.label}
                </NextLink>
              );
            })}
            <div className="mt-2 flex items-center justify-between border-t border-coffee-200 pt-3">
              <div className="flex gap-1.5">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code as 'en' | 'am' | 'om')}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      language === l.code
                        ? 'bg-coffee-950 text-gold-300'
                        : 'bg-coffee-100 text-coffee-700'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <a
                href="https://t.me/BunaFairPriceBot"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-cherry-600 px-3 py-1.5 text-xs font-bold text-white"
              >
                <Send className="h-3 w-3" />
                Telegram Bot
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
