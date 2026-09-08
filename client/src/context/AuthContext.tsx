import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { User, Society } from '../types';

interface AuthContextType {
  user: User | null;
  society: Society | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: (role: 'admin' | 'committee' | 'resident' | 'platform_admin') => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('wattwise_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (!localStorage.getItem('wattwise_token')) {
        setUser(null);
        setSociety(null);
        setIsLoading(false);
        return;
      }
      const data = await api.get<{ user: User; society: Society | null }>('/auth/me');
      setUser(data.user);
      setSociety(data.society);
    } catch (err) {
      console.warn('Session expired or invalid token');
      localStorage.removeItem('wattwise_token');
      setUser(null);
      setSociety(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ token: string; user: User; society: Society | null }>('/auth/login', {
        email,
        password
      });
      localStorage.setItem('wattwise_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSociety(data.society);
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (role: 'admin' | 'committee' | 'resident' | 'platform_admin') => {
    setIsLoading(true);
    try {
      const data = await api.post<{ token: string; user: User; society: Society | null }>('/auth/demo-login', {
        role
      });
      localStorage.setItem('wattwise_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSociety(data.society);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.post<{ token: string; user: User; society: Society | null }>('/auth/register', data);
      localStorage.setItem('wattwise_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setSociety(res.society);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wattwise_token');
    setToken(null);
    setUser(null);
    setSociety(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        society,
        token,
        isLoading,
        login,
        demoLogin,
        register,
        logout,
        refreshProfile
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
