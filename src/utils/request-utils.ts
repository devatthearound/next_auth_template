import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

// 요청에서 토큰 가져오기
export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// 요청에서 사용자 ID 가져오기
export function getUserIdFromRequest(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  
  const payload = verifyToken(token);
  return payload?.userId || null;
}

// 요청 컨텍스트 정보 가져오기 (활동 로깅용)
export function getRequestContext(req: NextRequest) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    // 지오로케이션은 추가 서비스나 라이브러리가 필요할 수 있음
  };
}