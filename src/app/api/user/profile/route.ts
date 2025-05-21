import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { logUserActivity } from '@/lib/activity';
import { z } from 'zod';

// 유효성 검사 스키마
const updateProfileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    // 사용자 프로필 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        owner: true,
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }

    // 비밀번호 제외하고 반환
    const { password, refreshToken, ...userData } = user;

    return NextResponse.json({
      user: userData
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to fetch profile" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to fetch profile" 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
      updateProfileSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);

    // 사용자 프로필 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        email: body.email,
        phoneNumber: body.phoneNumber,
      },
      include: {
        customer: true,
        owner: true,
      }
    });

    // 활동 로그 기록
    await logUserActivity(
      userId, 
      'USER_PROFILE_UPDATE', 
      { updatedFields: Object.keys(body) }, 
      context
    );

    // 비밀번호 제외하고 반환
    const { password, refreshToken, ...userData } = updatedUser;

    return NextResponse.json({
      message: "Profile updated successfully",
      user: userData
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to update profile" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to update profile" 
    }, { status: 500 });
  }
}