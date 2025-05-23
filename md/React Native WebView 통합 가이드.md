# React Native WebView 통합 가이드

## 📋 개요

이 가이드는 Next.js 웹 앱을 React Native WebView로 감싸서 하이브리드 앱을 만들고, 네이티브 저장소를 활용한 자동로그인 및 FCM 푸시 알림을 구현하는 방법을 제공합니다.

## 🛠️ 필요한 패키지 설치

```bash
# React Native WebView
npm install react-native-webview

# 보안 저장소 (토큰 저장용)
npm install react-native-keychain

# FCM 푸시 알림
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging

# AsyncStorage (대안)
npm install @react-native-async-storage/async-storage

# iOS 추가 설정
cd ios && pod install
```

## 📱 React Native 앱 코드

### 1. 토큰 매니저 (Keychain 사용)

```typescript
// src/utils/TokenManager.ts
import * as Keychain from 'react-native-keychain';

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  fcmToken?: string;
}

export class TokenManager {
  private static readonly SERVICE_NAME = 'YourAppTokens';
  private static readonly FCM_SERVICE_NAME = 'YourAppFCMToken';

  // 토큰 저장
  static async saveTokens(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      const tokenData: TokenData = { accessToken, refreshToken };
      
      await Keychain.setInternetCredentials(
        this.SERVICE_NAME,
        'user_tokens',
        JSON.stringify(tokenData)
      );
      
      console.log('토큰 저장 성공');
      return true;
    } catch (error) {
      console.error('토큰 저장 실패:', error);
      return false;
    }
  }

  // 토큰 불러오기
  static async getTokens(): Promise<TokenData | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.SERVICE_NAME);
      
      if (credentials && credentials.password) {
        const tokenData: TokenData = JSON.parse(credentials.password);
        console.log('토큰 불러오기 성공');
        return tokenData;
      }
      
      return null;
    } catch (error) {
      console.error('토큰 불러오기 실패:', error);
      return null;
    }
  }

  // 토큰 삭제
  static async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials(this.SERVICE_NAME);
      console.log('토큰 삭제 성공');
      return true;
    } catch (error) {
      console.error('토큰 삭제 실패:', error);
      return false;
    }
  }

  // FCM 토큰 저장
  static async saveFcmToken(fcmToken: string, deviceInfo?: any): Promise<boolean> {
    try {
      const fcmData = { fcmToken, deviceInfo, savedAt: new Date().toISOString() };
      
      await Keychain.setInternetCredentials(
        this.FCM_SERVICE_NAME,
        'fcm_token',
        JSON.stringify(fcmData)
      );
      
      console.log('FCM 토큰 저장 성공');
      return true;
    } catch (error) {
      console.error('FCM 토큰 저장 실패:', error);
      return false;
    }
  }

  // FCM 토큰 불러오기
  static async getFcmToken(): Promise<{fcmToken: string, deviceInfo?: any} | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(this.FCM_SERVICE_NAME);
      
      if (credentials && credentials.password) {
        const fcmData = JSON.parse(credentials.password);
        console.log('FCM 토큰 불러오기 성공');
        return { fcmToken: fcmData.fcmToken, deviceInfo: fcmData.deviceInfo };
      }
      
      return null;
    } catch (error) {
      console.error('FCM 토큰 불러오기 실패:', error);
      return null;
    }
  }

  // FCM 토큰 삭제
  static async clearFcmToken(): Promise<boolean> {
    try {
      await Keychain.resetInternetCredentials(this.FCM_SERVICE_NAME);
      console.log('FCM 토큰 삭제 성공');
      return true;
    } catch (error) {
      console.error('FCM 토큰 삭제 실패:', error);
      return false;
    }
  }

  // 토큰 유효성 검사 (간단한 만료 시간 체크)
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }
}
```

### 2. FCM 관리자

