# JWT 기반 Next.js 인증 시스템

## 1. 프로젝트 개요

이 프로젝트는 Next.js 애플리케이션에서 JWT(JSON Web Token)를 활용한 인증 시스템을 구현합니다. 사용자는 이메일 또는 전화번호로 회원가입 및 로그인할 수 있으며, 권한 기반 접근 제어(RBAC)를 통해 사용자 유형(고객/사장님)별로 접근 가능한 리소스를 제한합니다. 또한 사용자 활동 이력을 추적하여 보안 및 분석 목적으로 활용합니다.

### 핵심 기능

- 회원가입 및 로그인 (이메일/전화번호 기반)
- JWT 토큰 기반 인증 (액세스 토큰 및 리프레시 토큰)
- 권한 기반 접근 제어 (고객/사장님)
- 사용자 활동 이력 추적
- 계정 비활성화(탈퇴) 처리
- 보안 강화 기능
  - 안전한 JWT 시크릿 관리
  - 강력한 비밀번호 정책 적용
  - CSRF 공격 방지
  - API Rate Limiting

### 기술 스택

- **프론트엔드**: Next.js, React, TailwindCSS
- **백엔드**: Next.js API Routes
- **데이터베이스**: PostgreSQL (via Prisma ORM)
- **인증**: JWT (jose 라이브러리)
- **유효성 검증**: Zod
- **암호화**: bcryptjs

## 2. 아키텍처 개요

### 데이터 모델

```
┌─────────────┐      ┌────────────┐      ┌────────────┐ 
│    User     │      │  Customer  │      │   Owner    │ 
├─────────────┤      ├────────────┤      ├────────────┤ 
│ id          │      │ id         │      │ id         │ 
│ email       │──1:1─┤ userId     │  1:1─┤ userId     │ 
│ phoneNumber │      │ address    │      │ businessName│ 
│ password    │      │ preferences│      │ businessInfo│ 
│ userType    │      └────────────┘      └────────────┘ 
│ isActive    │            │                    │       
└─────────────┘            │                    │       
       │                   │                    │       
       │                   │                    │       
       │                   ▼                    ▼       
       │           ┌──────────────────────────────────┐
       └───1:N────▶│           Activity               │
                   ├──────────────────────────────────┤
                   │ id, userId, activityTypeId       │
                   │ timestamp, metadata, status      │
                   └──────────────────────────────────┘
                                    │                  
                                    │                  
                                    ▼                  
                   ┌──────────────────────────────────┐
                   │         ActivityType             │
                   ├──────────────────────────────────┤
                   │ id, code, name, category         │
                   │ description, importance          │
                   └──────────────────────────────────┘
```

### 인증 및 보안 플로우

1. **회원가입**:
   - 사용자가 이메일/전화번호, 비밀번호, 사용자 유형(고객/사장님) 제출
   - 비밀번호 정책 검증 (대소문자, 숫자, 특수문자 조합 요구)
   - 서버에서 비밀번호 해싱 후 DB에 저장
   - 사용자 유형에 따라 추가 정보 저장 (Customer/Owner 테이블)
   - CSRF 토큰 발급 및 활동 로깅

2. **로그인**:
   - 사용자가 이메일/전화번호, 비밀번호 제출
   - Rate Limiting 검사 (특정 시간 내 최대 로그인 시도 횟수 제한)
   - 서버에서 인증 정보 검증
   - 성공 시 액세스 토큰(JWT)과 리프레시 토큰 발급
   - 액세스 토큰은 응답 본문에, 리프레시 토큰은 HTTP-only 쿠키로 전송
   - CSRF 토큰 발급 및 활동 로깅

3. **인증된 요청**:
   - 클라이언트에서 요청 헤더에 액세스 토큰 포함 (`Authorization: Bearer {token}`)
   - CSRF 토큰을 헤더에 포함 (`X-CSRF-Token: {token}`)
   - 서버 미들웨어에서 액세스 토큰 및 CSRF 토큰 검증
   - Rate Limiting 검사
   - 검증 성공 시 요청 처리, 실패 시 401/403/429 오류 반환

