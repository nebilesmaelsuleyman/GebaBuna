'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types';
import { api, SESSION_EXPIRED_EVENT } from '../services/api';

export interface AuthResponseResult {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  role: Role | 'guest';
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthResponseResult>;
  otpLogin: (phone: string, code: string, extra?: { role?: string; fullName?: string }) => Promise<AuthResponseResult>;
  register: (payload: Record<string, any>) => Promise<AuthResponseResult>;
  logout: () => void;
  /** Signs in with a seeded demo account. Throws with a readable message on failure. */
  switchDemoRole: (role: Role | 'guest') => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Real accounts created by `npm run seed` in /server
export const DEMO_ACCOUNTS: Record<Role, { identifier: string; password: string }> = {
  farmer: { identifier: '0917112233', password: 'farmer123456' },
  buyer: { identifier: 'dejene@oromia-union.com', password: 'buyer123456' },
  admin: { identifier: 'admin@jimma-agri.gov.et', password: 'admin123456' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('buna_token');
    localStorage.removeItem('buna_user');
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('buna_token');
    const savedUser = localStorage.getItem('buna_user');

    // Old builds stored fake "demo_token_*" sessions that the API always rejects
    if (savedToken && savedUser && !savedToken.startsWith('demo_token')) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        logout();
      }
    } else {
      logout();
    }
    setIsLoading(false);

    window.addEventListener(SESSION_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
  }, [logout]);

  const applySession = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('buna_token', nextToken);
    localStorage.setItem('buna_user', JSON.stringify(nextUser));
  };

  const login = async (identifier: string, password: string): Promise<AuthResponseResult> => {
    try {
      const res = await api.login(identifier, password);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return { success: true };
      }
      return { success: false, message: 'Invalid credentials. Please verify and try again.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Login failed. Please check your credentials.' };
    }
  };

  const otpLogin = async (
    phone: string,
    code: string,
    extra?: { role?: string; fullName?: string }
  ): Promise<AuthResponseResult> => {
    try {
      const res = await api.otpLogin(phone, code, extra);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return { success: true };
      }
      return { success: false, message: 'Verification failed. Please check the SMS code.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'OTP verification failed.' };
    }
  };

  const register = async (payload: Record<string, any>): Promise<AuthResponseResult> => {
    try {
      const res = await api.register(payload);
      if (res.success && res.token) {
        applySession(res.token, res.user);
        return { success: true };
      }
      return { success: false, message: 'Registration did not complete. Please check the fields.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Registration failed. Please check the fields and try again.' };
    }
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
    let res;
    try {
      res = await api.login(demo.identifier, demo.password);
    } catch (err: any) {
      throw new Error(
        err?.offline
          ? err.message
          : `Demo login failed: ${err?.message || 'unknown error'}. Run "npm run seed" in /server to create the demo accounts.`
      );
    }
    if (!res.success || !res.token) {
      throw new Error('Demo login failed. Run "npm run seed" in /server to create the demo accounts.');
    }
    applySession(res.token, res.user);
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
