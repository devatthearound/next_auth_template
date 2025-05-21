'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes (considering 5min token expiry)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTokenExpired, setRefreshTokenExpired] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Token expiration handling
  const startRefreshTimer = () => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up new timer for token refresh
    refreshTimerRef.current = setInterval(async () => {
      const success = await refreshAccessToken();
      if (!success && !refreshTokenExpired) {
        // If token refresh fails and we haven't already flagged it as expired
        setRefreshTokenExpired(true);
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  // Stop refresh timer
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
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include', // to include the httpOnly refresh token cookie
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
    
    // CSRF token initialization
    refreshCsrfToken();

    // Cleanup refresh timer on unmount
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

  // Get user profile
  const fetchUserProfile = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        startRefreshTimer(); // Start token refresh timer
      } else {
        // Invalid token, attempt to refresh once
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          // If refresh fails, logout
          localStorage.removeItem('accessToken');
          setAccessToken(null);
          setUser(null);
          stopRefreshTimer();
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get CSRF token from cookies
  const getCsrfToken = (): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        return decodeURIComponent(value);
      }
    }
    return null;
  };

  // Login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
        setRefreshTokenExpired(false);
        startRefreshTimer();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      return response.ok;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      stopRefreshTimer();
      
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-XSRF-TOKEN': getCsrfToken() || '',
          },
          credentials: 'include',
        });
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
  
  // Password reset request
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      return response.ok;
    } catch (error) {
      console.error('Password reset request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Email verification
  const verifyEmail = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/auth/verify-email/${token}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok && user) {
        // Update user data to reflect verified email
        setUser({
          ...user,
          isEmailVerified: true
        });
      }

      return response.ok;
    } catch (error) {
      console.error('Email verification failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Phone verification
  const verifyPhone = async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/auth/verify-phone/${token}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok && user) {
        // Update user data to reflect verified phone
        setUser({
          ...user,
          isPhoneVerified: true
        });
      }

      return response.ok;
    } catch (error) {
      console.error('Phone verification failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Request email verification
  const requestEmailVerification = async (): Promise<boolean> => {
    if (!user || !accessToken) return false;
    
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const response = await fetch('/api/auth/request-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Email verification request failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Request phone verification
  const requestPhoneVerification = async (): Promise<boolean> => {
    if (!user || !accessToken) return false;
    
    try {
      setIsLoading(true);
      
      await refreshCsrfToken();
      
      const response = await fetch('/api/auth/request-phone-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-XSRF-TOKEN': getCsrfToken() || '',
        },
        credentials: 'include',
      });

      return response.ok;
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