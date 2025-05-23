// src/lib/kakao-talk/constants/kakao-talk.constants.ts

export const TEMPLATE_CODES = {
  // 인증 관련
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PHONE_VERIFICATION: 'PHONE_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // 주문 관련
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_COMPLETED: 'ORDER_COMPLETED',
  
  // 일반 알림
  WELCOME: 'WELCOME',
  PROMOTION: 'PROMOTION',
} as const;

export type TemplateCode = typeof TEMPLATE_CODES[keyof typeof TEMPLATE_CODES];