```typescript
// src/utils/FCMManager.ts
import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, Linking } from 'react-native';
import { TokenManager } from './TokenManager';

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'android' | 'ios';
  deviceInfo: string;
  appVersion: string;
}

export class FCMManager {
  private static instance: FCMManager;
  private fcmToken: string | null = null;
  private deviceInfo: DeviceInfo | null = null;

  private constructor() {}

  public static getInstance(): FCMManager {
    if (!FCMManager.instance) {
      FCMManager.instance = new FCMManager();
    }
    return FCMManager.instance;
  }

  // FCM 초기화
  async initialize(): Promise<string | null> {
    try {
      // 권한 요청
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('FCM 권한이 거부되었습니다.');
        return null;
      }

      // FCM 토큰 가져오기
      const token = await messaging().getToken();
      this.fcmToken = token;

      // 디바이스 정보 설정
      this.deviceInfo = await this.getDeviceInfo();

      // 토큰 새로고침 리스너 등록
      messaging().onTokenRefresh(this.handleTokenRefresh.bind(this));

      // 메시지 리스너 등록
      this.setupMessageHandlers();

      console.log('FCM 초기화 완료, 토큰:', token);
      return token;
    } catch (error) {
      console.error('FCM 초기화 실패:', error);
      return null;
    }
  }

  // 디바이스 정보 수집
  async getDeviceInfo(): Promise<DeviceInfo> {
    const { DeviceInfo } = require('react-native');
    
    const deviceId = await DeviceInfo.getUniqueId();
    const deviceType = Platform.OS as 'android' | 'ios';
    const systemName = DeviceInfo.getSystemName();
    const systemVersion = DeviceInfo.getSystemVersion();
    const model = DeviceInfo.getModel();
    const appVersion = DeviceInfo.getVersion();

    return {
      deviceId,
      deviceType,
      deviceInfo: `${systemName} ${systemVersion} (${model})`,
      appVersion,
    };
  }

  // 토큰 새로고침 처리
  async handleTokenRefresh(token: string) {
    console.log('FCM 토큰 새로고침:', token);
    this.fcmToken = token;
    
    // 새 토큰을 로컬에 저장
    await TokenManager.saveFcmToken(token, this.deviceInfo);
    
    // 웹으로 새 토큰 전송 (WebView가 있는 경우)
    // 이는 WebViewManager에서 처리됩니다
  }

  // 메시지 핸들러 설정
  setupMessageHandlers() {
    // 포그라운드 메시지 처리
    messaging().onMessage(async remoteMessage => {
      console.log('포그라운드 메시지 수신:', remoteMessage);
      
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || '알림',
          remoteMessage.notification.body || '',
          [{ text: '확인', style: 'default' }]
        );
      }
    });

    // 백그라운드/종료 상태에서 메시지로 앱 열기
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('백그라운드에서 알림으로 앱 열기:', remoteMessage);
      this.handleNotificationAction(remoteMessage);
    });

    // 앱이 종료된 상태에서 알림으로 앱 열기
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('종료 상태에서 알림으로 앱 열기:', remoteMessage);
          this.handleNotificationAction(remoteMessage);
        }
      });
  }

  // 알림 클릭 액션 처리
  handleNotificationAction(remoteMessage: any) {
    // 딥링크 처리 등
    if (remoteMessage.data?.url) {
      // WebView에서 특정 URL로 이동
      // 이는 WebViewManager에서 처리할 수 있습니다
    }
  }

  // 현재 FCM 토큰 반환
  getFcmToken(): string | null {
    return this.fcmToken;
  }

  // 디바이스 정보 반환
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  // FCM 토큰 삭제
  async clearToken(): Promise<void> {
    try {
      await messaging().deleteToken();
      this.fcmToken = null;
      await TokenManager.clearFcmToken();
      console.log('FCM 토큰 삭제 완료');
    } catch (error) {
      console.error('FCM 토큰 삭제 실패:', error);
    }
  }
}
```

### 3. WebView 통신 매니저 (FCM 지원 추가)

