export interface WebViewMessage {
  type: 'SAVE_TOKENS' | 'CLEAR_TOKENS' | 'REQUEST_TOKENS' | 'TOKEN_RESPONSE' | 
        'SAVE_FCM_TOKEN' | 'CLEAR_FCM_TOKEN' | 'REQUEST_FCM_TOKEN' | 'FCM_TOKEN_RESPONSE';
  accessToken?: string;
  refreshToken?: string;
  fcmToken?: string;
  deviceInfo?: {
    deviceId?: string;
    deviceType?: 'android' | 'ios' | 'web';
    deviceInfo?: string;
    appVersion?: string;
  };
  data?: any;
}

export class WebViewManager {
  private static instance: WebViewManager;
  private messageListeners: ((message: WebViewMessage) => void)[] = [];

  private constructor() {
    this.setupMessageHandler();
  }

  public static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  // React Native WebView 환경인지 확인
  public isReactNativeWebView(): boolean {
    return typeof window !== 'undefined' && 
           (window as any).ReactNativeWebView !== undefined;
  }

  // 일반 모바일 브라우저인지 확인 (카카오톡, 인스타그램 등)
  public isMobileBrowser(): boolean {
    if (typeof window === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
  }

  // WebView 또는 모바일 환경인지 확인
  public isMobileEnvironment(): boolean {
    return this.isReactNativeWebView() || this.isMobileBrowser();
  }

  // 메시지 리스너 등록
  public addMessageListener(listener: (message: WebViewMessage) => void): void {
    this.messageListeners.push(listener);
    console.log('🔔 WebView 메시지 리스너 등록됨. 총', this.messageListeners.length, '개');
  }

  // 메시지 리스너 제거
  public removeMessageListener(listener: (message: WebViewMessage) => void): void {
    const index = this.messageListeners.indexOf(listener);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
      console.log('🗑️ WebView 메시지 리스너 제거됨. 남은', this.messageListeners.length, '개');
    }
  }

  // React Native로 메시지 전송
  public postMessage(message: WebViewMessage): void {
    if (this.isReactNativeWebView()) {
      try {
        console.log('📤 WebView로 메시지 전송:', message.type, message);
        (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
      } catch (error) {
        console.error('❌ WebView 메시지 전송 실패:', error);
      }
    } else {
      console.warn('⚠️ WebView 환경이 아닙니다. 메시지를 전송할 수 없습니다.');
    }
  }

  // 토큰 저장 요청
  public saveTokens(accessToken: string, refreshToken?: string): void {
    this.postMessage({
      type: 'SAVE_TOKENS',
      accessToken,
      refreshToken
    });
  }

  // 토큰 삭제 요청
  public clearTokens(): void {
    this.postMessage({
      type: 'CLEAR_TOKENS'
    });
  }

  // FCM 토큰 저장 요청
  public saveFcmToken(fcmToken: string, deviceInfo?: WebViewMessage['deviceInfo']): void {
    console.log('💾 FCM 토큰 저장 요청:', fcmToken.substring(0, 50) + '...', deviceInfo);
    this.postMessage({
      type: 'SAVE_FCM_TOKEN',
      fcmToken,
      deviceInfo
    });
  }

  // FCM 토큰 삭제 요청
  public clearFcmToken(): void {
    console.log('🗑️ FCM 토큰 삭제 요청');
    this.postMessage({
      type: 'CLEAR_FCM_TOKEN'
    });
  }

  // 저장된 토큰 요청
  public requestStoredTokens(): Promise<{accessToken?: string, refreshToken?: string} | null> {
    return new Promise((resolve) => {
      if (!this.isReactNativeWebView()) {
        resolve(null);
        return;
      }

      console.log('🔍 저장된 토큰 요청 중...');

      // 응답 리스너 등록
      const responseListener = (message: WebViewMessage) => {
        if (message.type === 'TOKEN_RESPONSE') {
          console.log('✅ 토큰 응답 수신:', message);
          this.removeMessageListener(responseListener);
          resolve({
            accessToken: message.accessToken,
            refreshToken: message.refreshToken
          });
        }
      };

      this.addMessageListener(responseListener);

      // 토큰 요청
      this.postMessage({
        type: 'REQUEST_TOKENS'
      });

      // 3초 후 타임아웃
      setTimeout(() => {
        console.log('⏰ 토큰 요청 타임아웃');
        this.removeMessageListener(responseListener);
        resolve(null);
      }, 3000);
    });
  }

  // 저장된 FCM 토큰 요청
  public requestStoredFcmToken(): Promise<{fcmToken?: string, deviceInfo?: WebViewMessage['deviceInfo']} | null> {
    return new Promise((resolve) => {
      if (!this.isReactNativeWebView()) {
        resolve(null);
        return;
      }

      console.log('🔍 저장된 FCM 토큰 요청 중...');

      // 응답 리스너 등록
      const responseListener = (message: WebViewMessage) => {
        if (message.type === 'FCM_TOKEN_RESPONSE') {
          console.log('🎯 FCM 토큰 응답 수신:', message);
          this.removeMessageListener(responseListener);
          resolve({
            fcmToken: message.fcmToken,
            deviceInfo: message.deviceInfo
          });
        }
      };

      this.addMessageListener(responseListener);

      // FCM 토큰 요청
      this.postMessage({
        type: 'REQUEST_FCM_TOKEN'
      });

      // 3초 후 타임아웃
      setTimeout(() => {
        console.log('⏰ FCM 토큰 요청 타임아웃');
        this.removeMessageListener(responseListener);
        resolve(null);
      }, 3000);
    });
  }

  // 메시지 핸들러 설정
  private setupMessageHandler(): void {
    if (typeof window !== 'undefined') {
      // React Native에서 오는 메시지 처리
      (window as any).handleNativeMessage = (messageString: string) => {
        try {
          console.log('📥 Native 메시지 원본 수신:', messageString);
          const message: WebViewMessage = JSON.parse(messageString);
          console.log('📋 파싱된 메시지:', message);
          console.log('👂 등록된 리스너 수:', this.messageListeners.length);
          
          this.messageListeners.forEach((listener, index) => {
            console.log(`🔔 리스너 ${index + 1} 실행 중...`);
            listener(message);
          });
        } catch (error) {
          console.error('❌ WebView 메시지 파싱 실패:', error, 'Raw message:', messageString);
        }
      };

      // 메시지 핸들러가 등록되었는지 확인
      console.log('🌐 WebView 메시지 핸들러 등록 완료. handleNativeMessage:', typeof (window as any).handleNativeMessage);
    }
  }
}

// 싱글톤 인스턴스 export
export const webViewManager = WebViewManager.getInstance(); 