import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getRequestContext } from '@/utils/request-utils';
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

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 사용자 로그인
    const result = await loginUser({
      email: body.email,
      phoneNumber: body.phoneNumber,
      password: body.password,
    }, context);

    if (!result) {
      return NextResponse.json({ 
        error: "Invalid credentials" 
      }, { status: 401 });
    }

    const { user, accessToken, refreshToken } = result;

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