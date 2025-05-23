import { prisma } from './prisma';
import { logUserActivity } from './activity';

export interface FcmTokenData {
  token: string;
  deviceId?: string;
  deviceType?: 'android' | 'ios' | 'web';
  deviceInfo?: string;
  appVersion?: string;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceType?: 'android' | 'ios' | 'web';
  deviceInfo?: string;
  appVersion?: string;
  userAgent?: string;
}

export class FcmService {
  // FCM 토큰 저장 또는 업데이트
  static async saveOrUpdateFcmToken(
    userId: string, 
    fcmTokenData: FcmTokenData,
    context?: any
  ): Promise<boolean> {
    try {
      // 기존 토큰이 있는지 확인
      const existingToken = await prisma.fcmToken.findUnique({
        where: { token: fcmTokenData.token }
      });

      if (existingToken) {
        // 토큰이 이미 존재하는 경우
        if (existingToken.userId === userId) {
          // 같은 사용자의 토큰인 경우 업데이트
          await prisma.fcmToken.update({
            where: { id: existingToken.id },
            data: {
              deviceId: fcmTokenData.deviceId,
              deviceType: fcmTokenData.deviceType,
              deviceInfo: fcmTokenData.deviceInfo,
              appVersion: fcmTokenData.appVersion,
              isActive: true,
              lastUsedAt: new Date(),
              updatedAt: new Date()
            }
          });
        } else {
          // 다른 사용자의 토큰인 경우 기존 토큰 비활성화 후 새로 생성
          await prisma.fcmToken.update({
            where: { id: existingToken.id },
            data: { isActive: false }
          });

          await prisma.fcmToken.create({
            data: {
              userId,
              token: fcmTokenData.token,
              deviceId: fcmTokenData.deviceId,
              deviceType: fcmTokenData.deviceType,
              deviceInfo: fcmTokenData.deviceInfo,
              appVersion: fcmTokenData.appVersion,
            }
          });
        }
      } else {
        // 새로운 토큰 생성
        await prisma.fcmToken.create({
          data: {
            userId,
            token: fcmTokenData.token,
            deviceId: fcmTokenData.deviceId,
            deviceType: fcmTokenData.deviceType,
            deviceInfo: fcmTokenData.deviceInfo,
            appVersion: fcmTokenData.appVersion,
          }
        });
      }

      // 활동 로그 기록
      await logUserActivity(
        userId,
        'FCM_TOKEN_UPDATED',
        { 
          deviceType: fcmTokenData.deviceType,
          deviceId: fcmTokenData.deviceId 
        },
        context
      );

      return true;
    } catch (error) {
      console.error('FCM 토큰 저장 실패:', error);
      return false;
    }
  }

  // 사용자의 모든 활성 FCM 토큰 조회
  static async getUserFcmTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await prisma.fcmToken.findMany({
        where: {
          userId,
          isActive: true
        },
        select: {
          token: true
        }
      });

      return tokens.map(t => t.token);
    } catch (error) {
      console.error('FCM 토큰 조회 실패:', error);
      return [];
    }
  }

  // 특정 FCM 토큰 비활성화
  static async deactivateFcmToken(token: string): Promise<boolean> {
    try {
      await prisma.fcmToken.updateMany({
        where: { token },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('FCM 토큰 비활성화 실패:', error);
      return false;
    }
  }

  // 사용자의 모든 FCM 토큰 비활성화
  static async deactivateAllUserTokens(userId: string, context?: any): Promise<boolean> {
    try {
      await prisma.fcmToken.updateMany({
        where: { 
          userId,
          isActive: true 
        },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });

      // 활동 로그 기록
      await logUserActivity(
        userId,
        'FCM_TOKENS_DEACTIVATED',
        { reason: 'User logout' },
        context
      );

      return true;
    } catch (error) {
      console.error('FCM 토큰 전체 비활성화 실패:', error);
      return false;
    }
  }

  // 특정 디바이스의 FCM 토큰 비활성화
  static async deactivateDeviceTokens(userId: string, deviceId: string): Promise<boolean> {
    try {
      await prisma.fcmToken.updateMany({
        where: {
          userId,
          deviceId,
          isActive: true
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('디바이스 FCM 토큰 비활성화 실패:', error);
      return false;
    }
  }

  // 오래된 FCM 토큰 정리 (30일 이상 사용하지 않은 토큰)
  static async cleanupOldTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.fcmToken.updateMany({
        where: {
          lastUsedAt: {
            lt: thirtyDaysAgo
          },
          isActive: true
        },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      console.log(`${result.count}개의 오래된 FCM 토큰이 정리되었습니다.`);
      return result.count;
    } catch (error) {
      console.error('FCM 토큰 정리 실패:', error);
      return 0;
    }
  }

  // 사용자별 FCM 토큰 통계
  static async getUserTokenStats(userId: string) {
    try {
      const stats = await prisma.fcmToken.groupBy({
        by: ['deviceType'],
        where: {
          userId,
          isActive: true
        },
        _count: {
          id: true
        }
      });

      return stats.reduce((acc, stat) => {
        acc[stat.deviceType || 'unknown'] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);
    } catch (error) {
      console.error('FCM 토큰 통계 조회 실패:', error);
      return {};
    }
  }
} 