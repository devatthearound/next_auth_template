// src/app/api/kakao-talk/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { getKakaoTalkService } from '@/lib/kakao-talk-service';
import { logUserActivity } from '@/lib/activity';
import { z } from 'zod';

// 유효성 검사 스키마
const sendMessageSchema = z.object({
  templateCode: z.string().min(1),
  phoneNumber: z.string().min(10),
  variables: z.record(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      sendMessageSchema.parse(body);
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid input data" 
      }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);

    // 카카오톡 알림톡 전송
    const kakaoTalkService = getKakaoTalkService();
    const result = await kakaoTalkService.sendMessage(
      body.templateCode,
      body.phoneNumber,
      body.variables
    );

    // 활동 로그 기록
    await logUserActivity(
      userId, 
      'KAKAO_TALK_SENT', 
      { 
        templateCode: body.templateCode,
        phoneNumber: body.phoneNumber.substring(0, 8) + '****', // 개인정보 보호
        success: result.success 
      }, 
      context
    );

    if (result.success) {
      return NextResponse.json({
        message: "카카오톡 알림톡이 성공적으로 전송되었습니다.",
        data: result
      }, { status: 200 });
    } else {
      return NextResponse.json({
        error: "카카오톡 알림톡 전송에 실패했습니다.",
        details: result.message
      }, { status: result.status });
    }
  } catch (error: any) {
    console.error('카카오톡 알림톡 API 오류:', error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}