```typescript
// src/utils/WebViewManager.ts
import { TokenManager } from './TokenManager';
import { FCMManager } from './FCMManager';

export interface WebViewMessage {
  type: 'SAVE_TOKENS' | 'CLEAR_TOKENS' | 'REQUEST_TOKENS' | 'TOKEN_RESPONSE' |
        'SAVE_FCM_TOKEN' | 'CLEAR_FCM_TOKEN' | 'REQUEST_FCM_TOKEN' | 'FCM_TOKEN_RESPONSE';
  accessToken?: string;
  refreshToken?: string;
  fcmToken?: string;
  deviceInfo?: any;
  data?: any;
}

export class WebViewManager {
  private webViewRef: any = null;
  private fcmManager: FCMManager;

  constructor(webViewRef: any) {
    this.webViewRef = webViewRef;
    this.fcmManager = FCMManager.getInstance();
  }

  // 웹에서 메시지 수신 처리
  async handleWebMessage(message: WebViewMessage) {
    console.log('웹에서 메시지 수신:', message);

    switch (message.type) {
      case 'SAVE_TOKENS':
        if (message.accessToken) {
          await TokenManager.saveTokens(message.accessToken, message.refreshToken);
        }
        break;

      case 'CLEAR_TOKENS':
        await TokenManager.clearTokens();
        break;

      case 'REQUEST_TOKENS':
        await this.sendStoredTokensToWeb();
        break;

      case 'SAVE_FCM_TOKEN':
        if (message.fcmToken) {
          await TokenManager.saveFcmToken(message.fcmToken, message.deviceInfo);
        }
        break;

      case 'CLEAR_FCM_TOKEN':
        await TokenManager.clearFcmToken();
        break;

      case 'REQUEST_FCM_TOKEN':
        await this.sendStoredFcmTokenToWeb();
        break;
    }
  }

  // 저장된 토큰을 웹으로 전송
  async sendStoredTokensToWeb() {
    try {
      const tokens = await TokenManager.getTokens();
      
      if (tokens) {
        // AccessToken 만료 확인
        const isExpired = TokenManager.isTokenExpired(tokens.accessToken);
        
        if (!isExpired) {
          this.sendMessageToWeb({
            type: 'TOKEN_RESPONSE',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
          });
        } else {
          console.log('저장된 토큰이 만료됨');
          await TokenManager.clearTokens();
          this.sendMessageToWeb({
            type: 'TOKEN_RESPONSE'
          });
        }
      } else {
        this.sendMessageToWeb({
          type: 'TOKEN_RESPONSE'
        });
      }
    } catch (error) {
      console.error('토큰 전송 실패:', error);
    }
  }

  // 저장된 FCM 토큰을 웹으로 전송
  async sendStoredFcmTokenToWeb() {
    try {
      const fcmData = await TokenManager.getFcmToken();
      
      if (fcmData) {
        this.sendMessageToWeb({
          type: 'FCM_TOKEN_RESPONSE',
          fcmToken: fcmData.fcmToken,
          deviceInfo: fcmData.deviceInfo
        });
      } else {
        // 저장된 FCM 토큰이 없으면 새로 생성
        const newFcmToken = await this.fcmManager.initialize();
        if (newFcmToken) {
          const deviceInfo = this.fcmManager.getDeviceInfo();
          await TokenManager.saveFcmToken(newFcmToken, deviceInfo);
          
          this.sendMessageToWeb({
            type: 'FCM_TOKEN_RESPONSE',
            fcmToken: newFcmToken,
            deviceInfo
          });
        } else {
          this.sendMessageToWeb({
            type: 'FCM_TOKEN_RESPONSE'
          });
        }
      }
    } catch (error) {
      console.error('FCM 토큰 전송 실패:', error);
    }
  }

  // 웹으로 메시지 전송
  sendMessageToWeb(message: WebViewMessage) {
    if (this.webViewRef) {
      const script = `
        if (window.handleNativeMessage) {
          window.handleNativeMessage('${JSON.stringify(message)}');
        }
        true;
      `;
      this.webViewRef.injectJavaScript(script);
    }
  }

  // 초기 토큰 주입 (페이지 로드 완료 후)
  async injectInitialTokens() {
    // 약간의 딜레이 후 토큰들 전송
    setTimeout(async () => {
      await this.sendStoredTokensToWeb();
      await this.sendStoredFcmTokenToWeb();
    }, 500);
  }
}
```

### 4. 메인 WebView 컴포넌트 (FCM 통합)

```typescript
// src/components/AppWebView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Alert, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { WebViewManager, WebViewMessage } from '../utils/WebViewManager';
import { FCMManager } from '../utils/FCMManager';

const WEB_URL = 'https://your-domain.com'; // 실제 도메인으로 변경

const AppWebView: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [webViewManager, setWebViewManager] = useState<WebViewManager | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // FCM 초기화
    const initFCM = async () => {
      const fcmManager = FCMManager.getInstance();
      await fcmManager.initialize();
    };

    // WebViewManager 초기화
    const manager = new WebViewManager(webViewRef.current);
    setWebViewManager(manager);

    // FCM 초기화
    initFCM();

    // Android 뒤로 가기 버튼 처리
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // 웹에서 메시지 수신
  const handleMessage = async (event: any) => {
    try {
      const message: WebViewMessage = JSON.parse(event.nativeEvent.data);
      
      if (webViewManager) {
        await webViewManager.handleWebMessage(message);
      }
    } catch (error) {
      console.error('메시지 파싱 실패:', error);
    }
  };

  // 페이지 로드 완료
  const handleLoadEnd = async () => {
    console.log('페이지 로드 완료');
    
    if (webViewManager) {
      await webViewManager.injectInitialTokens();
    }
  };

  // 네비게이션 상태 변경
  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  // 에러 처리
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView 에러:', nativeEvent);
    
    Alert.alert(
      '연결 오류',
      '네트워크 연결을 확인해주세요.',
      [
        {
          text: '재시도',
          onPress: () => webViewRef.current?.reload(),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_URL }}
        style={styles.webview}
        
        // 기본 설정
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        
        // 쿠키 및 캐시 설정
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        incognito={false}
        
        // 미디어 설정
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        
        // 성능 최적화
        renderToHardwareTextureAndroid={true}
        removeClippedSubviews={true}
        
        // User Agent 설정 (WebView 감지용)
        userAgent="YourApp/1.0 ReactNativeWebView Mobile"
        
        // 이벤트 핸들러
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleError}
        
        // iOS 설정
        bounces={false}
        scrollEnabled={true}
        
        // Android 설정
        mixedContentMode="compatibility"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default AppWebView;
```

