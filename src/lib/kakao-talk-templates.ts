// src/lib/kakao-talk/templates/kakao-talk.templates.ts

import { KakaoTalkTemplate } from '../types/kakao-talk-types';
import { TEMPLATE_CODES } from './kakao-talk-constants';

export const KAKAO_TALK_TEMPLATES: Record<string, KakaoTalkTemplate> = {
  [TEMPLATE_CODES.EMAIL_VERIFICATION]: {
    templateCode: 'EMAIL_VERIFY_001',
    templateContent: `안녕하세요! {{userName}}님

이메일 인증을 완료해주세요.

인증코드: {{verificationCode}}

인증코드를 입력하여 이메일 인증을 완료해주세요.`,
    buttons: [
      {
        name: '인증하기',
        type: 'WL',
        linkMobile: '{{verificationLink}}',
        linkPc: '{{verificationLink}}',
      },
    ],
  },

  [TEMPLATE_CODES.PHONE_VERIFICATION]: {
    templateCode: 'PHONE_VERIFY_001',
    templateContent: `안녕하세요! {{userName}}님

휴대폰 인증을 완료해주세요.

인증번호: {{verificationCode}}

3분 내에 인증번호를 입력해주세요.`,
  },

  [TEMPLATE_CODES.PASSWORD_RESET]: {
    templateCode: 'PASSWORD_RESET_001',
    templateContent: `안녕하세요! {{userName}}님

비밀번호 재설정 요청이 있었습니다.

아래 링크를 클릭하여 비밀번호를 재설정해주세요.

※ 링크는 30분간 유효합니다.`,
    buttons: [
      {
        name: '비밀번호 재설정',
        type: 'WL',
        linkMobile: '{{resetLink}}',
        linkPc: '{{resetLink}}',
      },
    ],
  },

  [TEMPLATE_CODES.ORDER_CONFIRMED]: {
    templateCode: 'ORDER_CONFIRM_001',
    templateContent: `주문이 접수되었습니다!

주문번호: {{orderNumber}}
상품명: {{productName}}
결제금액: {{amount}}원

주문 상세 내용은 아래 링크에서 확인하실 수 있습니다.`,
    buttons: [
      {
        name: '주문 상세보기',
        type: 'WL',
        linkMobile: '{{orderDetailLink}}',
        linkPc: '{{orderDetailLink}}',
      },
    ],
  },

  [TEMPLATE_CODES.ORDER_CANCELLED]: {
    templateCode: 'ORDER_CANCEL_001',
    templateContent: `주문이 취소되었습니다.

주문번호: {{orderNumber}}
취소사유: {{cancelReason}}

환불은 2-3일 내에 처리됩니다.`,
    buttons: [
      {
        name: '환불 상태 확인',
        type: 'WL',
        linkMobile: '{{refundStatusLink}}',
        linkPc: '{{refundStatusLink}}',
      },
    ],
  },

  [TEMPLATE_CODES.WELCOME]: {
    templateCode: 'WELCOME_001',
    templateContent: `{{userName}}님, 회원가입을 환영합니다! 🎉

다양한 혜택과 서비스를 이용해보세요.

신규 회원 전용 쿠폰이 발급되었습니다!`,
    buttons: [
      {
        name: '쿠폰 받기',
        type: 'WL',
        linkMobile: '{{couponLink}}',
        linkPc: '{{couponLink}}',
      },
      {
        name: '서비스 둘러보기',
        type: 'WL',
        linkMobile: '{{serviceLink}}',
        linkPc: '{{serviceLink}}',
      },
    ],
  },

  [TEMPLATE_CODES.PROMOTION]: {
    templateCode: 'PROMOTION_001',
    templateContent: `{{userName}}님을 위한 특별 혜택! 💝

{{promotionTitle}}

{{promotionDescription}}

※ {{expiryDate}}까지 유효합니다.`,
    buttons: [
      {
        name: '혜택 받기',
        type: 'WL',
        linkMobile: '{{promotionLink}}',
        linkPc: '{{promotionLink}}',
      },
    ],
  },
};