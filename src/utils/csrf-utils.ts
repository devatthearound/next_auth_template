import { randomBytes, createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// CSRF 토큰 생성
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

// CSRF 토큰 해싱 (클라이언트에 전송할 때)
export function hashCsrfToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// CSRF 토큰 쿠키 설정
export function setCsrfTokenCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: 'XSRF-TOKEN',
    value: hashCsrfToken(token),
    httpOnly: false, // JavaScript에서 읽을 수 있도록 함
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24시간
  });
  
  // 서버에서 검증에 사용할 원본 토큰은 HTTP-only 쿠키로 저장
  response.cookies.set({
    name: 'CSRF-TOKEN',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24시간
  });
  
  return response;
}

// CSRF 토큰 검증
export function validateCsrfToken(request: NextRequest): boolean {
  // 요청 헤더에서 해시된 CSRF 토큰 가져오기
  const headerToken = request.headers.get('X-XSRF-TOKEN');
  
  if (!headerToken) {
    return false;
  }
  
  // 쿠키에서 원본 CSRF 토큰 가져오기
  const cookieToken = request.cookies.get('CSRF-TOKEN')?.value;
  
  if (!cookieToken) {
    return false;
  }
  
  // 원본 토큰 해싱하여 헤더 토큰과 비교
  const hashedCookieToken = hashCsrfToken(cookieToken);
  
  return hashedCookieToken === headerToken;
}