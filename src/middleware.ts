import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

// 미들웨어 설정 - 모든 요청에 적용
export function middleware(request: NextRequest) {
  // API 경로만 처리
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 인증이 필요하지 않은 경로는 건너뛰기
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // 토큰 확인
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }

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

// 인증이 필요하지 않은 공개 경로
function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/refresh-token',
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