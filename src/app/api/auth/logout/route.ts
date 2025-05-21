import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, logoutAllDevices } from '@/lib/auth';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { z } from 'zod';

// 유효성 검사 스키마
const logoutSchema = z.object({
  logoutAll: z.boolean().optional(),
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
      logoutSchema.parse(body);
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid request body" 
      }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    let success: boolean;
    
    if (body.logoutAll) {
      // 모든 디바이스 로그아웃
      success = await logoutAllDevices(userId, context);
    } else {
      // 현재 디바이스만 로그아웃
      const refreshToken = request.cookies.get('refreshToken')?.value;
      if (!refreshToken) {
        return NextResponse.json({ 
          error: "Refresh token not found" 
        }, { status: 400 });
      }
      success = await logoutUser(userId, refreshToken, context);
    }
    
    if (!success) {
      return NextResponse.json({ 
        error: "Logout failed" 
      }, { status: 500 });
    }

    // refreshToken 쿠키 삭제
    const response = NextResponse.json({
      message: body.logoutAll ? "Logged out from all devices" : "Logged out successfully"
    }, { status: 200 });

    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Logout failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Logout failed" 
    }, { status: 500 });
  }
}