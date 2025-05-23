import { NextRequest, NextResponse } from 'next/server';
import { fcmNotificationService } from '@/lib/fcm-notification-service';
import { getUserIdFromRequest } from '@/utils/request-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 사용자 정보 조회 (OWNER 권한 확인)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userType: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    if (user.userType !== 'OWNER') {
      return NextResponse.json({ error: "권한이 없습니다. OWNER만 통계를 조회할 수 있습니다" }, { status: 403 });
    }

    // 알림 통계 조회
    const stats = await fcmNotificationService.getNotificationStats();

    return NextResponse.json({
      success: true,
      message: "알림 통계 조회 완료",
      stats,
    });
  } catch (error) {
    console.error('알림 통계 조회 API 오류:', error);
    return NextResponse.json({ 
      error: "알림 통계 조회 중 오류가 발생했습니다",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 