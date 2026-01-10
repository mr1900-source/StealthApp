/**
 * Auth Context
 * 
 * Global authentication state.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { User, getToken } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (token) {
        const userData = await api.auth.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    await api.auth.login(email, password);
    const userData = await api.auth.getMe();
    setUser(userData);
  }

  async function signup(email: string, password: string, username?: string, name?: string) {
    await api.auth.signup(email, password, username, name);
    await login(email, password);
  }

  async function logout() {
    await api.auth.logout();
    setUser(null);
  }

  async function refreshUser() {
    try {
      const userData = await api.auth.getMe();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
