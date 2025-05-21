import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/utils/rate-limit';

export function rateLimit(request: NextRequest): NextResponse | null {
  // API 경로만 처리
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return null;
  }
  
  // IP 주소 가져오기
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  // Rate Limit 확인
  const limitInfo = checkRateLimit(ip, request.nextUrl.pathname);
  
  // 제한 초과
  if (!limitInfo) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60' // 1분 후 재시도 권장
        }
      }
    );
  }
  
  // 제한 정보를 헤더에 추가하여 다음 미들웨어로 전달
  const response = NextResponse.next();
  
  response.headers.set('X-RateLimit-Limit', limitInfo.limit.toString());
  response.headers.set('X-RateLimit-Remaining', limitInfo.remaining.toString());
  response.headers.set('X-RateLimit-Reset', limitInfo.reset.toString());
  
  return response;
}