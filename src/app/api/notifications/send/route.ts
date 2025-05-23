import { NextRequest, NextResponse } from 'next/server';
import { fcmNotificationService, NotificationPayload, SendNotificationOptions } from '@/lib/fcm-notification-service';
import { getUserIdFromRequest, getRequestContext } from '@/utils/request-utils';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 알림 발송 요청 스키마
const sendNotificationSchema = z.object({
  // 알림 내용
  title: z.string().min(1, "제목은 필수입니다"),
  body: z.string().min(1, "내용은 필수입니다"),
  imageUrl: z.string().url().optional(),
  clickAction: z.string().optional(),
  data: z.record(z.string()).optional(),
  
  // 발송 대상
  targetType: z.enum(['single', 'all', 'userType']),
  targetUserId: z.string().optional(), // targetType이 'single'일 때 필수
  targetUserType: z.enum(['CUSTOMER', 'OWNER']).optional(), // targetType이 'userType'일 때 필수
  
  // 발송 옵션
  priority: z.enum(['high', 'normal']).default('normal'),
  timeToLive: z.number().positive().optional(),
  collapseKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 기존 API와 동일한 인증 방식 사용
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
      return NextResponse.json({ error: "권한이 없습니다. OWNER만 알림을 발송할 수 있습니다" }, { status: 403 });
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    const validationResult = sendNotificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "입력 데이터가 올바르지 않습니다",
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const {
      title,
      body: messageBody,
      imageUrl,
      clickAction,
      data,
      targetType,
      targetUserId,
      targetUserType,
      priority,
      timeToLive,
      collapseKey,
    } = validationResult.data;

    // 알림 페이로드 생성
    const notification: NotificationPayload = {
      title,
      body: messageBody,
      imageUrl,
      clickAction,
      data,
    };

    // 발송 옵션 생성
    const options: SendNotificationOptions = {
      priority,
      timeToLive,
      collapseKey,
    };

    let result;

    // 발송 대상에 따른 처리
    switch (targetType) {
      case 'single':
        if (!targetUserId) {
          return NextResponse.json({ 
            error: "단일 사용자 발송 시 targetUserId가 필요합니다" 
          }, { status: 400 });
        }
        
        result = await fcmNotificationService.sendToUser(targetUserId, notification, options);
        
        return NextResponse.json({
          success: true,
          message: "개별 알림 발송 완료",
          result: {
            targetType: 'single',
            targetUserId,
            successCount: result.successCount,
            failureCount: result.failureCount,
          }
        });

      case 'all':
        result = await fcmNotificationService.sendToAllUsers(notification, options);
        
        return NextResponse.json({
          success: true,
          message: "전체 알림 발송 완료",
          result: {
            targetType: 'all',
            successCount: result.successCount,
            failureCount: result.failureCount,
            totalUsers: result.totalUsers,
          }
        });

      case 'userType':
        if (!targetUserType) {
          return NextResponse.json({ 
            error: "사용자 유형별 발송 시 targetUserType이 필요합니다" 
          }, { status: 400 });
        }
        
        result = await fcmNotificationService.sendToUserType(targetUserType, notification, options);
        
        return NextResponse.json({
          success: true,
          message: `${targetUserType} 사용자 알림 발송 완료`,
          result: {
            targetType: 'userType',
            targetUserType,
            successCount: result.successCount,
            failureCount: result.failureCount,
            totalUsers: result.totalUsers,
          }
        });

      default:
        return NextResponse.json({ 
          error: "올바르지 않은 발송 대상입니다" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('알림 발송 API 오류:', error);
    return NextResponse.json({ 
      error: "알림 발송 중 오류가 발생했습니다",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 