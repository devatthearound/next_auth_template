// src/lib/kakao-talk/kakao-talk.service.ts

import crypto from 'crypto';
import { KAKAO_TALK_TEMPLATES } from './kakao-talk-templates';
import { KakaoTalkRequest, KakaoTalkResponse } from '../types/kakao-talk-types';

export class KakaoTalkService {
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly serviceId: string;
  private readonly plusFriendId: string;
  private readonly apiUrl: string;

  constructor() {
    const accessKey = process.env.KAKAO_ACCESS_KEY;
    const secretKey = process.env.KAKAO_SECRET_KEY;
    const serviceId = process.env.KAKAO_SERVICE_ID;
    const plusFriendId = process.env.KAKAO_PLUS_FRIEND_ID;

    if (!accessKey || !secretKey || !serviceId || !plusFriendId) {
      throw new Error('카카오톡 알림톡 설정이 올바르지 않습니다.');
    }

    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.serviceId = serviceId;
    this.plusFriendId = plusFriendId;
    this.apiUrl = 'https://sens.apigw.ntruss.com/alimtalk/v2/services';
  }

  private generateSignature(timestamp: string): string {
    const message = `POST /alimtalk/v2/services/${this.serviceId}/messages\n${timestamp}\n${this.accessKey}`;
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
    return signature;
  }

  private replaceTemplateVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return result;
  }

  async sendMessage(
    templateCode: string,
    phoneNumber: string,
    variables: Record<string, string>,
  ): Promise<KakaoTalkResponse> {
    const template = KAKAO_TALK_TEMPLATES[templateCode];
    if (!template) {
      throw new Error(`Template not found: ${templateCode}`);
    }

    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp);

    const request: KakaoTalkRequest = {
      countryCode: '+82',
      plusFriendId: this.plusFriendId,
      templateCode: template.templateCode,
      messages: [
        {
          to: phoneNumber,
          content: this.replaceTemplateVariables(template.templateContent, variables),
          buttons: template.buttons?.map(button => ({
            ...button,
            linkMobile: this.replaceTemplateVariables(button.linkMobile, variables),
            linkPc: this.replaceTemplateVariables(button.linkPc, variables),
          })),
        },
      ],
    };

    try {
      const response = await fetch(
        `${this.apiUrl}/${this.serviceId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ncp-apigw-timestamp': timestamp,
            'x-ncp-iam-access-key': this.accessKey,
            'x-ncp-apigw-signature-v2': signature,
          },
          body: JSON.stringify(request),
        }
      );

      const responseData = await response.json();

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? '메시지가 성공적으로 전송되었습니다.' : '메시지 전송에 실패했습니다.',
        data: responseData,
      };
    } catch (error: any) {
      console.error('카카오톡 알림톡 전송 실패:', error);
      return {
        success: false,
        status: 500,
        message: error.message || '메시지 전송에 실패했습니다.',
      };
    }
  }

  // 편의 메서드들
  async sendEmailVerification(phoneNumber: string, userName: string, verificationCode: string, verificationLink: string): Promise<KakaoTalkResponse> {
    return this.sendMessage('EMAIL_VERIFICATION', phoneNumber, {
      userName,
      verificationCode,
      verificationLink,
    });
  }

  async sendPhoneVerification(phoneNumber: string, userName: string, verificationCode: string): Promise<KakaoTalkResponse> {
    return this.sendMessage('PHONE_VERIFICATION', phoneNumber, {
      userName,
      verificationCode,
    });
  }

  async sendPasswordReset(phoneNumber: string, userName: string, resetLink: string): Promise<KakaoTalkResponse> {
    return this.sendMessage('PASSWORD_RESET', phoneNumber, {
      userName,
      resetLink,
    });
  }

  async sendWelcome(phoneNumber: string, userName: string, couponLink: string, serviceLink: string): Promise<KakaoTalkResponse> {
    return this.sendMessage('WELCOME', phoneNumber, {
      userName,
      couponLink,
      serviceLink,
    });
  }

  async sendOrderConfirmed(phoneNumber: string, orderNumber: string, productName: string, amount: string, orderDetailLink: string): Promise<KakaoTalkResponse> {
    return this.sendMessage('ORDER_CONFIRMED', phoneNumber, {
      orderNumber,
      productName,
      amount,
      orderDetailLink,
    });
  }
}

// 싱글톤 인스턴스
let kakaoTalkServiceInstance: KakaoTalkService | null = null;

export function getKakaoTalkService(): KakaoTalkService {
  if (!kakaoTalkServiceInstance) {
    kakaoTalkServiceInstance = new KakaoTalkService();
  }
  return kakaoTalkServiceInstance;
}