import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { logUserActivity } from '@/lib/activity';
import { z } from 'zod';

// 유효성 검사 스키마
const updateCustomerSchema = z.object({
  address: z.string().optional(),
  preferences: z.record(z.any()).optional(),
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
      include: { customer: true }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }
    
    if (user.userType !== 'CUSTOMER') {
      return NextResponse.json({ 
        error: "Only customers can update customer profile" 
      }, { status: 403 });
    }
    
    if (!user.customer) {
      return NextResponse.json({ 
        error: "Customer profile not found" 
      }, { status: 404 });
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      updateCustomerSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);

    // 고객 정보 업데이트
    const updatedCustomer = await prisma.customer.update({
      where: { id: user.customer.id },
      data: {
        address: body.address,
        preferences: body.preferences,
      }
    });

    // 활동 로그 기록
    await logUserActivity(
      userId, 
      'CUSTOMER_PROFILE_UPDATE', 
      { updatedFields: Object.keys(body) }, 
      context
    );

    return NextResponse.json({
      message: "Customer profile updated successfully",
      customer: updatedCustomer
    }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message || "Failed to update customer profile" 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: "Failed to update customer profile" 
    }, { status: 500 });
  }
}