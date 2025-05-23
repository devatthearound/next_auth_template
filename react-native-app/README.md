# YourApp React Native

Next.js 웹 앱을 React Native WebView로 감싸서 자동로그인과 FCM 푸시 알림 기능을 제공하는 하이브리드 앱입니다.

## 🚀 주요 기능

- **WebView 통합**: Next.js 웹 앱을 네이티브 앱으로 감싸기
- **자동 로그인**: Keychain을 활용한 안전한 토큰 저장 및 자동 로그인
- **FCM 푸시 알림**: Firebase를 통한 실시간 푸시 알림
- **웹-네이티브 통신**: 양방향 메시지 통신 시스템
- **딥링크 지원**: URL 기반 네비게이션

## 📋 필요 조건

- Node.js >= 16
- React Native CLI
- Android Studio (Android 개발용)
- Xcode (iOS 개발용)
- Firebase 프로젝트 설정

## 🛠️ 설치 및 설정

### 1. 패키지 설치

```bash
npm install

# iOS 추가 설정
cd ios && pod install && cd ..
```

### 2. Firebase 설정

#### Android
1. Firebase Console에서 `google-services.json` 다운로드
2. `android/app/` 폴더에 복사

#### iOS
1. Firebase Console에서 `GoogleService-Info.plist` 다운로드
2. Xcode에서 프로젝트에 추가

### 3. 환경 설정

#### URL 설정
- `src/components/AppWebView.tsx`에서 `WEB_URL` 수정
- `android/app/src/main/AndroidManifest.xml`에서 도메인 설정
- `ios/YourApp/Info.plist`에서 도메인 설정

#### 앱 이름 변경
- `package.json`의 `name` 필드 수정
- Android: `android/app/src/main/res/values/strings.xml`
- iOS: Xcode 프로젝트 설정

## 🔧 개발

### 디버그 모드 실행

```bash
# Metro 서버 시작
npm start

# Android 실행
npm run android

# iOS 실행
npm run ios
```

### 빌드

```bash
# Android 릴리즈 빌드
npm run build:android

# iOS 릴리즈 빌드
npm run build:ios
```

## 📱 프로젝트 구조

```
src/
├── components/
│   ├── AppWebView.tsx      # 메인 WebView 컴포넌트
│   └── SplashScreen.tsx    # 스플래시 화면
├── utils/
│   ├── TokenManager.ts     # 토큰 안전 저장 관리
│   ├── FCMManager.ts       # FCM 푸시 알림 관리
│   └── WebViewManager.ts   # 웹-네이티브 통신 관리
android/                    # Android 네이티브 코드
ios/                       # iOS 네이티브 코드
```

## 🔐 보안 기능

### Keychain 토큰 저장
- iOS: Keychain Services 사용
- Android: EncryptedSharedPreferences 사용
- JWT 토큰 만료 자동 확인

### 네트워크 보안
- HTTPS 강제 사용 (개발 환경 제외)
- Certificate Pinning 지원 가능
- WebView 보안 설정 적용

## 📬 FCM 푸시 알림

### 지원 기능
- 포그라운드/백그라운드 알림 처리
- 알림 클릭 시 딥링크 이동
- 토큰 자동 갱신 및 동기화
- 디바이스별 토큰 관리

### 알림 테스트
Firebase Console에서 테스트 메시지 전송 가능

## 🔗 웹-네이티브 통신

### 지원 메시지 타입
- `SAVE_TOKENS`: 토큰 저장
- `CLEAR_TOKENS`: 토큰 삭제
- `REQUEST_TOKENS`: 저장된 토큰 요청
- `SAVE_FCM_TOKEN`: FCM 토큰 저장
- `CLEAR_FCM_TOKEN`: FCM 토큰 삭제
- `REQUEST_FCM_TOKEN`: FCM 토큰 요청

### 메시지 포맷
```javascript
window.ReactNativeWebView.postMessage(JSON.stringify({
  type: 'SAVE_TOKENS',
  accessToken: 'token...',
  refreshToken: 'refresh...'
}));
```

## 🚀 배포

### Android (Google Play Store)
1. `android/app/build.gradle`에서 버전 코드 증가
2. 서명 키 설정
3. `npm run build:android`
4. AAB 파일 업로드

### iOS (App Store)
1. Xcode에서 버전 증가
2. Archive 생성
3. App Store Connect 업로드

## 🐛 문제 해결

### 일반적인 이슈

#### Android 빌드 오류
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

#### iOS 빌드 오류
```bash
cd ios && pod install && cd ..
npm run ios
```

#### Metro 캐시 문제
```bash
npm start -- --reset-cache
```

#### Keychain 접근 오류
- iOS: 시뮬레이터에서 "Hardware > Erase All Content and Settings"
- Android: 앱 데이터 초기화

### FCM 관련 이슈

#### 토큰이 생성되지 않음
1. Firebase 설정 파일 확인
2. 권한 설정 확인
3. 네트워크 연결 확인

#### 알림이 오지 않음
1. FCM 토큰이 서버에 등록되었는지 확인
2. 알림 권한이 허용되었는지 확인
3. 앱이 백그라운드/포그라운드 상태 확인

## 📝 라이센스

MIT License

## 🤝 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

문제가 있으시면 이슈를 등록해 주세요. 