import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getRequestContext, isWebViewRequest } from '@/utils/request-utils';
import { checkLoginStatus, recordLoginAttempt } from '@/utils/login-attempts';
import { z } from 'zod';

// 유효성 검사 스키마
const loginSchema = z.object({
  identifier: z.string().min(1, "이메일 또는 전화번호를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      loginSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // WebView 환경 감지
    const isWebView = isWebViewRequest(request);
    console.log('WebView 환경 감지:', isWebView);

    // 사용자 식별자
    const identifier = body.identifier;
    
    // IP 주소 (백업 식별자)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 로그인 상태 확인 (식별자 기준)
    const loginStatus = checkLoginStatus(identifier);
    
    // IP 기준 로그인 상태도 확인 (IP 차단 여부)
    const ipLoginStatus = checkLoginStatus(ip);
    
    // 식별자 또는 IP가 차단된 경우
    if (loginStatus.blocked || ipLoginStatus.blocked) {
      const blockedUntil = Math.max(
        loginStatus.blockedUntil || 0, 
        ipLoginStatus.blockedUntil || 0
      );
      
      // 차단 시간을 사람이 읽기 쉬운 형태로 변환
      const blockTimeMinutes = Math.ceil((blockedUntil - Date.now()) / (60 * 1000));
      
      return NextResponse.json({ 
        error: "Account temporarily locked", 
        message: `Too many failed login attempts. Please try again in ${blockTimeMinutes} minutes.`,
        blockedUntil: blockedUntil
      }, { status: 429 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 사용자 로그인
    const result = await loginUser({
      identifier: body.identifier,
      password: body.password,
    }, context);

    // 로그인 시도 기록
    const success = !!result;
    recordLoginAttempt(identifier, success);
    recordLoginAttempt(ip, success);

    if (!success) {
      // 남은 시도 횟수 (식별자 기준)
      const remainingAttempts = Math.min(
        loginStatus.remainingAttempts - 1,
        ipLoginStatus.remainingAttempts - 1
      );
      
      return NextResponse.json({ 
        error: "Invalid credentials",
        remainingAttempts: remainingAttempts,
        message: remainingAttempts > 0 
          ? `Login failed. You have ${remainingAttempts} attempts remaining.`
          : "Login failed. Your account will be temporarily locked."
      }, { status: 401 });
    }

    const { user, accessToken, refreshToken } = result!;

    // 비밀번호 제외하고 반환
    const { password, ...userData } = user;

    // WebView 환경에 따른 다른 응답 처리
    const responseData: any = {
      message: "Login successful",
      user: userData,
      accessToken
    };

    // WebView 환경인 경우 refreshToken도 응답에 포함
    if (isWebView) {
      responseData.refreshToken = refreshToken;
      responseData.isWebView = true;
    }

    const response = NextResponse.json(responseData, { status: 200 });

    // 웹 브라우저 환경인 경우에만 쿠키 설정
    if (!isWebView) {
      response.cookies.set({
        name: 'refreshToken',
        value: refreshToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7일
      });
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Login failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Login failed" 
    }, { status: 500 });
  }
}