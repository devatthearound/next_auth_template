// src/hooks/useApi.ts

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiClient } from '@/lib/api-client';

interface UseApiResult {
  api: ApiClient;
  isLoading: boolean;
}

export function useApi(): UseApiResult {
  const { accessToken, refreshCsrfToken, isLoading } = useAuth();

  // ApiClient 인스턴스를 메모이제이션
  const api = useMemo(() => {
    return new ApiClient({
      accessToken: accessToken || undefined,
      refreshCsrfToken,
    });
  }, [accessToken, refreshCsrfToken]);

  return {
    api,
    isLoading,
  };
}

// 특정 API 엔드포인트에 대한 편의 훅들
export function useUserApi() {
  const { api } = useApi();
  
  return {
    // 프로필 조회
    getProfile: useCallback(() => {
      return api.getJson('/user/profile');
    }, [api]),
    
    // 프로필 업데이트
    updateProfile: useCallback((data: any) => {
      return api.patchJson('/user/profile', data);
    }, [api]),
    
    // 활동 이력 조회
    getActivities: useCallback((params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return api.getJson(`/user/activities${queryString}`);
    }, [api]),
  };
}

export function useCustomerApi() {
  const { api } = useApi();
  
  return {
    // 고객 정보 업데이트
    updateCustomer: useCallback((data: any) => {
      return api.patchJson('/customer/update', data);
    }, [api]),
  };
}

export function useOwnerApi() {
  const { api } = useApi();
  
  return {
    // 사업자 정보 업데이트
    updateOwner: useCallback((data: any) => {
      return api.patchJson('/owner/update', data);
    }, [api]),
  };
}

export function useKakaoTalkApi() {
  const { api } = useApi();
  
  return {
    // 카카오톡 메시지 전송
    sendMessage: useCallback((data: {
      templateCode: string;
      phoneNumber: string;
      variables: Record<string, string>;
    }) => {
      return api.postJson('/kakao-talk/send', data);
    }, [api]),
  };
}

// 인증 관련 API (토큰이 필요하지 않은 경우)
export function useAuthApi() {
  const { refreshCsrfToken } = useAuth();
  
  const api = useMemo(() => {
    return new ApiClient({ refreshCsrfToken });
  }, [refreshCsrfToken]);
  
  return {
    // 로그인 (인증 토큰 불필요)
    login: useCallback((data: { email: string; password: string }) => {
      return api.postJson('/auth/login', data, { skipAuth: true });
    }, [api]),
    
    // 회원가입 (인증 토큰 불필요)
    register: useCallback((data: any) => {
      return api.postJson('/auth/register', data, { skipAuth: true });
    }, [api]),
    
    // 비밀번호 재설정 요청 (인증 토큰 불필요)
    requestPasswordReset: useCallback((data: { email: string }) => {
      return api.postJson('/auth/reset-password', data, { skipAuth: true });
    }, [api]),
    
    // 비밀번호 재설정 완료 (인증 토큰 불필요)
    resetPassword: useCallback((data: { token: string; password: string }) => {
      return api.putJson('/auth/reset-password', data, { skipAuth: true });
    }, [api]),
  };
}