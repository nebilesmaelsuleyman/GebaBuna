'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role | 'guest';
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  otpLogin: (phone: string, code: string) => Promise<boolean>;
  register: (payload: Record<string, any>) => Promise<boolean>;
  logout: () => void;
  switchDemoRole: (role: Role | 'guest') => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo Pre-configured accounts seeded in the backend
export const DEMO_ACCOUNTS = {
  farmer: {
    identifier: '0917112233',
    password: 'farmer123456',
    mockUser: {
      id: 'f-gemechu-1',
      fullName: 'Gemechu Daba (Mana Woreda)',
      phone: '+251 917 112 233',
      email: 'gemechu@buna.et',
      role: 'farmer' as Role,
      preferredLanguage: 'om' as const,
    },
  },
  buyer: {
    identifier: 'dejene@oromia-union.com',
    password: 'buyer123456',
    mockUser: {
      id: 'b-oromia-1',
      fullName: 'Dejene Dadi (Oromia Union)',
      phone: '+251 911 223 344',
      email: 'dejene@oromia-union.com',
      role: 'buyer' as Role,
      preferredLanguage: 'om' as const,
    },
  },
  admin: {
    identifier: 'admin@jimma-agri.gov.et',
    password: 'admin123456',
    mockUser: {
      id: 'a-bureau-1',
      fullName: 'Ato Bekele Tolera (Jimma Agri Bureau)',
      phone: '+251 917 000 111',
      email: 'admin@jimma-agri.gov.et',
      role: 'admin' as Role,
      preferredLanguage: 'om' as const,
    },
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check saved token or set default guest/farmer
    const savedToken = localStorage.getItem('buna_token');
    const savedUser = localStorage.getItem('buna_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('buna_token');
        localStorage.removeItem('buna_user');
      }
    } else {
      // Default initial view for smooth demo: Gemechu Farmer
      const defaultDemo = DEMO_ACCOUNTS.farmer.mockUser;
      setUser(defaultDemo);
      setToken('demo_token_farmer');
      localStorage.setItem('buna_user', JSON.stringify(defaultDemo));
      localStorage.setItem('buna_token', 'demo_token_farmer');
    }
    setIsLoading(false);
  }, []);

  const applySession = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('buna_token', nextToken);
    localStorage.setItem('buna_user', JSON.stringify(nextUser));
  };

  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(identifier, password);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return true;
      }
      return false;
    } catch {
      // Check if it matches demo accounts
      for (const [key, demo] of Object.entries(DEMO_ACCOUNTS)) {
        if (identifier === demo.identifier && password === demo.password) {
          applySession(`demo_token_${key}`, demo.mockUser);
          return true;
        }
      }
      return false;
    }
  };

  const otpLogin = async (phone: string, code: string): Promise<boolean> => {
    try {
      const res = await api.otpLogin(phone, code);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (payload: Record<string, any>): Promise<boolean> => {
    try {
      const res = await api.register(payload);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('buna_token');
    localStorage.removeItem('buna_user');
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const nextUser = { ...current, ...updates };
      localStorage.setItem('buna_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const switchDemoRole = async (targetRole: Role | 'guest') => {
    if (targetRole === 'guest') {
      logout();
      return;
    }

    const demo = DEMO_ACCOUNTS[targetRole];
    if (demo) {
      try {
        // Try real login against local backend if available
        const res = await api.login(demo.identifier, demo.password);
        if (res.success) {
          applySession(res.token, res.user);
          return;
        }
      } catch {
        // Fallback to preloaded mock demo user
      }
      applySession(`demo_token_${targetRole}`, demo.mockUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'guest',
        token,
        isLoading,
        login,
        otpLogin,
        register,
        logout,
        switchDemoRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
