import { prisma } from './prisma';
import { PrismaClient } from '@prisma/client';

// 활동 로깅 함수
export async function logUserActivity(
  userId: string,
  activityCode: string,
  metadata: Record<string, any> = {},
  context: {
    ipAddress?: string;
    userAgent?: string;
    geoLocation?: string;
    status?: string;
  } = {}
) {
  try {
    // 활동 유형 찾기
    const activityType = await prisma.activityType.findUnique({
      where: { code: activityCode },
    });

    // 활동 유형이 없으면 생성 (첫 실행 시 필요)
    const activityTypeId = activityType?.id || (await createDefaultActivityType(activityCode)).id;

    // 활동 기록 생성
    return prisma.activity.create({
      data: {
        userId,
        activityTypeId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        geoLocation: context.geoLocation,
        status: context.status || 'SUCCESS',
        metadata,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // 오류가 발생해도 기본 기능에 영향을 주지 않음
    return null;
  }
}

// 기본 활동 유형 생성 (처음 실행 시 필요)
async function createDefaultActivityType(code: string) {
  const name = code.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return prisma.activityType.create({
    data: {
      code,
      name,
      category: getActivityCategory(code),
      importance: getActivityImportance(code),
      description: `${name} activity`,
    },
  });
}

// 활동 카테고리 결정
function getActivityCategory(code: string): string {
  if (code.startsWith('USER_')) return 'ACCOUNT';
  if (code.startsWith('CUSTOMER_')) return 'CUSTOMER';
  if (code.startsWith('OWNER_')) return 'BUSINESS';
  if (code.startsWith('TOKEN_')) return 'AUTHENTICATION';
  return 'OTHER';
}

// 활동 중요도 결정
function getActivityImportance(code: string): string {
  const highImportance = [
    'USER_REGISTER', 'USER_LOGIN', 'USER_LOGIN_FAILED', 
    'USER_PASSWORD_CHANGE', 'USER_DEACTIVATE'
  ];
  
  if (highImportance.includes(code)) return 'HIGH';
  return 'MEDIUM';
}

// 사용자 활동 이력 조회
export async function getUserActivities(userId: string, options: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  activityCodes?: string[];
} = {}) {
  const { limit = 10, offset = 0, startDate, endDate, activityCodes } = options;

  const where: any = { userId };

  // 날짜 범위 필터
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  // 활동 코드 필터
  if (activityCodes && activityCodes.length > 0) {
    where.activityType = {
      code: { in: activityCodes }
    };
  }

  // 활동 조회
  const activities = await prisma.activity.findMany({
    where,
    include: {
      activityType: true,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
    skip: offset,
  });

  // 총 개수 조회
  const total = await prisma.activity.count({ where });

  return {
    activities,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + activities.length < total,
    }
  };
}

// 활동 유형 초기화 (앱 시작 시 실행)
export async function initializeActivityTypes() {
  const defaultTypes = [
    // 공통 활동 유형
    { code: 'USER_REGISTER', name: 'User Register', category: 'ACCOUNT', importance: 'HIGH' },
    { code: 'USER_LOGIN', name: 'User Login', category: 'ACCOUNT', importance: 'HIGH' },
    { code: 'USER_LOGIN_FAILED', name: 'Login Failed', category: 'ACCOUNT', importance: 'HIGH' },
    { code: 'USER_LOGOUT', name: 'User Logout', category: 'ACCOUNT', importance: 'MEDIUM' },
    { code: 'USER_PASSWORD_CHANGE', name: 'Password Change', category: 'ACCOUNT', importance: 'HIGH' },
    { code: 'USER_PROFILE_UPDATE', name: 'Profile Update', category: 'ACCOUNT', importance: 'MEDIUM' },
    { code: 'USER_EMAIL_VERIFY', name: 'Email Verification', category: 'ACCOUNT', importance: 'MEDIUM' },
    { code: 'USER_PHONE_VERIFY', name: 'Phone Verification', category: 'ACCOUNT', importance: 'MEDIUM' },
    { code: 'USER_DEACTIVATE', name: 'Account Deactivate', category: 'ACCOUNT', importance: 'HIGH' },
    { code: 'TOKEN_REFRESH', name: 'Token Refresh', category: 'AUTHENTICATION', importance: 'LOW' },
    
    // 고객 활동 유형
    { code: 'CUSTOMER_ORDER_CREATE', name: 'Order Created', category: 'CUSTOMER', importance: 'MEDIUM' },
    { code: 'CUSTOMER_ORDER_CANCEL', name: 'Order Cancelled', category: 'CUSTOMER', importance: 'MEDIUM' },
    { code: 'CUSTOMER_PAYMENT_COMPLETE', name: 'Payment Completed', category: 'CUSTOMER', importance: 'HIGH' },
    { code: 'CUSTOMER_REVIEW_CREATE', name: 'Review Created', category: 'CUSTOMER', importance: 'MEDIUM' },
    
    // 사장님 활동 유형
    { code: 'OWNER_BUSINESS_UPDATE', name: 'Business Info Update', category: 'BUSINESS', importance: 'MEDIUM' },
    { code: 'OWNER_MENU_CREATE', name: 'Menu Created', category: 'BUSINESS', importance: 'MEDIUM' },
    { code: 'OWNER_MENU_UPDATE', name: 'Menu Updated', category: 'BUSINESS', importance: 'MEDIUM' },
    { code: 'OWNER_ORDER_ACCEPT', name: 'Order Accepted', category: 'BUSINESS', importance: 'MEDIUM' },
    { code: 'OWNER_ORDER_REJECT', name: 'Order Rejected', category: 'BUSINESS', importance: 'MEDIUM' },
  ];

  // 트랜잭션으로 한 번에 처리
  await prisma.$transaction(async (tx: PrismaClient) => {
    for (const type of defaultTypes) {
      // 존재하지 않는 경우에만 생성
      const exists = await tx.activityType.findUnique({
        where: { code: type.code },
      });
      
      if (!exists) {
        await tx.activityType.create({
          data: {
            ...type,
            description: `${type.name} activity`,
          },
        });
      }
    }
  });

  console.log('Activity types initialized');
}