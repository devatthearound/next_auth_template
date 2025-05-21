// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateResetToken, storeResetToken, verifyResetToken } from '@/lib/tokens';
import { sendEmail } from '@/utils/email-utils';
import { logUserActivity } from '@/lib/activity';

// Request schema for initiating password reset
const resetRequestSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Request schema for completing password reset
const resetCompleteSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

// Endpoint to request a password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = resetRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    const { email } = validationResult.data;
    
    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { 
        email,
        isActive: true 
      },
    });
    
    // For security reasons, always return success even if email doesn't exist
    if (!user) {
      return NextResponse.json({ 
        message: "If your email is in our system, you will receive a password reset link" 
      }, { status: 200 });
    }
    
    // Generate reset token
    const resetToken = await generateResetToken();
    
    // Store token with expiry
    await storeResetToken(user.id, resetToken);
    
    // Log activity
    await logUserActivity(
      user.id,
      'PASSWORD_RESET_REQUESTED',
      { email: user.email },
      { ipAddress: request.headers.get('x-forwarded-for') || 'unknown' }
    );
    
    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      text: `Click the following link to reset your password: ${resetUrl}`,
      html: `
        <p>Hello,</p>
        <p>Someone requested a password reset for your account.</p>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 30 minutes.</p>
      `,
    });
    
    return NextResponse.json({ 
      message: "If your email is in our system, you will receive a password reset link" 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ 
      error: "Failed to process password reset request" 
    }, { status: 500 });
  }
}

// PUT endpoint to complete the password reset
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = resetCompleteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: validationResult.error.format() 
      }, { status: 400 });
    }
    
    const { token, password } = validationResult.data;
    
    // Verify the token
    const userId = await verifyResetToken(token);
    if (!userId) {
      return NextResponse.json({ 
        error: "Invalid or expired token" 
      }, { status: 401 });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(password);
    
    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        refreshToken: null // Invalidate all existing sessions
      },
    });
    
    // Log activity
    await logUserActivity(
      userId,
      'PASSWORD_RESET_COMPLETED',
      {},
      { ipAddress: request.headers.get('x-forwarded-for') || 'unknown' }
    );
    
    return NextResponse.json({ 
      message: "Password has been reset successfully" 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Password reset completion error:', error);
    return NextResponse.json({ 
      error: "Failed to reset password" 
    }, { status: 500 });
  }
}