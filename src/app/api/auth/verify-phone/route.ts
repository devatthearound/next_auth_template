// src/app/api/auth/verify-phone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPhoneToken } from '@/lib/tokens';
import { logUserActivity } from '@/lib/activity';
import { getUserIdFromRequest } from '@/utils/request-utils';

// Verification code schema
const verificationSchema = z.object({
  code: z.string().length(6, { message: "Verification code must be 6 digits" }),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = verificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    const { code } = validationResult.data;
    
    // Verify phone token
    const verifiedUserId = await verifyPhoneToken(code);
    
    if (!verifiedUserId || verifiedUserId !== userId) {
      return NextResponse.json({ 
        error: "Invalid or expired verification code" 
      }, { status: 401 });
    }
    
    // Update user's phone verification status
    await prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true }
    });
    
    // Log activity
    await logUserActivity(
      userId,
      'PHONE_VERIFIED',
      {},
      { 
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    );
    
    return NextResponse.json({ 
      message: "Phone number verified successfully" 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json({ 
      error: "Failed to verify phone number" 
    }, { status: 500 });
  }
}