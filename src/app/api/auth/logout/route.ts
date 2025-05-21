import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 로그아웃 처리
    const success = await logoutUser(userId, context);
    
    if (!success) {
      return NextResponse.json({ 
        error: "Logout failed" 
      }, { status: 500 });
    }

    // refreshToken 쿠키 삭제
    const response = NextResponse.json({
      message: "Logged out successfully"
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