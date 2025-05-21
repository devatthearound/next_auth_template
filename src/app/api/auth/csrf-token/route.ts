import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfTokenCookie } from '@/utils/csrf-utils';

// CSRF 토큰 발급 API
export async function GET() {
  try {
    // 새 CSRF 토큰 생성
    const token = generateCsrfToken();
    
    // 응답 객체 생성
    const response = NextResponse.json({ 
      message: "CSRF token generated successfully" 
    }, { status: 200 });
    
    // CSRF 토큰 쿠키 설정
    return setCsrfTokenCookie(response, token);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to generate CSRF token" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to generate CSRF token" 
    }, { status: 500 });
  }
}