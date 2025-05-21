// src/utils/csrf-utils.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Generate a random CSRF token using Web Crypto API (Edge Runtime compatible)
export async function generateCsrfToken(): Promise<string> {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Hash CSRF token using Web Crypto API (Edge Runtime compatible)
export async function hashCsrfToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Set CSRF token cookie
export async function setCsrfTokenCookie(response: NextResponse, token: string) {
  const hashedToken = await hashCsrfToken(token);
  
  response.cookies.set({
    name: 'XSRF-TOKEN',
    value: hashedToken,
    httpOnly: false, // JavaScript can read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  // Server-side token for verification is stored as HTTP-only
  response.cookies.set({
    name: 'CSRF-TOKEN',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return response;
}

// Validate CSRF token
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Get header token
  const headerToken = request.headers.get('X-XSRF-TOKEN');
  
  if (!headerToken) {
    return false;
  }
  
  // Get cookie token
  const cookieToken = request.cookies.get('CSRF-TOKEN')?.value;
  
  if (!cookieToken) {
    return false;
  }
  
  // Hash cookie token and compare with header token
  const hashedCookieToken = await hashCsrfToken(cookieToken);
  
  return hashedCookieToken === headerToken;
}