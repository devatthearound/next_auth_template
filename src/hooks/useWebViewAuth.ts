import { useEffect, useCallback } from 'react';
import { webViewManager, WebViewMessage } from '@/utils/webview-utils';

interface UseWebViewAuthProps {
  onTokensReceived?: (accessToken: string, refreshToken?: string) => void;
  onTokensCleared?: () => void;
  onLogin?: (accessToken: string, refreshToken?: string) => void;
  onLogout?: () => void;
  onFcmTokenReceived?: (fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']) => void;
  onFcmTokenCleared?: () => void;
}

export const useWebViewAuth = ({
  onTokensReceived,
  onTokensCleared,
  onLogin,
  onLogout,
  onFcmTokenReceived,
  onFcmTokenCleared
}: UseWebViewAuthProps = {}) => {

  // WebView 메시지 핸들러
  const handleWebViewMessage = useCallback((message: WebViewMessage) => {
    console.log('🎯 useWebViewAuth 메시지 처리:', message.type, message);
    
    switch (message.type) {
      case 'TOKEN_RESPONSE':
        console.log('🔑 TOKEN_RESPONSE 처리 중...', message.accessToken ? '토큰 있음' : '토큰 없음');
        if (message.accessToken && onTokensReceived) {
          onTokensReceived(message.accessToken, message.refreshToken);
        }
        break;
        
      case 'SAVE_TOKENS':
        console.log('💾 SAVE_TOKENS 처리 중...', message.accessToken ? '토큰 있음' : '토큰 없음');
        if (message.accessToken && onLogin) {
          onLogin(message.accessToken, message.refreshToken);
        }
        break;
        
      case 'CLEAR_TOKENS':
        console.log('🗑️ CLEAR_TOKENS 처리 중...');
        if (onLogout) {
          onLogout();
        }
        break;

      case 'FCM_TOKEN_RESPONSE':
        console.log('🔔 FCM_TOKEN_RESPONSE 처리 중...', {
          fcmToken: message.fcmToken ? message.fcmToken.substring(0, 50) + '...' : '없음',
          deviceInfo: message.deviceInfo,
          hasCallback: !!onFcmTokenReceived
        });
        if (message.fcmToken && onFcmTokenReceived) {
          console.log('✅ FCM 토큰 콜백 실행 중...');
          onFcmTokenReceived(message.fcmToken, message.deviceInfo);
        } else {
          console.log('❌ FCM 토큰 처리 실패:', {
            hasToken: !!message.fcmToken,
            hasCallback: !!onFcmTokenReceived
          });
        }
        break;

      case 'SAVE_FCM_TOKEN':
        console.log('💾 SAVE_FCM_TOKEN 처리 중...', {
          fcmToken: message.fcmToken ? message.fcmToken.substring(0, 50) + '...' : '없음',
          deviceInfo: message.deviceInfo,
          hasCallback: !!onFcmTokenReceived
        });
        if (message.fcmToken && onFcmTokenReceived) {
          console.log('✅ FCM 토큰 저장 콜백 실행 중...');
          onFcmTokenReceived(message.fcmToken, message.deviceInfo);
        } else {
          console.log('❌ FCM 토큰 저장 처리 실패:', {
            hasToken: !!message.fcmToken,
            hasCallback: !!onFcmTokenReceived
          });
        }
        break;

      case 'CLEAR_FCM_TOKEN':
        console.log('🗑️ CLEAR_FCM_TOKEN 처리 중...', { hasCallback: !!onFcmTokenCleared });
        if (onFcmTokenCleared) {
          console.log('✅ FCM 토큰 삭제 콜백 실행 중...');
          onFcmTokenCleared();
        }
        break;
        
      default:
        console.log('⚠️ 알 수 없는 메시지 타입:', message.type);
    }
  }, [onTokensReceived, onTokensCleared, onLogin, onLogout, onFcmTokenReceived, onFcmTokenCleared]);

  // WebView 환경 초기화
  useEffect(() => {
    console.log('🚀 useWebViewAuth 초기화 시작...', {
      isWebView: webViewManager.isReactNativeWebView(),
      hasCallbacks: {
        onTokensReceived: !!onTokensReceived,
        onFcmTokenReceived: !!onFcmTokenReceived
      }
    });

    if (!webViewManager.isReactNativeWebView()) {
      console.log('❌ WebView 환경이 아님, 초기화 중단');
      return;
    }

    // 메시지 리스너 등록
    console.log('🔔 메시지 리스너 등록 중...');
    webViewManager.addMessageListener(handleWebViewMessage);

    // 저장된 토큰 요청 (한 번만)
    let tokenRequested = false;
    let fcmRequested = false;

    const requestTokens = async () => {
      if (tokenRequested) return;
      tokenRequested = true;
      
      try {
        console.log('🔍 저장된 인증 토큰 요청 중...');
        const tokens = await webViewManager.requestStoredTokens();
        if (tokens?.accessToken && onTokensReceived) {
          console.log('✅ 저장된 인증 토큰 수신 성공');
          onTokensReceived(tokens.accessToken, tokens.refreshToken);
        } else {
          console.log('❌ 저장된 인증 토큰 없음 또는 콜백 없음');
        }
      } catch (error) {
        console.error('❌ WebView 인증 토큰 요청 실패:', error);
      }
    };

    // 저장된 FCM 토큰 요청 (한 번만)
    const requestFcmToken = async () => {
      if (fcmRequested) return;
      fcmRequested = true;
      
      try {
        console.log('🔍 저장된 FCM 토큰 요청 중...', { hasCallback: !!onFcmTokenReceived });
        const fcmData = await webViewManager.requestStoredFcmToken();
        console.log('📥 FCM 토큰 요청 응답:', fcmData);
        
        if (fcmData?.fcmToken && onFcmTokenReceived) {
          console.log('✅ 저장된 FCM 토큰 수신 성공, 콜백 실행 중...');
          onFcmTokenReceived(fcmData.fcmToken, fcmData.deviceInfo);
        } else {
          console.log('❌ 저장된 FCM 토큰 처리 실패:', {
            hasToken: !!fcmData?.fcmToken,
            hasCallback: !!onFcmTokenReceived,
            fcmData
          });
        }
      } catch (error) {
        console.error('❌ WebView FCM 토큰 요청 실패:', error);
      }
    };

    // 페이지 로드 완료 후 토큰들 요청 (한 번만)
    console.log('⏰ 토큰 요청 스케줄링...');
    const tokenTimeout = setTimeout(() => {
      console.log('🏃 인증 토큰 요청 실행');
      requestTokens();
    }, 100);
    
    const fcmTimeout = setTimeout(() => {
      console.log('🏃 FCM 토큰 요청 실행');
      requestFcmToken();
    }, 200);

    // 클린업
    return () => {
      console.log('🧹 useWebViewAuth 클린업...');
      clearTimeout(tokenTimeout);
      clearTimeout(fcmTimeout);
      webViewManager.removeMessageListener(handleWebViewMessage);
    };
  }, []); // 의존성 배열을 빈 배열로 변경하여 한 번만 실행

  // WebView 환경에서 토큰 저장
  const saveTokensToWebView = useCallback((accessToken: string, refreshToken?: string) => {
    if (webViewManager.isReactNativeWebView()) {
      console.log('💾 WebView로 인증 토큰 저장 요청');
      webViewManager.saveTokens(accessToken, refreshToken);
    }
  }, []);

  // WebView 환경에서 토큰 삭제
  const clearTokensFromWebView = useCallback(() => {
    if (webViewManager.isReactNativeWebView()) {
      console.log('🗑️ WebView에서 인증 토큰 삭제 요청');
      webViewManager.clearTokens();
    }
  }, []);

  // WebView 환경에서 FCM 토큰 저장
  const saveFcmTokenToWebView = useCallback((fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']) => {
    if (webViewManager.isReactNativeWebView()) {
      console.log('💾 WebView로 FCM 토큰 저장 요청');
      webViewManager.saveFcmToken(fcmToken, deviceInfo);
    }
  }, []);

  // WebView 환경에서 FCM 토큰 삭제
  const clearFcmTokenFromWebView = useCallback(() => {
    if (webViewManager.isReactNativeWebView()) {
      console.log('🗑️ WebView에서 FCM 토큰 삭제 요청');
      webViewManager.clearFcmToken();
    }
  }, []);

  // 저장된 토큰 요청
  const requestStoredTokens = useCallback(async () => {
    if (webViewManager.isReactNativeWebView()) {
      return await webViewManager.requestStoredTokens();
    }
    return null;
  }, []);

  // 저장된 FCM 토큰 요청
  const requestStoredFcmToken = useCallback(async () => {
    if (webViewManager.isReactNativeWebView()) {
      return await webViewManager.requestStoredFcmToken();
    }
    return null;
  }, []);

  return {
    isWebView: webViewManager.isReactNativeWebView(),
    isMobile: webViewManager.isMobileEnvironment(),
    saveTokensToWebView,
    clearTokensFromWebView,
    requestStoredTokens,
    saveFcmTokenToWebView,
    clearFcmTokenFromWebView,
    requestStoredFcmToken
  };
}; 