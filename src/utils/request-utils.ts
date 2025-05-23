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
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// 요청 컨텍스트 정보 가져오기 (활동 로깅용)
export function getRequestContext(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
  
  const userAgent = request.headers.get('user-agent') || '';
  
  return {
    ipAddress: ipAddress.split(',')[0]?.trim(),
    userAgent,
  };
}

// WebView 환경 감지 함수 추가
export function isWebViewRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptHeader = request.headers.get('accept') || '';
  
  // React Native WebView 특성 확인
  const webViewIndicators = [
    'ReactNativeWebView',
    'Mobile.*WebView',
    'WebView.*Mobile',
    'Android.*WebView',
    'iPhone.*WebView',
    'iPad.*WebView'
  ];
  
  // User-Agent 기반 검사
  const isWebViewUA = webViewIndicators.some(indicator => 
    new RegExp(indicator, 'i').test(userAgent)
  );
  
  // 모바일이면서 브라우저가 아닌 경우 (간접적 WebView 감지)
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isNotBrowser = !/chrome|firefox|safari|edge|opera/i.test(userAgent) || 
                      /webview|wv\)/i.test(userAgent);
  
  // Accept 헤더가 단순한 경우 (WebView 특성)
  const isSimpleAccept = !acceptHeader.includes('text/html') || 
                        acceptHeader.includes('application/json');
  
  return isWebViewUA || (isMobile && isNotBrowser) || (isMobile && isSimpleAccept);
}

// 모바일 환경 감지 함수
export function isMobileRequest(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}
