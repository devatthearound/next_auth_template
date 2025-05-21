import jwt, { Secret, SignOptions } from 'jsonwebtoken';

// 환경 변수에서 JWT 시크릿 가져오기 (없으면 에러 발생)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // 개발 모드에서만 콘솔에 에러 표시
  if (process.env.NODE_ENV !== 'production') {
    console.error('JWT_SECRET 환경 변수가 설정되지 않았습니다!');
  }
  throw new Error('JWT_SECRET 환경 변수가 필요합니다');
}

const JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '7d';

export interface JwtPayload {
  userId: string;
  email?: string;
  phoneNumber?: string;
  userType: 'CUSTOMER' | 'OWNER';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET as Secret, { expiresIn: JWT_EXPIRE } as SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ userId: payload.userId }, JWT_SECRET as Secret, { expiresIn: REFRESH_TOKEN_EXPIRE } as SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as Secret) as JwtPayload;
  } catch (error) {
    return null;
  }
}