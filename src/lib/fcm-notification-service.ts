import admin from 'firebase-admin';
import { prisma } from './prisma';

// Firebase Admin 초기화
if (!admin.apps.length) {
  // 환경변수에서 Firebase 서비스 계정 키 읽기
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export interface NotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

export interface SendNotificationOptions {
  priority?: 'high' | 'normal';
  timeToLive?: number; // seconds
  collapseKey?: string;
  restrictedPackageName?: string;
}

class FCMNotificationService {
  private static instance: FCMNotificationService;

  private constructor() {}

  public static getInstance(): FCMNotificationService {
    if (!FCMNotificationService.instance) {
      FCMNotificationService.instance = new FCMNotificationService();
    }
    return FCMNotificationService.instance;
  }

  /**
   * 단일 FCM 토큰으로 알림 발송
   */
  async sendToToken(
    fcmToken: string,
    notification: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: options.priority === 'high' ? 'high' : 'normal',
          ttl: options.timeToLive ? options.timeToLive * 1000 : undefined,
          collapseKey: options.collapseKey,
          restrictedPackageName: options.restrictedPackageName,
          notification: {
            clickAction: notification.clickAction,
            channelId: 'default',
            priority: options.priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.imageUrl,
            click_action: notification.clickAction,
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('✅ FCM 메시지 발송 성공:', response);
      return true;
    } catch (error) {
      console.error('❌ FCM 메시지 발송 실패:', error);
      
      // 만료된 토큰인 경우 데이터베이스에서 제거
      if (this.isTokenExpired(error)) {
        await this.removeExpiredToken(fcmToken);
      }
      
      return false;
    }
  }

  /**
   * 여러 FCM 토큰으로 알림 발송
   */
  async sendToMultipleTokens(
    fcmTokens: string[],
    notification: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<{ successCount: number; failureCount: number; expiredTokens: string[] }> {
    if (fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0, expiredTokens: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        android: {
          priority: options.priority === 'high' ? 'high' : 'normal',
          ttl: options.timeToLive ? options.timeToLive * 1000 : undefined,
          collapseKey: options.collapseKey,
          restrictedPackageName: options.restrictedPackageName,
          notification: {
            clickAction: notification.clickAction,
            channelId: 'default',
            priority: options.priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.imageUrl,
            click_action: notification.clickAction,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // 만료된 토큰들 수집
      const expiredTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (!result.success && this.isTokenExpired(result.error)) {
          expiredTokens.push(fcmTokens[index]);
        }
      });

      // 만료된 토큰들 데이터베이스에서 제거
      if (expiredTokens.length > 0) {
        await this.removeMultipleExpiredTokens(expiredTokens);
      }

      console.log(`✅ FCM 멀티캐스트 발송 완료: 성공 ${response.successCount}, 실패 ${response.failureCount}`);
      
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        expiredTokens,
      };
    } catch (error) {
      console.error('❌ FCM 멀티캐스트 발송 실패:', error);
      return { successCount: 0, failureCount: fcmTokens.length, expiredTokens: [] };
    }
  }

  /**
   * 특정 사용자에게 알림 발송
   */
  async sendToUser(
    userId: string,
    notification: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<{ successCount: number; failureCount: number }> {
    try {
      // 사용자의 모든 FCM 토큰 조회
      const fcmTokens = await prisma.fcmToken.findMany({
        where: { 
          userId,
          isActive: true,
        },
        select: { token: true },
      });

      if (fcmTokens.length === 0) {
        console.log(`⚠️ 사용자 ${userId}의 활성 FCM 토큰이 없음`);
        return { successCount: 0, failureCount: 0 };
      }

      const tokens = fcmTokens.map(t => t.token);
      const result = await this.sendToMultipleTokens(tokens, notification, options);
      
      console.log(`📱 사용자 ${userId}에게 알림 발송: 성공 ${result.successCount}, 실패 ${result.failureCount}`);
      return { successCount: result.successCount, failureCount: result.failureCount };
    } catch (error) {
      console.error(`❌ 사용자 ${userId}에게 알림 발송 실패:`, error);
      return { successCount: 0, failureCount: 1 };
    }
  }

  /**
   * 모든 사용자에게 알림 발송 (브로드캐스트)
   */
  async sendToAllUsers(
    notification: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<{ successCount: number; failureCount: number; totalUsers: number }> {
    try {
      // 모든 활성 FCM 토큰 조회
      const fcmTokens = await prisma.fcmToken.findMany({
        where: { isActive: true },
        select: { token: true, userId: true },
      });

      if (fcmTokens.length === 0) {
        console.log('⚠️ 활성 FCM 토큰이 없음');
        return { successCount: 0, failureCount: 0, totalUsers: 0 };
      }

      // 사용자별로 그룹화
      const userGroups = new Map<string, string[]>();
      fcmTokens.forEach(tokenRecord => {
        if (!userGroups.has(tokenRecord.userId)) {
          userGroups.set(tokenRecord.userId, []);
        }
        userGroups.get(tokenRecord.userId)!.push(tokenRecord.token);
      });

      console.log(`📢 전체 알림 발송 시작: ${userGroups.size}명의 사용자, ${fcmTokens.length}개의 토큰`);

      let totalSuccess = 0;
      let totalFailure = 0;

      // 100개씩 배치로 나누어서 발송 (FCM 제한)
      const allTokens = fcmTokens.map(t => t.token);
      const batchSize = 100;
      
      for (let i = 0; i < allTokens.length; i += batchSize) {
        const batch = allTokens.slice(i, i + batchSize);
        const result = await this.sendToMultipleTokens(batch, notification, options);
        
        totalSuccess += result.successCount;
        totalFailure += result.failureCount;

        console.log(`📦 배치 ${Math.floor(i / batchSize) + 1} 완료: 성공 ${result.successCount}, 실패 ${result.failureCount}`);
        
        // 배치 간 딜레이 (Rate Limit 방지)
        if (i + batchSize < allTokens.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`🎯 전체 알림 발송 완료: 성공 ${totalSuccess}, 실패 ${totalFailure}`);
      
      return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        totalUsers: userGroups.size,
      };
    } catch (error) {
      console.error('❌ 전체 알림 발송 실패:', error);
      return { successCount: 0, failureCount: 1, totalUsers: 0 };
    }
  }

  /**
   * 특정 사용자 유형에게 알림 발송
   */
  async sendToUserType(
    userType: 'CUSTOMER' | 'OWNER',
    notification: NotificationPayload,
    options: SendNotificationOptions = {}
  ): Promise<{ successCount: number; failureCount: number; totalUsers: number }> {
    try {
      // 특정 사용자 유형의 활성 FCM 토큰 조회
      const fcmTokens = await prisma.fcmToken.findMany({
        where: { 
          isActive: true,
          user: {
            userType: userType,
          },
        },
        select: { token: true, userId: true },
      });

      if (fcmTokens.length === 0) {
        console.log(`⚠️ ${userType} 사용자의 활성 FCM 토큰이 없음`);
        return { successCount: 0, failureCount: 0, totalUsers: 0 };
      }

      const userGroups = new Map<string, string[]>();
      fcmTokens.forEach(tokenRecord => {
        if (!userGroups.has(tokenRecord.userId)) {
          userGroups.set(tokenRecord.userId, []);
        }
        userGroups.get(tokenRecord.userId)!.push(tokenRecord.token);
      });

      console.log(`📢 ${userType} 사용자 알림 발송 시작: ${userGroups.size}명의 사용자`);

      const allTokens = fcmTokens.map(t => t.token);
      const result = await this.sendToMultipleTokens(allTokens, notification, options);
      
      console.log(`🎯 ${userType} 사용자 알림 발송 완료: 성공 ${result.successCount}, 실패 ${result.failureCount}`);
      
      return {
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalUsers: userGroups.size,
      };
    } catch (error) {
      console.error(`❌ ${userType} 사용자 알림 발송 실패:`, error);
      return { successCount: 0, failureCount: 1, totalUsers: 0 };
    }
  }

  /**
   * 토큰 만료 여부 확인
   */
  private isTokenExpired(error: any): boolean {
    return (
      error?.code === 'messaging/registration-token-not-registered' ||
      error?.code === 'messaging/invalid-registration-token' ||
      error?.errorCode === 'UNREGISTERED'
    );
  }

  /**
   * 만료된 토큰 제거
   */
  private async removeExpiredToken(fcmToken: string): Promise<void> {
    try {
      await prisma.fcmToken.updateMany({
        where: { token: fcmToken },
        data: { isActive: false },
      });
      console.log(`🗑️ 만료된 FCM 토큰 비활성화: ${fcmToken.substring(0, 20)}...`);
    } catch (error) {
      console.error('❌ 만료된 토큰 제거 실패:', error);
    }
  }

  /**
   * 여러 만료된 토큰 제거
   */
  private async removeMultipleExpiredTokens(fcmTokens: string[]): Promise<void> {
    try {
      await prisma.fcmToken.updateMany({
        where: { token: { in: fcmTokens } },
        data: { isActive: false },
      });
      console.log(`🗑️ ${fcmTokens.length}개의 만료된 FCM 토큰 비활성화`);
    } catch (error) {
      console.error('❌ 만료된 토큰들 제거 실패:', error);
    }
  }

  /**
   * 알림 통계 조회
   */
  async getNotificationStats(): Promise<{
    totalActiveTokens: number;
    totalUsers: number;
    customerTokens: number;
    ownerTokens: number;
  }> {
    try {
      const [totalActiveTokens, totalUsers, customerTokens, ownerTokens] = await Promise.all([
        prisma.fcmToken.count({ where: { isActive: true } }),
        prisma.fcmToken.groupBy({
          by: ['userId'],
          where: { isActive: true },
        }).then(groups => groups.length),
        prisma.fcmToken.count({
          where: {
            isActive: true,
            user: { userType: 'CUSTOMER' },
          },
        }),
        prisma.fcmToken.count({
          where: {
            isActive: true,
            user: { userType: 'OWNER' },
          },
        }),
      ]);

      return {
        totalActiveTokens,
        totalUsers,
        customerTokens,
        ownerTokens,
      };
    } catch (error) {
      console.error('❌ 알림 통계 조회 실패:', error);
      return { totalActiveTokens: 0, totalUsers: 0, customerTokens: 0, ownerTokens: 0 };
    }
  }
}

export const fcmNotificationService = FCMNotificationService.getInstance(); 