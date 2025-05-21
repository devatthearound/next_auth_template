import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { JwtPayload, signAccessToken, signRefreshToken, verifyToken } from './jwt';
import { logUserActivity } from './activity';
import { User, UserType } from '@/generated/prisma';

// 비밀번호 해싱
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// 비밀번호 비교
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// 사용자 등록 (이메일 또는 전화번호로)
export async function registerUser(data: { 
  email?: string;
  phoneNumber?: string;
  password: string;
  name?: string;
  userType: UserType;
  // 고객 데이터
  customer?: {
    address?: string;
    preferences?: Record<string, any>;
  };
  // 사장님 데이터
  owner?: {
    businessName?: string;
    businessNumber?: string;
    businessAddress?: string;
  };
}, context?: any): Promise<User> {
  // 이메일이나 전화번호 중 하나는 반드시 있어야 함
  if (!data.email && !data.phoneNumber) {
    throw new Error('Email or phone number is required');
  }

  // 사장님인 경우 필수 정보 확인
  if (data.userType === 'OWNER' && (!data.owner?.businessName)) {
    throw new Error('Business name is required for owner accounts');
  }

  const hashedPassword = await hashPassword(data.password);

  // 트랜잭션으로 사용자와 역할별 데이터를 함께 생성
  const user = await prisma.$transaction(async (tx) => {
    // 기본 사용자 생성
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        name: data.name,
        userType: data.userType,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });

    // 사용자 유형에 따른 추가 정보 생성
    if (data.userType === 'CUSTOMER' && data.customer) {
      await tx.customer.create({
        data: {
          userId: newUser.id,
          address: data.customer.address,
          preferences: data.customer.preferences || {},
        },
      });
    } else if (data.userType === 'OWNER' && data.owner) {
      await tx.owner.create({
        data: {
          userId: newUser.id,
          businessName: data.owner.businessName!,
          businessNumber: data.owner.businessNumber,
          businessAddress: data.owner.businessAddress,
        },
      });
    }

    return newUser;
  });

  // 활동 로그 기록
  await logUserActivity(
    user.id, 
    'USER_REGISTER', 
    { userType: data.userType }, 
    context
  );

  return user;
}

// 로그인 (이메일 또는 전화번호로)
export async function loginUser(credentials: {
  email?: string;
  phoneNumber?: string;
  password: string;
}, context?: any): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
  if (!credentials.email && !credentials.phoneNumber) {
    throw new Error('Email or phone number is required');
  }

  // 이메일 또는 전화번호로 사용자 찾기
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [
        { email: credentials.email || null },
        { phoneNumber: credentials.phoneNumber || null },
      ],
    },
    include: {
      customer: true,
      owner: true,
    }
  });

  if (!user) {
    // 로그인 실패 로그
    if (credentials.email || credentials.phoneNumber) {
      await logUserActivity(
        'unknown', 
        'USER_LOGIN_FAILED', 
        { 
          reason: 'User not found',
          email: credentials.email,
          phoneNumber: credentials.phoneNumber 
        }, 
        { ...context, status: 'FAILED' }
      );
    }
    return null;
  }

  // 비밀번호 확인
  const passwordValid = await comparePasswords(credentials.password, user.password);
  if (!passwordValid) {
    // 비밀번호 실패 로그
    await logUserActivity(
      user.id, 
      'USER_LOGIN_FAILED', 
      { reason: 'Invalid password' }, 
      { ...context, status: 'FAILED' }
    );
    return null;
  }

  // 토큰 생성
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email || undefined,
    phoneNumber: user.phoneNumber || undefined,
    userType: user.userType,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
  };

  const accessToken = await signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  // 리프레시 토큰 저장
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      deviceInfo: context?.userAgent,
      ipAddress: context?.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
    },
  });

  // 로그인 성공 로그
  await logUserActivity(
    user.id, 
    'USER_LOGIN', 
    { userType: user.userType }, 
    context
  );

  return { user, accessToken, refreshToken };
}

// 토큰으로 사용자 정보 가져오기
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  return prisma.user.findFirst({
    where: {
      id: payload.userId,
      isActive: true,
    },
    include: {
      customer: true,
      owner: true,
    }
  });
}

// 토큰 갱신
export async function refreshAccessToken(token: string, context?: any): Promise<string | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;

  // 리프레시 토큰 찾기
  const refreshToken = await prisma.refreshToken.findFirst({
    where: { 
      token,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        where: { isActive: true }
      }
    }
  });

  if (!refreshToken || !refreshToken.user) return null;

  // 리프레시 토큰 사용 시간 업데이트
  await prisma.refreshToken.update({
    where: { id: refreshToken.id },
    data: { lastUsedAt: new Date() }
  });

  const newPayload: JwtPayload = {
    userId: refreshToken.user.id,
    email: refreshToken.user.email || undefined,
    phoneNumber: refreshToken.user.phoneNumber || undefined,
    userType: refreshToken.user.userType,
    isEmailVerified: refreshToken.user.isEmailVerified,
    isPhoneVerified: refreshToken.user.isPhoneVerified,
  };

  // 토큰 갱신 로그
  await logUserActivity(
    refreshToken.user.id, 
    'TOKEN_REFRESH', 
    {}, 
    context
  );

  return await signAccessToken(newPayload);
}

// 로그아웃
export async function logoutUser(userId: string, refreshToken: string, context?: any): Promise<boolean> {
  try {
    // 특정 리프레시 토큰 삭제
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken
      }
    });

    // 로그아웃 로그
    await logUserActivity(
      userId, 
      'USER_LOGOUT', 
      {}, 
      context
    );

    return true;
  } catch (error) {
    return false;
  }
}

// 모든 디바이스 로그아웃
export async function logoutAllDevices(userId: string, context?: any): Promise<boolean> {
  try {
    // 사용자의 모든 리프레시 토큰 삭제
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    // 로그아웃 로그
    await logUserActivity(
      userId, 
      'USER_LOGOUT_ALL', 
      {}, 
      context
    );

    return true;
  } catch (error) {
    return false;
  }
}

// 계정 비활성화 (탈퇴)
export async function deactivateUser(userId: string, context?: any): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        refreshToken: null,
      },
    });

    // 계정 비활성화 로그
    await logUserActivity(
      userId, 
      'USER_DEACTIVATE', 
      {}, 
      context
    );

    return true;
  } catch (error) {
    return false;
  }
}