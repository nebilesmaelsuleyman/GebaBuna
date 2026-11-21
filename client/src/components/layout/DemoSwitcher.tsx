'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, ShieldAlert, Award, Sparkles } from 'lucide-react';

export const DemoSwitcher: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const router = useRouter();

  const handleSwitch = async (newRole: 'farmer' | 'buyer' | 'admin' | 'guest', targetPath: string) => {
    try {
      await switchDemoRole(newRole);
      router.push(targetPath);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="bg-coffee-950 text-white text-xs border-b border-coffee-800 py-2 px-4 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
          </span>
          <span className="font-semibold text-gold-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Jimma Hackathon Demo Mode:
          </span>
          <span className="text-coffee-200 hidden sm:inline">
            Active: <strong className="text-white">{user?.fullName || 'Public Guest'}</strong> ({role.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          <button
            onClick={() => handleSwitch('farmer', '/farmer')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              role === 'farmer'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                : 'bg-coffee-900 text-coffee-200 hover:bg-coffee-800'
            }`}
          >
            <Award className="w-3 h-3 text-gold-300" />
            🌾 Gemechu (Gold Farmer)
          </button>

          <button
            onClick={() => handleSwitch('buyer', '/buyer')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              role === 'buyer'
                ? 'bg-forest-600 text-white shadow-sm ring-2 ring-forest-300'
                : 'bg-coffee-900 text-coffee-200 hover:bg-coffee-800'
            }`}
          >
            <UserCheck className="w-3 h-3 text-forest-300" />
            🏢 Oromia Union (Fair Buyer 96%)
          </button>

          <button
            onClick={() => handleSwitch('admin', '/admin')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
              role === 'admin'
                ? 'bg-red-700 text-white shadow-sm ring-2 ring-red-300'
                : 'bg-coffee-900 text-coffee-200 hover:bg-coffee-800'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-red-300" />
            👑 Agri Bureau (Admin)
          </button>

          <button
            onClick={() => handleSwitch('guest', '/')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${
              role === 'guest'
                ? 'bg-stone-600 text-white shadow-sm ring-2 ring-stone-300'
                : 'bg-coffee-900 text-coffee-300 hover:bg-coffee-800'
            }`}
          >
            👁 Public Guest
          </button>
        </div>
      </div>
    </div>
  );
};
