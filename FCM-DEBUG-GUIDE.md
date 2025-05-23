# 🔍 FCM 토큰 디버깅 가이드

## 문제 진단 체크리스트

### 1. 브라우저 개발자 도구 확인

웹 브라우저에서 F12를 눌러 개발자 도구를 열고 Console 탭을 확인하세요.

#### ✅ 정상 동작 시 보이는 로그들:

```
🌐 WebView 메시지 핸들러 등록 완료. handleNativeMessage: function
🚀 useWebViewAuth 초기화 시작... {isWebView: true, hasCallbacks: {onTokensReceived: true, onFcmTokenReceived: true}}
🔔 WebView 메시지 리스너 등록됨. 총 1 개
⏰ 토큰 요청 스케줄링...
🏃 인증 토큰 요청 실행
🔍 저장된 인증 토큰 요청 중...
📤 WebView로 메시지 전송: REQUEST_TOKENS
🏃 FCM 토큰 요청 실행
🔍 저장된 FCM 토큰 요청 중... {hasCallback: true}
📤 WebView로 메시지 전송: REQUEST_FCM_TOKEN
📥 Native 메시지 원본 수신: {"type":"FCM_TOKEN_RESPONSE","fcmToken":"...","deviceInfo":{...}}
📋 파싱된 메시지: {type: "FCM_TOKEN_RESPONSE", fcmToken: "...", deviceInfo: {...}}
🎯 FCM 토큰 응답 수신: {type: "FCM_TOKEN_RESPONSE", fcmToken: "...", deviceInfo: {...}}
🔔 FCM_TOKEN_RESPONSE 처리 중... {fcmToken: "...", deviceInfo: {...}, hasCallback: true}
✅ FCM 토큰 콜백 실행 중...
🔔 AuthContext: WebView에서 FCM 토큰 수신: {fcmToken: "...", deviceInfo: {...}, hasUser: true, hasAccessToken: true}
✅ 사용자 로그인 상태 확인됨, FCM 토큰 서버 저장 시작...
🚀 FCM 토큰 서버 저장 시작... {fcmToken: "...", deviceInfo: {...}, hasUser: true, hasAccessToken: true, userId: "..."}
📤 API 호출 중: /user/fcm-token
✅ FCM 토큰 서버 저장 성공: {...}
```

### 2. React Native Metro 로그 확인

React Native 개발 서버에서 다음과 같은 로그가 보여야 합니다:

```
🚀 AppWebView 초기화 시작...
🔔 FCM 초기화 시작...
✅ FCM 초기화 완료
📱 FCM 토큰: fcm_token_here...
🌐 WebView 준비 완료
🚀 초기 데이터 주입 시작...
📥 웹에서 메시지 수신: REQUEST_FCM_TOKEN
✅ 저장된 FCM 토큰 전송 완료
📤 웹으로 메시지 전송: FCM_TOKEN_RESPONSE
```

## 🚨 문제별 해결 방법

### 문제 1: 웹에서 FCM 토큰 메시지를 받지 못함

#### 증상:
- React Native에서는 `📤 웹으로 메시지 전송: FCM_TOKEN_RESPONSE` 로그가 보임
- 웹에서는 `📥 Native 메시지 원본 수신` 로그가 보이지 않음

#### 해결 방법:

1. **handleNativeMessage 함수 확인**
```javascript
// 브라우저 콘솔에서 실행
console.log('handleNativeMessage:', typeof window.handleNativeMessage);
// 결과: "function"이어야 함
```

2. **수동으로 FCM 토큰 요청**
```javascript
// 브라우저 콘솔에서 실행
window.ReactNativeWebView.postMessage(JSON.stringify({type: 'REQUEST_FCM_TOKEN'}));
```

### 문제 2: FCM 토큰은 받지만 서버 저장 실패

#### 증상:
- `🔔 AuthContext: WebView에서 FCM 토큰 수신` 로그는 보임
- `❌ 사용자 미로그인 상태, FCM 토큰 저장 대기 중` 메시지가 나옴

#### 해결 방법:

1. **로그인 상태 확인**
```javascript
// 브라우저 콘솔에서 실행
console.log('User:', !!window.authContext?.user);
console.log('Access Token:', !!window.authContext?.accessToken);
```

2. **자동 로그인 후 FCM 토큰 다시 요청**
로그인이 완료된 후 FCM 토큰 처리가 실행되도록 순서를 조정해야 할 수 있습니다.

### 문제 3: React Native에서 FCM 토큰 생성 실패

#### 증상:
- `❌ FCM 초기화 실패 (권한 없음)` 메시지
- `❌ FCM 토큰 생성 실패` 메시지

#### 해결 방법:

1. **Firebase 설정 확인**
- `google-services.json` (Android) 파일이 올바른 위치에 있는지 확인
- `GoogleService-Info.plist` (iOS) 파일이 Xcode 프로젝트에 추가되었는지 확인

2. **권한 설정 확인**
```javascript
// React Native 앱에서 권한 상태 확인
import messaging from '@react-native-firebase/messaging';

const checkPermission = async () => {
  const authStatus = await messaging().requestPermission();
  console.log('Permission status:', authStatus);
};
```

### 문제 4: 서버 API 호출 실패

#### 증상:
- `❌ FCM 토큰 서버 저장 실패` 메시지
- 네트워크 오류 또는 401/403 에러

#### 해결 방법:

1. **네트워크 연결 확인**
2. **인증 토큰 유효성 확인**
3. **서버 API 엔드포인트 확인**

## 🛠️ 수동 테스트 방법

### 1. 웹에서 직접 FCM 토큰 요청

```javascript
// 브라우저 콘솔에서 실행
window.ReactNativeWebView.postMessage(JSON.stringify({
  type: 'REQUEST_FCM_TOKEN'
}));
```

### 2. Mock FCM 토큰 주입

```javascript
// 브라우저 콘솔에서 실행
window.handleNativeMessage(JSON.stringify({
  type: 'FCM_TOKEN_RESPONSE',
  fcmToken: 'mock_fcm_token_for_testing',
  deviceInfo: {
    deviceId: 'test_device_id',
    deviceType: 'android',
    deviceInfo: 'Test Device Android 12',
    appVersion: '1.0.0'
  }
}));
```

### 3. 서버에 직접 FCM 토큰 저장

```javascript
// 브라우저 콘솔에서 실행
fetch('/api/user/fcm-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  body: JSON.stringify({
    fcmToken: 'test_fcm_token',
    deviceType: 'web',
    deviceInfo: 'Test Browser'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 📊 현재 상태 확인 스크립트

브라우저 콘솔에서 다음 스크립트를 실행하여 현재 상태를 확인하세요:

```javascript
console.log('=== FCM 토큰 상태 확인 ===');
console.log('WebView 환경:', typeof window.ReactNativeWebView !== 'undefined');
console.log('handleNativeMessage:', typeof window.handleNativeMessage);
console.log('로그인 상태:', !!localStorage.getItem('accessToken'));
console.log('사용자 정보:', !!window.authContext?.user);
console.log('==========================');
```

이 가이드를 따라 단계적으로 확인하시면 FCM 토큰이 제대로 전달되지 않는 문제를 해결할 수 있습니다! 🚀 