4. **토큰 갱신**:
   - 액세스 토큰 만료 시 리프레시 토큰으로 새 액세스 토큰 요청
   - CSRF 토큰 검증
   - 서버에서 리프레시 토큰 검증 후 새 액세스 토큰 발급
   - 새 CSRF 토큰 발급

5. **로그아웃**:
   - 클라이언트에서 액세스 토큰 삭제
   - 서버에서 리프레시 토큰 무효화
   - 리프레시 토큰 및 CSRF 토큰 쿠키 삭제
   - 활동 로깅

6. **계정 비활성화**:
   - 사용자 계정을 물리적으로 삭제하지 않고 `isActive=false`로 설정
   - 모든 액세스 토큰 및 리프레시 토큰 무효화
   - 이를 통해 동일 이메일/전화번호로 재가입 가능

## 3. 코드 구조 및 주요 파일

### 디렉토리 구조

```
src/
├── app/
│   ├── api/                # API 라우트
│   │   ├── auth/           # 인증 관련 API (로그인, 회원가입 등)
│   │   │   ├── csrf/       # CSRF 토큰 발급 API
│   │   ├── user/           # 사용자 관련 API (프로필, 활동 이력 등)
│   │   ├── customer/       # 고객 전용 API
│   │   └── owner/          # 사장님 전용 API
│   ├── activity/           # 활동 이력 페이지
│   ├── customer/           # 고객 전용 페이지
│   ├── dashboard/          # 공통 대시보드 페이지
│   ├── login/              # 로그인 페이지
│   ├── owner/              # 사장님 전용 페이지
│   ├── register/           # 회원가입 페이지
│   └── unauthorized/       # 권한 없음 페이지
├── components/
│   ├── auth/               # 인증 관련 컴포넌트
│   └── ui/                 # UI 컴포넌트
├── contexts/
│   └── AuthContext.tsx     # 인증 컨텍스트 (React Context)
├── lib/
│   ├── activity.ts         # 활동 이력 관련 함수
│   ├── auth.ts             # 인증 관련 함수
│   ├── jwt.ts              # JWT 관련 함수
│   ├── csrf.ts             # CSRF 보호 관련 함수
│   ├── rate-limit.ts       # Rate Limiting 관련 함수
│   └── prisma.ts           # Prisma 클라이언트
├── utils/
│   ├── request-utils.ts    # 요청 처리 유틸리티
│   └── password-utils.ts   # 비밀번호 정책 검증 유틸리티
└── middleware.ts           # Next.js 미들웨어 (인증 및 권한 검사)
```

### 주요 파일 설명

#### 1. `src/lib/jwt.ts`

JWT 토큰 생성 및 검증 관련 함수:

- JWT 시크릿 안전한 관리 (필수 환경 변수)
- 액세스 토큰 생성 (짧은 만료 시간)
- 리프레시 토큰 생성 (긴 만료 시간)
- 토큰 검증 함수

※ 중요 변경사항: 이제 JWT 시크릿은 반드시 환경 변수로 설정해야 합니다. 환경 변수가 없으면 에러를 발생시켜 보안을 강화합니다.

#### 2. `src/utils/password-utils.ts`

비밀번호 정책 검증 관련 함수:

- 비밀번호 최소 길이 검증
- 대문자/소문자 포함 검증
- 숫자 포함 검증
- 특수 문자 포함 검증
- 종합적인 비밀번호 강도 평가

#### 3. `src/lib/csrf.ts`

CSRF 보호 관련 함수:

- CSRF 토큰 생성
- 쿠키 설정 (Double Submit Cookie 패턴)
- 토큰 검증

#### 4. `src/lib/rate-limit.ts`

API 요청 제한 관련 함수:

- IP 주소 기반 요청 제한
- 사용자 ID 기반 요청 제한
- 경로별 차등 제한 설정 (로그인 API는 더 엄격하게)
- 제한 초과 시 응답 처리

#### 5. `src/middleware.ts`

API 요청에 대한 보안 검증을 수행하는 미들웨어:

- Rate Limiting 검사
- CSRF 토큰 검증
- JWT 토큰 검증
- 사용자 권한 검사
- 오류 응답 생성

#### 6. `src/contexts/AuthContext.tsx`

