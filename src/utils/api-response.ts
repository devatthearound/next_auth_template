// src/utils/api-response.ts
import { NextResponse } from 'next/server';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Error codes - standardized error codes for client handling
export enum ErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
  
  // Authorization errors
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // CSRF errors
  INVALID_CSRF_TOKEN = 'INVALID_CSRF_TOKEN',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_DELIVERY_FAILED = 'EMAIL_DELIVERY_FAILED',
  SMS_DELIVERY_FAILED = 'SMS_DELIVERY_FAILED',
}

// Helper to create a success response
export function successResponse<T>(data?: T, message?: string, status: number = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  
  return NextResponse.json(response, { status });
}

// Helper to create an error response
export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  status: number = 400
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  
  return NextResponse.json(response, { status });
}

// Common error responses
export const Errors = {
  // Authentication errors (401)
  unauthorized: (message: string = "Authentication required") => 
    errorResponse(ErrorCode.UNAUTHORIZED, message, undefined, 401),
    
  invalidCredentials: (message: string = "Invalid credentials") => 
    errorResponse(ErrorCode.INVALID_CREDENTIALS, message, undefined, 401),
    
  tokenExpired: (message: string = "Token has expired") => 
    errorResponse(ErrorCode.TOKEN_EXPIRED, message, undefined, 401),
    
  invalidToken: (message: string = "Invalid token") => 
    errorResponse(ErrorCode.INVALID_TOKEN, message, undefined, 401),
    
  verificationRequired: (message: string = "Verification required") => 
    errorResponse(ErrorCode.VERIFICATION_REQUIRED, message, undefined, 401),
  
  // Authorization errors (403)
  forbidden: (message: string = "Access denied") => 
    errorResponse(ErrorCode.FORBIDDEN, message, undefined, 403),
    
  insufficientPermissions: (message: string = "Insufficient permissions") => 
    errorResponse(ErrorCode.INSUFFICIENT_PERMISSIONS, message, undefined, 403),
    
  invalidCsrfToken: (message: string = "Invalid CSRF token") => 
    errorResponse(ErrorCode.INVALID_CSRF_TOKEN, message, undefined, 403),
  
  // Validation errors (400)
  validation: (details: any, message: string = "Validation failed") => 
    errorResponse(ErrorCode.VALIDATION_ERROR, message, details, 400),
    
  invalidInput: (details?: any, message: string = "Invalid input") => 
    errorResponse(ErrorCode.INVALID_INPUT, message, details, 400),
  
  // Resource errors
  notFound: (resource: string = "Resource", message?: string) => 
    errorResponse(ErrorCode.NOT_FOUND, message || `${resource} not found`, undefined, 404),
    
  alreadyExists: (resource: string, message?: string) => 
    errorResponse(ErrorCode.ALREADY_EXISTS, message || `${resource} already exists`, undefined, 409),
    
  conflict: (message: string = "Resource conflict") => 
    errorResponse(ErrorCode.CONFLICT, message, undefined, 409),
  
  // Rate limiting (429)
  rateLimitExceeded: (message: string = "Rate limit exceeded", retryAfter?: number) => 
    errorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, message, { retryAfter }, 429),
  
  // Server errors (500)
  internal: (message: string = "Internal server error") => 
    errorResponse(ErrorCode.INTERNAL_ERROR, message, undefined, 500),
    
  serviceUnavailable: (message: string = "Service temporarily unavailable") => 
    errorResponse(ErrorCode.SERVICE_UNAVAILABLE, message, undefined, 503),
    
  databaseError: (message: string = "Database error occurred") => 
    errorResponse(ErrorCode.DATABASE_ERROR, message, undefined, 500),
    
  emailDeliveryFailed: (message: string = "Failed to send email") => 
    errorResponse(ErrorCode.EMAIL_DELIVERY_FAILED, message, undefined, 500),
    
  smsDeliveryFailed: (message: string = "Failed to send SMS") => 
    errorResponse(ErrorCode.SMS_DELIVERY_FAILED, message, undefined, 500),
};