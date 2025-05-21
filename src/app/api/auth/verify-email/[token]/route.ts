// src/app/api/auth/verify-email/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyEmailToken } from '@/lib/tokens';
import { logUserActivity } from '@/lib/activity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json({ 
        error: "Verification token is required" 
      }, { status: 400 });
    }
    
    // Verify email token
    const userId = await verifyEmailToken(token);
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Invalid or expired verification token" 
      }, { status: 401 });
    }
    
    // Update user's email verification status
    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true }
    });
    
    // Log activity
    await logUserActivity(
      userId,
      'EMAIL_VERIFIED',
      {},
      { 
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    );
    
    return NextResponse.json({ 
      message: "Email verified successfully",
      redirectUrl: "/login?verified=true" // Redirect URL for client-side handling
    }, { status: 200 });
    
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ 
      error: "Failed to verify email" 
    }, { status: 500 });
  }
}