클라이언트 측 인증 상태 및 CSRF 관리:

- 사용자 상태 관리
- 토큰 관리
- CSRF 토큰 자동 갱신
- 로그인/로그아웃 기능
- 권한 확인 함수

## 4. 개발 환경 설정

### 필수 설치 항목

1. Node.js (v18 이상)
2. PostgreSQL 데이터베이스 (또는 Docker)
3. npm 또는 yarn

### 프로젝트 시작하기

1. **저장소 클론**:
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **의존성 설치**:
   ```bash
   npm install
   # 또는
   yarn install
   ```

3. **환경 변수 설정**:
   `.env.local` 파일 생성:
   ```
   DATABASE_URL="postgresql://next:next1234@localhost:5434/next?schema=public"
   
   # 보안 시크릿 (강력한 랜덤 문자열 사용 필수)
   JWT_SECRET="your-super-secure-jwt-key"
   CSRF_SECRET="another-secure-random-string"
   
   # 토큰 설정
   JWT_EXPIRE="1h"
   REFRESH_TOKEN_EXPIRE="7d"
   
   # Rate Limiting 설정
   RATE_LIMIT_MAX="100"          # 일반 API 요청 제한 (1분당)
   LOGIN_RATE_LIMIT_MAX="5"      # 로그인 요청 제한 (15분당)
   REGISTER_RATE_LIMIT_MAX="3"   # 회원가입 요청 제한 (1시간당)
   ```

4. **데이터베이스 설정**:
   Docker를 사용하는 경우:
   ```bash
   docker-compose up -d
   ```
   
   또는 직접 PostgreSQL 연결 설정:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/dbname?schema=public"
   ```

5. **데이터베이스 마이그레이션**:
   ```bash
   npx prisma migrate dev
   ```

6. **활동 유형 초기화**:
   개발 서버 실행 후 다음 URL 방문:
   ```
   http://localhost:3000/api/init
   ```

7. **개발 서버 실행**:
   ```bash
   npm run dev
   # 또는
   yarn dev
   ```

## 5. API 엔드포인트

### 인증 API

| 엔드포인트 | 메서드 | 설명 | 인증 필요 | Rate Limit |
|------------|--------|------|-----------|------------|
| `/api/auth/csrf` | GET | CSRF 토큰 발급 | 아니오 | 1분당 20회 |
| `/api/auth/register` | POST | 사용자 회원가입 | 아니오 | 1시간당 3회 |
| `/api/auth/login` | POST | 로그인 및 토큰 발급 | 아니오 | 15분당 5회 |
| `/api/auth/logout` | POST | 로그아웃 및 토큰 무효화 | 예 | 1분당 10회 |
| `/api/auth/refresh-token` | POST | 액세스 토큰 갱신 | 아니오 (리프레시 토큰 필요) | 1분당 10회 |
| `/api/auth/deactivate` | POST | 계정 비활성화 (탈퇴) | 예 | 24시간당 1회 |

### 사용자 API

| 엔드포인트 | 메서드 | 설명 | 인증 필요 | Rate Limit |
|------------|--------|------|-----------|------------|
| `/api/user/profile` | GET | 사용자 프로필 조회 | 예 | 1분당 30회 |
| `/api/user/profile` | PATCH | 사용자 프로필 수정 | 예 | 1분당 10회 |
| `/api/user/activities` | GET | 사용자 활동 이력 조회 | 예 | 1분당 20회 |

### 고객 전용 API

| 엔드포인트 | 메서드 | 설명 | 인증 필요 | Rate Limit |
|------------|--------|------|-----------|------------|
| `/api/customer/update` | PATCH | 고객 정보 업데이트 | 예 (고객만) | 1분당 10회 |

### 사장님 전용 API

| 엔드포인트 | 메서드 | 설명 | 인증 필요 | Rate Limit |
|------------|--------|------|-----------|------------|
| `/api/owner/update` | PATCH | 사업자 정보 업데이트 | 예 (사장님만) | 1분당 10회 |

## 6. 주요 개발 가이드

### 비밀번호 정책 준수

회원가입 및 비밀번호 변경 시 비밀번호 정책을 준수해야 합니다:

- 최소 8자 이상
- 최소 1개 이상의 대문자 포함
- 최소 1개 이상의 소문자 포함
- 최소 1개 이상의 숫자 포함
- 최소 1개 이상의 특수 문자 포함

비밀번호 정책 검증 예시:
```typescript
import { validatePasswordStrength } from '@/utils/password-utils';

