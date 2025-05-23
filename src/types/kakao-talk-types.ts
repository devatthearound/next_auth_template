// src/types/kakao-talk.types.ts

export interface KakaoTalkButton {
  name: string;
  type: 'DS' | 'WL' | 'AL' | 'BK' | 'MD';
  linkMobile: string;
  linkPc: string;
  schemeIos?: string;
  schemeAndroid?: string;
}

export interface KakaoTalkMessage {
  to: string;
  content: string;
  buttons?: KakaoTalkButton[];
}

export interface KakaoTalkRequest {
  countryCode: string;
  plusFriendId: string;
  templateCode: string;
  messages: KakaoTalkMessage[];
}

export interface KakaoTalkResponse {
  success: boolean;
  status: number;
  message: string;
  data?: any;
}

export interface KakaoTalkTemplate {
  templateCode: string;
  templateContent: string;
  buttons?: KakaoTalkButton[];
}