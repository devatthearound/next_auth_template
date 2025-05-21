// 비밀번호 정책 검증 유틸리티

export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
  }
  
  export function validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // 최소 길이 검증
    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다');
    }
    
    // 대문자 포함 검증
    if (!/[A-Z]/.test(password)) {
      errors.push('비밀번호는 적어도 하나의 대문자를 포함해야 합니다');
    }
    
    // 소문자 포함 검증
    if (!/[a-z]/.test(password)) {
      errors.push('비밀번호는 적어도 하나의 소문자를 포함해야 합니다');
    }
    
    // 숫자 포함 검증
    if (!/[0-9]/.test(password)) {
      errors.push('비밀번호는 적어도 하나의 숫자를 포함해야 합니다');
    }
    
    // 특수 문자 포함 검증
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('비밀번호는 적어도 하나의 특수 문자를 포함해야 합니다');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }