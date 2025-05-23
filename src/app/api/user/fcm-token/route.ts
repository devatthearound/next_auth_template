import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, getRequestContext, isWebViewRequest } from '@/utils/request-utils';
import { FcmService } from '@/lib/fcm-service';
import { z } from 'zod';

// FCM 토큰 저장/업데이트 스키마
const saveFcmTokenSchema = z.object({
  fcmToken: z.string().min(1, "FCM 토큰이 필요합니다"),
  deviceId: z.string().optional(),
  deviceType: z.enum(['android', 'ios', 'web']).optional(),
  deviceInfo: z.string().optional(),
  appVersion: z.string().optional(),
});

// FCM 토큰 저장/업데이트
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 입력 데이터 유효성 검사
    try {
      saveFcmTokenSchema.parse(body);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // 요청 컨텍스트 정보 가져오기
    const context = getRequestContext(request);
    const isWebView = isWebViewRequest(request);

    // 디바이스 타입 자동 감지 (제공되지 않은 경우)
    let deviceType = body.deviceType;
    if (!deviceType) {
      if (isWebView) {
        const userAgent = context.userAgent.toLowerCase();
        if (userAgent.includes('android')) {
          deviceType = 'android';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          deviceType = 'ios';
        } else {
          deviceType = 'web';
        }
      } else {
        deviceType = 'web';
      }
    }

    // FCM 토큰 저장
    const success = await FcmService.saveOrUpdateFcmToken(
      userId,
      {
        token: body.fcmToken,
        deviceId: body.deviceId,
        deviceType,
        deviceInfo: body.deviceInfo || context.userAgent,
        appVersion: body.appVersion,
      },
      context
    );

    if (!success) {
      return NextResponse.json(
        { error: 'FCM 토큰 저장에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'FCM 토큰이 성공적으로 저장되었습니다',
      deviceType,
      isWebView
    });

  } catch (error) {
    console.error('FCM 토큰 저장 오류:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 사용자의 FCM 토큰 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // FCM 토큰 목록 조회
    const fcmTokens = await FcmService.getUserFcmTokens(userId);
    
    // FCM 토큰 통계 조회
    const stats = await FcmService.getUserTokenStats(userId);

    return NextResponse.json({
      fcmTokens,
      stats,
      totalTokens: fcmTokens.length
    });

  } catch (error) {
    console.error('FCM 토큰 조회 오류:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// FCM 토큰 삭제
export async function DELETE(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fcmToken = searchParams.get('token');
    const deviceId = searchParams.get('deviceId');
    const allDevices = searchParams.get('all') === 'true';

    // 요청 컨텍스트
    const context = getRequestContext(request);

    if (allDevices) {
      // 모든 FCM 토큰 비활성화
      const success = await FcmService.deactivateAllUserTokens(userId, context);
      
      if (!success) {
        return NextResponse.json(
          { error: 'FCM 토큰 삭제에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: '모든 FCM 토큰이 성공적으로 삭제되었습니다'
      });

    } else if (deviceId) {
      // 특정 디바이스의 FCM 토큰 비활성화
      const success = await FcmService.deactivateDeviceTokens(userId, deviceId);
      
      if (!success) {
        return NextResponse.json(
          { error: 'FCM 토큰 삭제에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: '디바이스의 FCM 토큰이 성공적으로 삭제되었습니다'
      });

    } else if (fcmToken) {
      // 특정 FCM 토큰 비활성화
      const success = await FcmService.deactivateFcmToken(fcmToken);
      
      if (!success) {
        return NextResponse.json(
          { error: 'FCM 토큰 삭제에 실패했습니다' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'FCM 토큰이 성공적으로 삭제되었습니다'
      });

    } else {
      return NextResponse.json(
        { error: '삭제할 토큰 또는 디바이스 ID를 지정해주세요' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('FCM 토큰 삭제 오류:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 