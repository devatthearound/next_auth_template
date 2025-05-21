// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';
import { validateCsrfToken } from './utils/csrf-utils';
import { rateLimit } from './middleware/rate-limit';

// Middleware設定 - 모든 요청에 적용
export async function middleware(request: NextRequest) {
  // API 경로만 처리
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 1. Rate Limiting 검사
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // 2. CSRF 토큰 경로는 추가 검증하지 않음
  if (request.nextUrl.pathname === '/api/auth/csrf-token') {
    return NextResponse.next();
  }

  // 3. POST, PUT, DELETE, PATCH 요청에 대해 CSRF 토큰 검증
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method) && !isCsrfExempt(request.nextUrl.pathname)) {
    const isValidCsrfToken = await validateCsrfToken(request);
    
    if (!isValidCsrfToken) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid CSRF token' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // 4. 인증이 필요하지 않은 경로는 건너뛰기
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 5. JWT 토큰 확인
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  const token = authHeader.split(' ')[1];
  const payload = await verifyToken(token);

  if (!payload) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  // 6. 역할 기반 접근 제어
  // 사장님 전용 경로 확인
  if (isOwnerPath(request.nextUrl.pathname) && payload.userType !== 'OWNER') {
    return new NextResponse(
      JSON.stringify({ error: 'Owner access required' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  // 고객 전용 경로 확인
  if (isCustomerPath(request.nextUrl.pathname) && payload.userType !== 'CUSTOMER') {
    return new NextResponse(
      JSON.stringify({ error: 'Customer access required' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  // 요청 계속 진행
  return NextResponse.next();
}

// 특정 경로에만 미들웨어 적용
export const config = {
  matcher: '/api/:path*',
};

// CSRF 검증이 면제되는 경로 (로그인, 회원가입 등)
function isCsrfExempt(path: string): boolean {
  const exemptPaths = [
    '/api/auth/login',
    '/api/auth/register'
  ];
  
  return exemptPaths.some(exemptPath => 
    path === exemptPath || path.startsWith(`${exemptPath}/`)
  );
}

// 인증이 필요하지 않은 공개 경로
function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/csrf-token', // CSRF 토큰 발급 API 추가
    '/api/auth/refresh-token',
    '/api/auth/reset-password',
    '/api/public'
  ];
  
  return publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
}

// 사장님 전용 경로
function isOwnerPath(path: string): boolean {
  return path.startsWith('/api/owners');
}

// 고객 전용 경로
function isCustomerPath(path: string): boolean {
  return path.startsWith('/api/customers');
}