import { NextRequest, NextResponse } from 'next/server';
import { fcmNotificationService } from '@/lib/fcm-notification-service';
import { getUserIdFromRequest } from '@/utils/request-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userType: true,
        isActive: true,
        name: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    // 테스트 알림 내용
    const notification = {
      title: "🔔 테스트 알림",
      body: `안녕하세요 ${user.name || '사용자'}님! FCM 알림이 정상적으로 작동하고 있습니다.`,
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
        userId: user.id,
      },
    };

    // 자신에게 테스트 알림 발송
    const result = await fcmNotificationService.sendToUser(userId, notification, {
      priority: 'high',
    });

    return NextResponse.json({
      success: true,
      message: "테스트 알림 발송 완료",
      result: {
        targetUserId: userId,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
      notification,
    });
  } catch (error) {
    console.error('테스트 알림 발송 API 오류:', error);
    return NextResponse.json({ 
      error: "테스트 알림 발송 중 오류가 발생했습니다",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 