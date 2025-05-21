// 로그인 시도 추적 유틸리티
// 실제 프로덕션 환경에서는 Redis와 같은 외부 스토리지를 사용해야 합니다.

interface LoginAttempt {
    count: number;
    lastAttempt: number;
    blockedUntil: number | null;
  }
  
  // 아이디(이메일/전화번호) 또는 IP 주소별 로그인 시도 추적
  const loginAttempts: Record<string, LoginAttempt> = {};
  
  // 설정
  const MAX_ATTEMPTS = 5;        // 최대 시도 횟수
  const BLOCK_DURATION = 15 * 60 * 1000; // 15분 (밀리초)
  const ATTEMPT_RESET = 30 * 60 * 1000;  // 30분 후 시도 횟수 초기화 (밀리초)
  
  /**
   * 로그인 시도 기록
   * @param identifier 사용자 식별자 (이메일 또는 IP 주소)
   * @param success 로그인 성공 여부
   * @returns 차단 여부 정보
   */
  export function recordLoginAttempt(identifier: string, success: boolean): { 
    blocked: boolean, 
    remainingAttempts: number, 
    blockedUntil: number | null 
  } {
    const now = Date.now();
    
    // 처음 시도하는 경우 초기화
    if (!loginAttempts[identifier]) {
      loginAttempts[identifier] = {
        count: 0,
        lastAttempt: now,
        blockedUntil: null
      };
    }
    
    const attempt = loginAttempts[identifier];
    
    // 차단 여부 확인
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return {
        blocked: true,
        remainingAttempts: 0,
        blockedUntil: attempt.blockedUntil
      };
    }
    
    // 차단 기간이 지났으면 초기화
    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      attempt.count = 0;
      attempt.blockedUntil = null;
    }
    
    // 마지막 시도 후 ATTEMPT_RESET 이상 지났으면 초기화
    if (now - attempt.lastAttempt > ATTEMPT_RESET) {
      attempt.count = 0;
    }
    
    // 성공 시 초기화
    if (success) {
      attempt.count = 0;
      attempt.lastAttempt = now;
      attempt.blockedUntil = null;
      
      return {
        blocked: false,
        remainingAttempts: MAX_ATTEMPTS,
        blockedUntil: null
      };
    }
    
    // 실패 시 시도 횟수 증가
    attempt.count++;
    attempt.lastAttempt = now;
    
    // 최대 시도 횟수 초과 시 차단
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.blockedUntil = now + BLOCK_DURATION;
      
      return {
        blocked: true,
        remainingAttempts: 0,
        blockedUntil: attempt.blockedUntil
      };
    }
    
    return {
      blocked: false,
      remainingAttempts: MAX_ATTEMPTS - attempt.count,
      blockedUntil: null
    };
  }
  
  /**
   * 현재 로그인 시도 상태 확인
   * @param identifier 사용자 식별자 (이메일 또는 IP 주소)
   * @returns 차단 여부 정보
   */
  export function checkLoginStatus(identifier: string): { 
    blocked: boolean, 
    remainingAttempts: number, 
    blockedUntil: number | null 
  } {
    const now = Date.now();
    
    // 데이터가 없으면 초기 상태 반환
    if (!loginAttempts[identifier]) {
      return {
        blocked: false,
        remainingAttempts: MAX_ATTEMPTS,
        blockedUntil: null
      };
    }
    
    const attempt = loginAttempts[identifier];
    
    // 차단 여부 확인
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return {
        blocked: true,
        remainingAttempts: 0,
        blockedUntil: attempt.blockedUntil
      };
    }
    
    // 차단 기간이 지났으면 초기화
    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      attempt.count = 0;
      attempt.blockedUntil = null;
    }
    
    // 마지막 시도 후 ATTEMPT_RESET 이상 지났으면 초기화
    if (now - attempt.lastAttempt > ATTEMPT_RESET) {
      attempt.count = 0;
    }
    
    return {
      blocked: false,
      remainingAttempts: MAX_ATTEMPTS - attempt.count,
      blockedUntil: null
    };
  }
  
  // 주기적으로 만료된 데이터 정리 (메모리 누수 방지)
  setInterval(() => {
    const now = Date.now();
    for (const key in loginAttempts) {
      const attempt = loginAttempts[key];
      
      // 차단 기간이 지났거나 마지막 시도 후 오래된 데이터는 삭제
      if ((attempt.blockedUntil && attempt.blockedUntil <= now) || 
          (now - attempt.lastAttempt > ATTEMPT_RESET)) {
        delete loginAttempts[key];
      }
    }
  }, 60 * 60 * 1000); // 1시간마다 정리