import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';
import { getRequestContext } from '@/utils/request-utils';

export async function POST(request: NextRequest) {
  try {
    // refreshToken은 쿠키에서 가져옴
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return NextResponse.json({ 
        error: "Refresh token is required" 
      }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 토큰 갱신
    const accessToken = await refreshAccessToken(refreshToken, context);
    
    if (!accessToken) {
      return NextResponse.json({ 
        error: "Invalid or expired refresh token" 
      }, { status: 401 });
    }

    return NextResponse.json({
      accessToken
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Token refresh failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Token refresh failed" 
    }, { status: 500 });
  }
}