// 비밀번호 유효성 검사
const passwordValidation = validatePasswordStrength(password);
if (!passwordValidation.isValid) {
  // 오류 처리
  console.error('비밀번호 정책 위반:', passwordValidation.errors);
  return null;
}
```

### CSRF 보호 사용

상태를 변경하는 API 요청(POST, PUT, DELETE, PATCH)시 CSRF 토큰을 포함해야 합니다:

1. CSRF 토큰 발급:
   ```typescript
   // 클라이언트에서 CSRF 토큰 요청
   const fetchCsrfToken = async () => {
     await fetch('/api/auth/csrf', {
       method: 'GET',
       credentials: 'include',  // 쿠키 포함
     });
   };
   ```

2. CSRF 토큰 사용:
   ```typescript
   // API 요청 시 CSRF 토큰 포함
   const makeApiRequest = async (data) => {
     // 쿠키에서 CSRF 토큰 읽기
     const csrfToken = getCookieValue('XSRF-TOKEN');
     
     const response = await fetch('/api/some-endpoint', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'X-CSRF-Token': csrfToken,
         'Authorization': `Bearer ${accessToken}`,
       },
       credentials: 'include',
       body: JSON.stringify(data),
     });
     
     return response.json();
   };
   ```

### 활동 이력 추가하기

새로운 활동을 추적하려면:

1. 필요한 경우 `ActivityType` 추가:

```typescript
// src/lib/activity.ts의 initializeActivityTypes 함수에 추가
const defaultTypes = [
  // 기존 타입들...
  { code: 'NEW_ACTIVITY_CODE', name: 'New Activity Name', category: 'CATEGORY', importance: 'MEDIUM' },
];
```

2. 활동 기록:

```typescript
import { logUserActivity } from '@/lib/activity';

// 활동 로깅
await logUserActivity(
  userId,
  'NEW_ACTIVITY_CODE',
  { additionalData: 'some-value' }, // 메타데이터
  { ipAddress: '127.0.0.1', userAgent: 'browser-info' } // 컨텍스트
);
```

### 새 API 경로 추가하기

1. 라우트 파일 생성 (`src/app/api/new-path/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/utils/request-utils';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { verifyCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting 검사
    const rateLimitResult = rateLimitMiddleware(request);
    if (rateLimitResult) {
      return rateLimitResult; // 429 응답
    }
    
    // CSRF 토큰 검증 (상태 변경 API)
    if (!verifyCsrfToken(request)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
    
    // 사용자 ID 가져오기
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // 비즈니스 로직 구현
    
    return NextResponse.json({ data: "response-data" });
  } catch (error) {
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}
```

2. 미들웨어 권한 설정 (필요한 경우):

```typescript
// src/middleware.ts 수정
function isOwnerPath(path: string): boolean {
  return path.startsWith('/api/owners') || path.startsWith('/api/new-owner-path');
}
```

### 클라이언트 측 인증 사용하기

컴포넌트에서 인증 상태 접근:

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout, refreshCsrfToken } = useAuth();
  
  // 컴포넌트 마운트 시 CSRF 토큰 새로고침
  useEffect(() => {
    refreshCsrfToken();
  }, []);
  
  if (isLoading) {
    return <p>Loading...</p>;
  }
  
  if (!isAuthenticated) {
    return <p>Please log in to continue.</p>;
  }
  
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // 폼 제출 전 CSRF 토큰 새로고침
    await refreshCsrfToken();
    
    // API 요청 로직...
  };
  
  return (
    <div>
      <h1>Welcome, {user?.name || 'User'}</h1>
      <button onClick={logout}>Logout</button>
      
      <form onSubmit={handleFormSubmit}>
        {/* 폼 내용 */}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
```

### 보호된 페이지 만들기

