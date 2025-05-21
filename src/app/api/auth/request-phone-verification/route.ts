// src/app/api/auth/request-phone-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePhoneVerificationToken, storePhoneVerificationToken } from '@/lib/tokens';
import { sendVerificationSms } from '@/utils/sms-utils';
import { logUserActivity } from '@/lib/activity';
import { getUserIdFromRequest } from '@/utils/request-utils';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found" 
      }, { status: 404 });
    }
    
    if (!user.phoneNumber) {
      return NextResponse.json({ 
        error: "No phone number associated with this account" 
      }, { status: 400 });
    }
    
    if (user.isPhoneVerified) {
      return NextResponse.json({ 
        error: "Phone number is already verified" 
      }, { status: 400 });
    }
    
    // Generate verification code
    const verificationCode = generatePhoneVerificationToken();
    
    // Store code
    await storePhoneVerificationToken(userId, verificationCode);
    
    // Send verification SMS
    const smsSent = await sendVerificationSms(user.phoneNumber, verificationCode);
    
    if (!smsSent) {
      return NextResponse.json({ 
        error: "Failed to send verification code" 
      }, { status: 500 });
    }
    
    // Log activity
    await logUserActivity(
      userId,
      'PHONE_VERIFICATION_REQUESTED',
      { phoneNumber: user.phoneNumber },
      { ipAddress: request.headers.get('x-forwarded-for') || 'unknown' }
    );
    
    return NextResponse.json({ 
      message: "Verification code sent successfully" 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Phone verification request error:', error);
    return NextResponse.json({ 
      error: "Failed to send verification code" 
    }, { status: 500 });
  }
}