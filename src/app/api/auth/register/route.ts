import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { getRequestContext } from '@/utils/request-utils';
import { validatePasswordStrength } from '@/utils/password-utils';
import { z } from 'zod';

// 유효성 검사 스키마
const customerRegisterSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  password: z.string().min(8),
  name: z.string().optional(),
  userType: z.literal('CUSTOMER'),
  customer: z.object({
    address: z.string().optional(),
    preferences: z.record(z.any()).optional(),
  }).optional(),
});

const ownerRegisterSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  password: z.string().min(8),
  name: z.string().optional(),
  userType: z.literal('OWNER'),
  owner: z.object({
    businessName: z.string().min(1),
    businessNumber: z.string().optional(),
    businessAddress: z.string().optional(),
  }),
});

const registerSchema = z.discriminatedUnion('userType', [
  customerRegisterSchema,
  ownerRegisterSchema,
]).refine(data => data.email || data.phoneNumber, {
  message: "Either email or phone number is required",
  path: ["email", "phoneNumber"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      registerSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: "Password does not meet security requirements", 
        details: passwordValidation.errors 
      }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    
    // 사용자 등록
    const user = await registerUser(body, context);

    // 비밀번호 제외하고 반환
    const { password, refreshToken, ...userData } = user;

    return NextResponse.json({ 
      message: "Registration successful",
      user: userData 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Registration failed" 
      }, { status: 500 });
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}