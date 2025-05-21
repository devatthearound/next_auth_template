// src/app/api/auth/request-email-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmailVerificationToken, storeEmailVerificationToken } from '@/lib/tokens';
import { sendVerificationEmail } from '@/utils/email-utils';
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
    
    if (!user.email) {
      return NextResponse.json({ 
        error: "No email address associated with this account" 
      }, { status: 400 });
    }
    
    if (user.isEmailVerified) {
      return NextResponse.json({ 
        error: "Email is already verified" 
      }, { status: 400 });
    }
    
    // Generate verification token
    const verificationToken = await generateEmailVerificationToken();
    
    // Store token
    await storeEmailVerificationToken(userId, verificationToken);
    
    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, verificationToken);
    
    if (!emailSent) {
      return NextResponse.json({ 
        error: "Failed to send verification email" 
      }, { status: 500 });
    }
    
    // Log activity
    await logUserActivity(
      userId,
      'EMAIL_VERIFICATION_REQUESTED',
      { email: user.email },
      { ipAddress: request.headers.get('x-forwarded-for') || 'unknown' }
    );
    
    return NextResponse.json({ 
      message: "Verification email sent successfully" 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Email verification request error:', error);
    return NextResponse.json({ 
      error: "Failed to send verification email" 
    }, { status: 500 });
  }
}