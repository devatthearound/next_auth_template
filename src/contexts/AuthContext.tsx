// src/contexts/AuthContext.tsx - ApiClient 통합된 버전

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';

type UserType = 'CUSTOMER' | 'OWNER';

interface User {
  id: string;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
  userType: UserType;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isOwner: boolean;
  refreshCsrfToken: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  verifyPhone: (token: string) => Promise<boolean>;
  requestEmailVerification: () => Promise<boolean>;
  requestPhoneVerification: () => Promise<boolean>;
  // API 클라이언트 추가
  api: ApiClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTokenExpired, setRefreshTokenExpired] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // API 클라이언트 인스턴스
  const [api, setApi] = useState<ApiClient>(() => new ApiClient());

  // API 클라이언트 업데이트
  useEffect(() => {
    const newApi = new ApiClient({
      accessToken: accessToken || undefined,
      refreshCsrfToken,
    });
    setApi(newApi);
  }, [accessToken]);

  // Token expiration handling
  const startRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = setInterval(async () => {
      const success = await refreshAccessToken();
      if (!success && !refreshTokenExpired) {
        setRefreshTokenExpired(true);
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // Access token refresh
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken() || '',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        setAccessToken(data.accessToken);
        setRefreshTokenExpired(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  };

  // Load user on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setAccessToken(token);
      fetchUserProfile(token);
      startRefreshTimer();
    } else {
      setIsLoading(false);
    }
    
    refreshCsrfToken();

    return () => {
      stopRefreshTimer();
    };
  }, []);

  // CSRF token refresh
  const refreshCsrfToken = async (): Promise<void> => {
    try {
      await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  };

  // Get user profile using API client
  const fetchUserProfile = async (token: string) => {
    try {
      setIsLoading(true);
      const tempApi = new ApiClient({ accessToken: token });
      const data = await tempApi.getJson('/user/profile');
      setUser(data.user);
      startRefreshTimer();
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
        stopRefreshTimer();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSRF token from cookies
  const getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  // Login using API client
  // Login using API client
  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const tempApi = new ApiClient({ refreshCsrfToken });
      const data = await tempApi.postJson('/auth/login', 
        { identifier, password }, 
        { skipAuth: true }
      );
      
      localStorage.setItem('accessToken', data.accessToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setRefreshTokenExpired(false);
      startRefreshTimer();
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register using API client
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const tempApi = new ApiClient({ refreshCsrfToken });
      await tempApi.postJson('/auth/register', userData, { skipAuth: true });
      
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout using API client
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      stopRefreshTimer();
      
      if (accessToken) {
        await api.postJson('/auth/logout', {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
      setRefreshTokenExpired(false);
      setIsLoading(false);
      router.push('/login');
    }
  };
  
  // Password reset request using API client
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const tempApi = new ApiClient({ refreshCsrfToken });
      await tempApi.postJson('/auth/reset-password', 
        { email }, 
        { skipAuth: true }
      );
      
      return true;
    } catch (error) {
      console.error('Password reset request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Email verification using API client
  const verifyEmail = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const tempApi = new ApiClient();
      await tempApi.get(`/auth/verify-email/${token}`, { skipAuth: true, skipCsrf: true });

      if (user) {
        setUser({
          ...user,
          isEmailVerified: true
        });
      }

      return true;
    } catch (error) {
      console.error('Email verification failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Phone verification using API client
  const verifyPhone = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await api.get(`/auth/verify-phone/${token}`, { skipAuth: true, skipCsrf: true });

      if (user) {
        setUser({
          ...user,
          isPhoneVerified: true
        });
      }

      return true;
    } catch (error) {
      console.error('Phone verification failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Request email verification using API client
  const requestEmailVerification = async (): Promise<boolean> => {
    if (!user || !accessToken) return false;
    
    try {
      setIsLoading(true);
      
      await api.postJson('/auth/request-email-verification', {});
      return true;
    } catch (error) {
      console.error('Email verification request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Request phone verification using API client
  const requestPhoneVerification = async (): Promise<boolean> => {
    if (!user || !accessToken) return false;
    
    try {
      setIsLoading(true);
      
      await api.postJson('/auth/request-phone-verification', {});
      return true;
    } catch (error) {
      console.error('Phone verification request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticated = !!user;
  const isCustomer = isAuthenticated && user?.userType === 'CUSTOMER';
  const isOwner = isAuthenticated && user?.userType === 'OWNER';

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated,
        isCustomer,
        isOwner,
        refreshCsrfToken,
        resetPassword,
        verifyEmail,
        verifyPhone,
        requestEmailVerification,
        requestPhoneVerification,
        api, // API 클라이언트 제공
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};