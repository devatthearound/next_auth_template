import jwt, { Secret, SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-dont-use-in-production';
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