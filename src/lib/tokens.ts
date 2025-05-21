// src/lib/tokens.ts
import { prisma } from './prisma';

// Token types
export enum TokenType {
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
}

// Token expiry times (in milliseconds)
const TOKEN_EXPIRY = {
  [TokenType.PASSWORD_RESET]: 30 * 60 * 1000, // 30 minutes
  [TokenType.EMAIL_VERIFICATION]: 24 * 60 * 60 * 1000, // 24 hours
  [TokenType.PHONE_VERIFICATION]: 10 * 60 * 1000, // 10 minutes
};

// Generate a random token using Web Crypto API (Edge Runtime compatible)
export async function generateToken(length: number = 32): Promise<string> {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a reset password token
export async function generateResetToken(): Promise<string> {
  return generateToken();
}

// Generate an email verification token
export async function generateEmailVerificationToken(): Promise<string> {
  return generateToken();
}

// Generate a phone verification token (shorter for SMS)
export function generatePhoneVerificationToken(): string {
  // 6-digit code for SMS
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash a token for secure storage using Web Crypto API (Edge Runtime compatible)
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Store a token in the database
export async function storeToken(
  userId: string, 
  token: string, 
  type: TokenType
): Promise<void> {
  // Hash the token for storage
  const hashedToken = await hashToken(token);
  
  // Calculate expiry time
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY[type]);
  
  // Delete any existing tokens of the same type for this user
  await prisma.token.deleteMany({
    where: {
      userId,
      type,
    },
  });
  
  // Store the new token
  await prisma.token.create({
    data: {
      userId,
      token: hashedToken,
      type,
      expiresAt,
    },
  });
}

// Store a password reset token
export async function storeResetToken(userId: string, token: string): Promise<void> {
  return storeToken(userId, token, TokenType.PASSWORD_RESET);
}

// Store an email verification token
export async function storeEmailVerificationToken(userId: string, token: string): Promise<void> {
  return storeToken(userId, token, TokenType.EMAIL_VERIFICATION);
}

// Store a phone verification token
export async function storePhoneVerificationToken(userId: string, token: string): Promise<void> {
  return storeToken(userId, token, TokenType.PHONE_VERIFICATION);
}

// Verify a token and return the user ID if valid
export async function verifyToken(token: string, type: TokenType): Promise<string | null> {
  // Hash the token for comparison
  const hashedToken = await hashToken(token);
  
  // Find the token in the database
  const tokenRecord = await prisma.token.findFirst({
    where: {
      token: hashedToken,
      type,
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
  });
  
  if (!tokenRecord) {
    return null;
  }
  
  // Delete the token to prevent reuse
  await prisma.token.delete({
    where: {
      id: tokenRecord.id,
    },
  });
  
  return tokenRecord.userId;
}

// Verify a password reset token
export async function verifyResetToken(token: string): Promise<string | null> {
  return verifyToken(token, TokenType.PASSWORD_RESET);
}

// Verify an email verification token
export async function verifyEmailToken(token: string): Promise<string | null> {
  return verifyToken(token, TokenType.EMAIL_VERIFICATION);
}

// Verify a phone verification token
export async function verifyPhoneToken(token: string): Promise<string | null> {
  return verifyToken(token, TokenType.PHONE_VERIFICATION);
}