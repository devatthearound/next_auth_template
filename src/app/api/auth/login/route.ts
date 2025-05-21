import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getRequestContext } from '@/utils/request-utils';
import { checkLoginStatus, recordLoginAttempt } from '@/utils/login-attempts';
import { z } from 'zod';

// 유효성 검사 스키마
const loginSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  password: z.string().min(1),
}).refine(data => data.email || data.phoneNumber, {
  message: "Either email or phone number is required",
  path: ["email", "phoneNumber"],
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

    // 사용자 식별자 (이메일 또는 전화번호)
    const identifier = body.email || body.phoneNumber || '';
    
    // IP 주소 (백업 식별자)
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 로그인 상태 확인 (이메일/전화번호 기준)
    const loginStatus = checkLoginStatus(identifier);
    
    // IP 기준 로그인 상태도 확인 (IP 차단 여부)
    const ipLoginStatus = checkLoginStatus(ip);
    
    // 이메일/전화번호 또는 IP가 차단된 경우
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
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: body.password,
    }, context);

    // 로그인 시도 기록
    const success = !!result;
    recordLoginAttempt(identifier, success);
    recordLoginAttempt(ip, success);

    if (!success) {
      // 남은 시도 횟수 (이메일/전화번호 기준)
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

    // refreshToken은 쿠키로 설정
    const response = NextResponse.json({
      message: "Login successful",
      user: userData,
      accessToken
    }, { status: 200 });

    // 보안을 위해 쿠키에 refreshToken 설정
    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7일
    });

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