`ProtectedRoute` 컴포넌트를 사용하여 인증/권한 필요 페이지 만들기:

```tsx
'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function ProtectedPage() {
  return (
    <ProtectedRoute allowedTypes={['CUSTOMER']}>
      {/* 인증된 고객만 볼 수 있는 컨텐츠 */}
      <h1>Customer Only Content</h1>
    </ProtectedRoute>
  );
}
```

## 7. 배포 및 확장

### 개발에서 프로덕션으로

1. 환경 변수 설정:
   - 프로덕션용 `.env.production` 파일 생성
   - 강력한 JWT 시크릿 및 CSRF 시크릿 설정
   - 프로덕션 데이터베이스 URL 설정
   - Rate Limiting 설정 조정

2. 빌드 및 시작:
   ```bash
   npm run build
   npm start
   ```

### 추가 보안 고려사항

1. **HTTPS**: 모든 프로덕션 환경에서 HTTPS 사용
2. **CORS 설정**: 필요한 경우 CORS 헤더 설정
3. **보안 헤더 추가**: 
   - Strict-Transport-Security
   - Content-Security-Policy
   - X-Content-Type-Options
   - X-Frame-Options
4. **환경 변수 관리**: 시크릿 키 안전하게 관리
5. **로깅 및 모니터링**: 로그인 시도, 인증 실패, Rate Limit 초과 등 모니터링

### 확장 가능성

1. **소셜 로그인**: Google, Facebook 등 OAuth 제공자 추가
2. **2단계 인증(2FA)**: 추가 보안 레이어 구현
3. **권한 세분화**: 더 상세한 권한 체계 구현
4. **이메일/SMS 인증**: 연락처 확인 프로세스 추가
5. **비밀번호 재설정**: 비밀번호 분실 시 재설정 기능
6. **분산 Rate Limiting**: Redis 기반 분산 Rate Limiting 구현

## 8. 주의사항 및 알려진 이슈

### JWT 시크릿 관리

JWT 시크릿은 반드시 환경 변수로 설정해야 합니다. 설정하지 않으면 애플리케이션이 시작되지 않습니다. 이는 하드코딩된 폴백 시크릿 사용으로 인한 보안 위험을 방지하기 위함입니다.

### Edge 런타임 호환성

미들웨어는 Edge 런타임에서 실행되므로, Node.js 전용 모듈(예: `crypto`)을 사용할 수 없습니다. JWT 인증을 위해 Edge 호환 라이브러리인 `jose`를 사용합니다.

### Prisma 클라이언트 초기화

Next.js 핫 리로딩으로 인해 dev 환경에서 Prisma 클라이언트 연결이 너무 많이 생성될 수 있습니다. 이를 방지하기 위해 싱글톤 패턴을 사용합니다:

```typescript
const prismaClientSingleton = () => new PrismaClient();
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Rate Limiting 고려사항

현재 구현된 Rate Limiting은 단일 서버 인스턴스에서만 작동합니다. 다중 서버 환경에서는 Redis와 같은 외부 스토리지를 사용한 분산 Rate Limiting을 구현해야 합니다.

### 비동기 함수 처리

jose 라이브러리는 비동기(Promise) API를 사용하므로 `jwt.ts`의 모든 함수는 `async/await`로 처리됩니다. 이 함수들을 사용할 때도 항상 `await` 키워드를 사용해야 합니다.

## 9. 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [jose 라이브러리 문서](https://github.com/panva/jose)
- [Zod 공식 문서](https://zod.dev/)
- [JWT 인증 모범 사례](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)
- [OWASP CSRF 방어 가이드](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP 비밀번호 정책 가이드](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [API Rate Limiting 모범 사례](https://nordicapis.com/everything-you-need-to-know-about-api-rate-limiting/)

## 10. 라이센스 및 기여

이 프로젝트는 [라이센스 정보] 하에 배포됩니다. 기여는 환영하며, [기여 가이드라인]을 따라주세요.

---

이 문서는 JWT 기반 Next.js 인증 시스템의 핵심 아키텍처, 기능 및 사용 방법을 제공합니다. 추가 질문이나 문제가 있으면 이슈를 개설하거나 개발 팀에 문의하세요.