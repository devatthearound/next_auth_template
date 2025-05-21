import { NextRequest, NextResponse } from 'next/server';
import { deactivateUser } from '@/lib/auth';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { z } from 'zod';

// 유효성 검사 스키마
const deactivateSchema = z.object({
  confirmation: z.literal(true),
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
      deactivateSchema.parse(body);
    } catch (error) {
      return NextResponse.json({ 
        error: "Confirmation is required" 
      }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 계정 비활성화
    const success = await deactivateUser(userId, context);
    
    if (!success) {
      return NextResponse.json({ 
        error: "Account deactivation failed" 
      }, { status: 500 });
    }

    // refreshToken 쿠키 삭제
    const response = NextResponse.json({
      message: "Account deactivated successfully"
    }, { status: 200 });

    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Account deactivation failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Account deactivation failed" 
    }, { status: 500 });
  }
}