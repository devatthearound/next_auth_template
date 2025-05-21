'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 토큰이 있으면 사용자 정보 로드
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setAccessToken(token);
      fetchUserProfile(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  // 사용자 프로필 가져오기
  const fetchUserProfile = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // 토큰이 유효하지 않으면 로그아웃
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Access Token:", data.accessToken); // 디버깅용
        localStorage.setItem('accessToken', data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
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

  // 회원가입
  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // 로그아웃
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setAccessToken(null);
      setUser(null);
      setIsLoading(false);
      router.push('/login');
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