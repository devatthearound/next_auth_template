// src/contexts/AuthContext.tsx - ApiClient 통합된 버전

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '@/lib/api-client';
import { useWebViewAuth } from '@/hooks/useWebViewAuth';
import { webViewManager, WebViewMessage } from '@/utils/webview-utils';

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
  // WebView 정보 추가
  isWebView: boolean;
  isMobile: boolean;
  // FCM 토큰 관리 추가
  saveFcmToken: (fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']) => Promise<boolean>;
  clearFcmToken: () => Promise<boolean>;
  getFcmTokens: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshTokenExpired, setRefreshTokenExpired] = useState<boolean>(false);
  const [api, setApi] = useState<ApiClient>(new ApiClient({}));
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 임시 저장된 FCM 토큰 정보
  const [pendingFcmToken, setPendingFcmToken] = useState<{
    fcmToken: string;
    deviceInfo?: WebViewMessage['deviceInfo'];
  } | null>(null);

  // WebView 인증 훅 사용
  const {
    isWebView,
    isMobile,
    saveTokensToWebView,
    clearTokensFromWebView,
    requestStoredTokens,
    saveFcmTokenToWebView,
    clearFcmTokenFromWebView,
    requestStoredFcmToken
  } = useWebViewAuth({
    onTokensReceived: (accessToken: string, refreshToken?: string) => {
      // WebView에서 토큰을 받았을 때 처리
      console.log('🔑 WebView에서 토큰 수신:', { 
        accessToken: accessToken ? accessToken.substring(0, 50) + '...' : 'null', 
        refreshToken: refreshToken ? 'present' : 'null'
      });
      
      if (accessToken) {
        setAccessToken(accessToken);
        localStorage.setItem('accessToken', accessToken);
        console.log('🚀 사용자 프로필 조회 시작...');
        fetchUserProfile(accessToken);
        startRefreshTimer();
      } else {
        console.log('❌ WebView에서 빈 토큰 수신, 로딩 상태 해제');
        setIsLoading(false);
      }
    },
    onLogout: () => {
      // WebView에서 로그아웃 요청 시 처리
      handleLogoutCleanup();
    },
    onFcmTokenReceived: async (fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']) => {
      // WebView에서 FCM 토큰을 받았을 때 서버에 저장
      console.log('🔔 AuthContext: WebView에서 FCM 토큰 수신:', {
        fcmToken: fcmToken.substring(0, 50) + '...',
        deviceInfo,
        hasUser: !!user,
        hasAccessToken: !!accessToken
      });
      
      // 사용자가 로그인되어 있을 때만 FCM 토큰을 서버에 저장
      if (user && accessToken) {
        console.log('✅ 사용자 로그인 상태 확인됨, FCM 토큰 서버 저장 시작...');
        const success = await saveFcmTokenToServer(fcmToken, deviceInfo);
        console.log('💾 FCM 토큰 서버 저장 결과:', success ? '성공' : '실패');
      } else {
        console.log('❌ 사용자 미로그인 상태, FCM 토큰 임시 저장...', {
          hasUser: !!user,
          hasAccessToken: !!accessToken
        });
        // 임시 저장: 사용자가 로그인하면 처리
        setPendingFcmToken({ fcmToken, deviceInfo });
      }
    },
    onFcmTokenCleared: async () => {
      // WebView에서 FCM 토큰 삭제 요청 시 처리
      console.log('🗑️ AuthContext: WebView에서 FCM 토큰 삭제 요청');
      if (user && accessToken) {
        console.log('✅ 사용자 로그인 상태 확인됨, FCM 토큰 서버 삭제 시작...');
        const success = await clearFcmTokenFromServer();
        console.log('🗑️ FCM 토큰 서버 삭제 결과:', success ? '성공' : '실패');
      }
    }
  });

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

  // Access token refresh (WebView 환경 고려)
  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      // WebView 환경에서는 네이티브에서 토큰 갱신 처리
      if (isWebView) {
        const tokens = await requestStoredTokens();
        if (tokens?.accessToken) {
          localStorage.setItem('accessToken', tokens.accessToken);
          setAccessToken(tokens.accessToken);
          setRefreshTokenExpired(false);
          return true;
        }
        return false;
      }

      // 웹 브라우저 환경에서는 기존 방식 사용
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

  // FCM 토큰을 서버에 저장
  const saveFcmTokenToServer = async (fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']): Promise<boolean> => {
    try {
      console.log('🚀 FCM 토큰 서버 저장 시작...', {
        fcmToken: fcmToken.substring(0, 50) + '...',
        deviceInfo,
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        userId: user?.id
      });

      if (!user || !accessToken) {
        console.log('❌ FCM 토큰 저장 실패: 사용자 또는 토큰 없음');
        return false;
      }

      // 중복 저장 방지를 위해 현재 토큰 목록 확인
      try {
        const existingTokens = await api.getJson('/user/fcm-token');
        const existingFcmTokens = existingTokens.fcmTokens || [];
        
        if (existingFcmTokens.some((token: any) => token.fcmToken === fcmToken)) {
          console.log('✅ FCM 토큰이 이미 저장되어 있음, 중복 저장 방지');
          return true;
        }
      } catch (error) {
        console.log('⚠️ 기존 FCM 토큰 확인 실패, 저장 진행');
      }

      console.log('📤 API 호출 중: /user/fcm-token');
      const response = await api.postJson('/user/fcm-token', {
        fcmToken,
        deviceId: deviceInfo?.deviceId,
        deviceType: deviceInfo?.deviceType,
        deviceInfo: deviceInfo?.deviceInfo,
        appVersion: deviceInfo?.appVersion,
      });

      console.log('✅ FCM 토큰 서버 저장 성공:', response);
      return true;
    } catch (error) {
      console.error('❌ FCM 토큰 서버 저장 실패:', error);
      
      // 429 에러 시 성공으로 처리 (이미 저장되어 있을 가능성)
      if (error instanceof Error && error.message.includes('429')) {
        console.log('⚠️ Rate Limit 발생, FCM 토큰은 이미 저장되어 있을 수 있음');
        return true;
      }
      
      return false;
    }
  };

  // FCM 토큰을 서버에서 삭제
  const clearFcmTokenFromServer = async (): Promise<boolean> => {
    try {
      console.log('🚀 FCM 토큰 서버 삭제 시작...', {
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        userId: user?.id
      });

      if (!user || !accessToken) {
        console.log('❌ FCM 토큰 삭제 실패: 사용자 또는 토큰 없음');
        return false;
      }

      console.log('📤 API 호출 중: /user/fcm-token?all=true');
      await api.deleteJson('/user/fcm-token?all=true');
      console.log('✅ FCM 토큰 서버 삭제 성공');
      return true;
    } catch (error) {
      console.error('❌ FCM 토큰 서버 삭제 실패:', error);
      return false;
    }
  };

  // Load user on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      // 전체 초기화 프로세스에 대한 최대 타임아웃 (10초)
      const globalTimeout = setTimeout(() => {
        console.log('⏰ 전체 초기화 타임아웃, 강제로 로딩 상태 해제');
        setIsLoading(false);
      }, 10000);

      try {
        const token = localStorage.getItem('accessToken');
        
        if (token) {
          setAccessToken(token);
          await fetchUserProfile(token);
          startRefreshTimer();
          clearTimeout(globalTimeout);
        } else if (isWebView) {
          // WebView 환경에서는 네이티브에서 토큰 요청
          console.log('WebView 환경에서 토큰 요청 중...');
          
          // WebView 환경에서는 최대 5초 후 타임아웃 처리
          const webViewTimeout = setTimeout(() => {
            console.log('⏰ WebView 토큰 요청 타임아웃, 로딩 상태 해제');
            clearTimeout(globalTimeout);
            setIsLoading(false);
          }, 5000);
          
          // 토큰 요청을 시도하고 응답이 오면 타임아웃 해제
          try {
            const tokens = await requestStoredTokens();
            clearTimeout(webViewTimeout);
            clearTimeout(globalTimeout);
            
            if (!tokens?.accessToken) {
              console.log('❌ WebView에서 저장된 토큰 없음, 로딩 상태 해제');
              setIsLoading(false);
            }
            // 토큰이 있으면 onTokensReceived 콜백에서 처리
          } catch (error) {
            clearTimeout(webViewTimeout);
            clearTimeout(globalTimeout);
            console.error('❌ WebView 토큰 요청 실패:', error);
            setIsLoading(false);
          }
        } else {
          clearTimeout(globalTimeout);
          setIsLoading(false);
        }
        
        if (!isWebView) {
          refreshCsrfToken();
        }
      } catch (error) {
        clearTimeout(globalTimeout);
        console.error('❌ 초기화 중 오류 발생:', error);
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      stopRefreshTimer();
    };
  }, [isWebView, requestStoredTokens]);

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
      console.log('👤 fetchUserProfile 시작, token:', token ? token.substring(0, 50) + '...' : 'null');
      setIsLoading(true);
      const tempApi = new ApiClient({ accessToken: token });
      console.log('📞 API 호출: /user/profile');
      const data = await tempApi.getJson('/user/profile');
      console.log('✅ 사용자 프로필 조회 성공:', {
        userId: data.user?.id,
        userType: data.user?.userType,
        name: data.user?.name
      });
      setUser(data.user);
      startRefreshTimer();
    } catch (error) {
      console.error('❌ 사용자 프로필 조회 실패:', error);
      
      // 429 에러 (Too Many Requests) 시 재시도하지 않음
      if (error instanceof Error && error.message.includes('429')) {
        console.log('❌ API Rate Limit 발생, 재시도 중단');
        setIsLoading(false);
        return;
      }
      
      console.log('🔄 토큰 갱신 시도...');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.log('❌ 토큰 갱신 실패, 로그아웃 처리');
        localStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);
        stopRefreshTimer();
        if (isWebView) {
          clearTokensFromWebView();
        }
      }
    } finally {
      console.log('⏹️ fetchUserProfile 완료, loading 상태 해제');
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

  // Login using API client (WebView 환경 고려)
  const login = async (identifier: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      if (!isWebView) {
        await refreshCsrfToken();
      }
      
      const tempApi = new ApiClient({ refreshCsrfToken: isWebView ? undefined : refreshCsrfToken });
      const data = await tempApi.postJson('/auth/login', 
        { identifier, password }, 
        { skipAuth: true, skipCsrf: isWebView }
      );
      
      localStorage.setItem('accessToken', data.accessToken);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setRefreshTokenExpired(false);
      
      // WebView 환경에서는 네이티브에 토큰 저장
      if (isWebView && data.refreshToken) {
        saveTokensToWebView(data.accessToken, data.refreshToken);
      }
      
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
      
      if (!isWebView) {
        await refreshCsrfToken();
      }
      
      const tempApi = new ApiClient({ refreshCsrfToken: isWebView ? undefined : refreshCsrfToken });
      await tempApi.postJson('/auth/register', userData, { 
        skipAuth: true, 
        skipCsrf: isWebView 
      });
      
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 로그아웃 정리 작업
  const handleLogoutCleanup = () => {
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
    setRefreshTokenExpired(false);
    stopRefreshTimer();
    setIsLoading(false);
  };

  // Logout using API client (WebView 환경 고려)
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      stopRefreshTimer();
      
      if (accessToken) {
        // 로그아웃 전에 FCM 토큰도 비활성화
        await clearFcmTokenFromServer();
        await api.postJson('/auth/logout', {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      handleLogoutCleanup();
      
      // WebView 환경에서는 네이티브에서도 토큰 삭제
      if (isWebView) {
        clearTokensFromWebView();
        clearFcmTokenFromWebView();
      }
      
      router.push('/login');
    }
  };
  
  // Password reset request using API client
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      if (!isWebView) {
        await refreshCsrfToken();
      }
      
      const tempApi = new ApiClient({ refreshCsrfToken: isWebView ? undefined : refreshCsrfToken });
      await tempApi.postJson('/auth/reset-password', 
        { email }, 
        { skipAuth: true, skipCsrf: isWebView }
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

  // FCM 토큰 저장 (외부에서 호출 가능)
  const saveFcmToken = async (fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']): Promise<boolean> => {
    try {
      // 서버에 저장
      const serverSuccess = await saveFcmTokenToServer(fcmToken, deviceInfo);
      
      // WebView 환경이면 네이티브에도 저장
      if (isWebView) {
        saveFcmTokenToWebView(fcmToken, deviceInfo);
      }
      
      return serverSuccess;
    } catch (error) {
      console.error('FCM 토큰 저장 실패:', error);
      return false;
    }
  };

  // FCM 토큰 삭제 (외부에서 호출 가능)
  const clearFcmToken = async (): Promise<boolean> => {
    try {
      // 서버에서 삭제
      const serverSuccess = await clearFcmTokenFromServer();
      
      // WebView 환경이면 네이티브에서도 삭제
      if (isWebView) {
        clearFcmTokenFromWebView();
      }
      
      return serverSuccess;
    } catch (error) {
      console.error('FCM 토큰 삭제 실패:', error);
      return false;
    }
  };

  // FCM 토큰 목록 조회
  const getFcmTokens = async (): Promise<string[]> => {
    try {
      if (!user || !accessToken) return [];
      
      const data = await api.getJson('/user/fcm-token');
      return data.fcmTokens || [];
    } catch (error) {
      console.error('FCM 토큰 목록 조회 실패:', error);
      return [];
    }
  };

  // 사용자 상태 변경 시 임시 저장된 FCM 토큰 처리
  useEffect(() => {
    const processPendingFcmToken = async () => {
      if (user && accessToken && pendingFcmToken) {
        console.log('🔄 사용자 로그인 완료, 임시 저장된 FCM 토큰 서버 저장 시작...');
        const success = await saveFcmTokenToServer(pendingFcmToken.fcmToken, pendingFcmToken.deviceInfo);
        console.log('💾 임시 저장 FCM 토큰 서버 저장 결과:', success ? '성공' : '실패');
        
        if (success) {
          setPendingFcmToken(null); // 성공하면 임시 저장 삭제
        }
      }
    };

    processPendingFcmToken();
  }, [user, accessToken, pendingFcmToken]);

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
        isWebView, // WebView 환경 정보
        isMobile, // 모바일 환경 정보
        saveFcmToken, // FCM 토큰 저장
        clearFcmToken, // FCM 토큰 삭제
        getFcmTokens, // FCM 토큰 목록 조회
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