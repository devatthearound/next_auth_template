카카오톡 알림톡 서비스를 Next.js 프로젝트에 성공적으로 추가했습니다! 🎉

## 📋 구현된 주요 기능

### 1. **핵심 서비스**
- `KakaoTalkService`: 네이버 클라우드 플랫폼 SENS API를 사용한 카카오톡 알림톡 전송
- 서명 생성, 템플릿 변수 치환, 메시지 전송 기능

### 2. **템플릿 시스템**
- 미리 정의된 메시지 템플릿 (환영, 인증, 주문확인, 프로모션 등)
- 동적 변수 치환 기능
- 버튼 링크 지원

### 3. **API 통합**
- `/api/kakao-talk/send` 엔드포인트
- 인증된 사용자만 사용 가능
- 활동 로깅 및 CSRF 보호



## 🚀 설정 방법

### 1. **환경 변수 설정**
`.env.local` 파일에 다음 추가:
```bash
KAKAO_ACCESS_KEY=네이버클라우드플랫폼_액세스키
KAKAO_SECRET_KEY=네이버클라우드플랫폼_시크릿키
KAKAO_SERVICE_ID=SENS_서비스_ID
KAKAO_PLUS_FRIEND_ID=카카오톡_플러스친구_ID
```

### 2. **네이버 클라우드 플랫폼 설정**
1. NCP 콘솔에서 SENS 서비스 활성화
2. 카카오톡 알림톡 서비스 등록
3. 플러스친구 연결
4. 메시지 템플릿 등록

### 3. **활동 타입 초기화**
```bash
# 개발 서버 실행 후
curl http://localhost:3000/api/init
```

## 💡 사용 예시


### 서버 사이드에서 사용:
```typescript
import { getKakaoTalkService } from '@/lib/kakao-talk/kakao-talk.service';

const kakaoTalkService = getKakaoTalkService();
await kakaoTalkService.sendWelcome(phoneNumber, userName, couponLink, serviceLink);
```

## 🔧 주요 특징

- **Edge Runtime 호환**: `fetch` API 사용으로 서버리스 환경에서도 작동
- **타입 안전성**: TypeScript로 완전 구현
- **보안**: CSRF 토큰 및 JWT 인증 적용
- **로깅**: 모든 메시지 전송이 활동 로그에 기록
- **오류 처리**: 상세한 오류 메시지 및 복구 로직
- **테스트 가능**: 전용 테스트 페이지 제공

