import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { logUserActivity } from '@/lib/activity';
import { z } from 'zod';

// 유효성 검사 스키마
const updateOwnerSchema = z.object({
  businessName: z.string().min(1).optional(),
  businessNumber: z.string().optional(),
  businessAddress: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }

    // 사용자 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { owner: true }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }
    
    if (user.userType !== 'OWNER') {
      return NextResponse.json({ 
        error: "Only owners can update business profile" 
      }, { status: 403 });
    }
    
    if (!user.owner) {
      return NextResponse.json({ 
        error: "Business profile not found" 
      }, { status: 404 });
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      updateOwnerSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);

    // 사업자 정보 업데이트
    const updatedOwner = await prisma.owner.update({
      where: { id: user.owner.id },
      data: {
        businessName: body.businessName,
        businessNumber: body.businessNumber,
        businessAddress: body.businessAddress,
      }
    });

    // 활동 로그 기록
    await logUserActivity(
      userId, 
      'OWNER_BUSINESS_UPDATE', 
      { updatedFields: Object.keys(body) }, 
      context
    );

    return NextResponse.json({
      message: "Business profile updated successfully",
      owner: updatedOwner
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to update business profile" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to update business profile" 
    }, { status: 500 });
  }
}