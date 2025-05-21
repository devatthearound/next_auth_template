// 메모리 기반 간단한 Rate Limiting 구현
// 실제 프로덕션 환경에서는 Redis와 같은 외부 스토리지 사용을 권장합니다.

export interface RateLimitConfig {
    windowMs: number;  // 시간 윈도우 (밀리초)
    maxRequests: number;  // 허용되는 최대 요청 수
  }
  
  export interface RateLimitInfo {
    limit: number;     // 허용되는 최대 요청 수
    remaining: number; // 남은 요청 수
    reset: number;     // 제한이 초기화되는 시간 (Unix timestamp)
  }
  
  // IP 주소별 요청 카운터
  const ipRequestCounts: Record<string, { count: number, resetTime: number }> = {};
  
  // 특수한 경로별 Rate Limit 설정 (더 엄격한 제한)
  const strictPaths: Record<string, RateLimitConfig> = {
    '/api/auth/login': { windowMs: 15 * 60 * 1000, maxRequests: 5 },  // 15분에 5회
    '/api/auth/register': { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 1시간에 3회
    '/api/user/deactivate': { windowMs: 24 * 60 * 60 * 1000, maxRequests: 1 } // 24시간에 1회
  };
  
  // 기본 Rate Limit 설정
  const defaultRateLimit: RateLimitConfig = {
    windowMs: 60 * 1000,  // 1분
    maxRequests: 100       // 100회
  };
  
  export function getRateLimitConfig(path: string): RateLimitConfig {
    // 특수 경로에 대한 설정이 있으면 해당 설정 사용
    for (const [pathPrefix, config] of Object.entries(strictPaths)) {
      if (path.startsWith(pathPrefix)) {
        return config;
      }
    }
    
    // 없으면 기본 설정 사용
    return defaultRateLimit;
  }
  
  export function checkRateLimit(ip: string, path: string): RateLimitInfo | null {
    const config = getRateLimitConfig(path);
    const key = `${ip}:${path}`;
    const now = Date.now();
    
    // 처음 요청하는 경우 초기화
    if (!ipRequestCounts[key] || ipRequestCounts[key].resetTime <= now) {
      ipRequestCounts[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }
    
    // 요청 카운트 증가
    ipRequestCounts[key].count++;
    
    // 제한 정보 생성
    const info: RateLimitInfo = {
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - ipRequestCounts[key].count),
      reset: Math.floor(ipRequestCounts[key].resetTime / 1000)
    };
    
    // 제한 초과 시 null 반환
    if (ipRequestCounts[key].count > config.maxRequests) {
      return null;
    }
    
    return info;
  }
  
  // 주기적으로 만료된 카운터 정리 (메모리 누수 방지)
  setInterval(() => {
    const now = Date.now();
    for (const key in ipRequestCounts) {
      if (ipRequestCounts[key].resetTime <= now) {
        delete ipRequestCounts[key];
      }
    }
  }, 60 * 1000); // 1분마다 정리