### 5. 설정 파일들

#### iOS 권한 설정 (ios/YourApp/Info.plist)

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>your-domain.com</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.0</string>
    </dict>
  </dict>
</dict>

<!-- 카메라 권한 (파일 업로드용) -->
<key>NSCameraUsageDescription</key>
<string>프로필 사진 업로드를 위해 카메라 접근이 필요합니다.</string>

<!-- 갤러리 권한 -->
<key>NSPhotoLibraryUsageDescription</key>
<string>이미지 업로드를 위해 사진 라이브러리 접근이 필요합니다.</string>

<!-- 푸시 알림 권한 -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

#### Android 권한 설정 (android/app/src/main/AndroidManifest.xml)

```xml
<!-- 기본 권한 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />

<!-- FCM 관련 권한 -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />

<application
  android:hardwareAccelerated="true"
  android:usesCleartextTraffic="true">
  
  <!-- 메인 액티비티 -->
  <activity
    android:name=".MainActivity"
    android:windowSoftInputMode="adjustResize"
    android:launchMode="singleTop">
    
    <!-- FCM 알림 인텐트 필터 -->
    <intent-filter>
      <action android:name="FLUTTER_NOTIFICATION_CLICK" />
      <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
  </activity>

  <!-- FCM 서비스 -->
  <service
    android:name="io.invertase.firebase.messaging.RNFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
      <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
  </service>
</application>
```

## 📋 완전한 테스트 체크리스트

### 기본 기능
- [ ] 웹 페이지 로딩
- [ ] 웹과 네이티브 간 메시지 통신
- [ ] 토큰 저장/불러오기
- [ ] 자동 로그인

### 인증 기능
- [ ] 로그인 시 토큰 저장
- [ ] 로그아웃 시 토큰 삭제
- [ ] 앱 재시작 시 자동 로그인
- [ ] 토큰 만료 시 처리

### FCM 푸시 알림
- [ ] FCM 토큰 생성 및 저장
- [ ] 웹으로 FCM 토큰 전송
- [ ] 서버에서 FCM 토큰 수신 및 저장
- [ ] 포그라운드 알림 표시
- [ ] 백그라운드 알림 처리
- [ ] 알림 클릭 시 앱 열기
- [ ] 딥링크 처리
- [ ] FCM 토큰 갱신 처리

### 에러 처리
- [ ] 네트워크 오류 처리
- [ ] 토큰 저장 실패 처리
- [ ] WebView 로딩 실패 처리
- [ ] FCM 권한 거부 처리
- [ ] FCM 토큰 생성 실패 처리

## 🚀 배포 시 주의사항

1. **도메인 설정**: `WEB_URL`을 실제 운영 도메인으로 변경
2. **User-Agent**: 웹에서 WebView 감지를 위한 고유한 User-Agent 설정
3. **보안**: Production 환경에서는 HTTPS 사용 필수
4. **FCM 설정**: Firebase 프로젝트 설정 및 구성 파일 추가
5. **권한**: 필요한 최소한의 권한만 요청
6. **성능**: 이미지 최적화 및 캐시 설정

## 💡 추가 기능 아이디어

- 푸시 알림 통계 및 분석
- 타겟팅된 푸시 알림
- 리치 미디어 알림
- 생체 인증 추가
- 오프라인 모드 지원
- 딥링크 라우팅

이 가이드를 따라하면 웹 앱을 React Native로 감싸서 네이티브 자동로그인과 FCM 푸시 알림 기능을 가진 완전한 하이브리드 앱을 만들 수 있습니다! 🎉 