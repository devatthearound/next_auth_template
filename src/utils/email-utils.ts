// src/utils/email-utils.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Create a test account if SMTP settings are not configured
// In production, use environment variables for SMTP settings
let transporter: nodemailer.Transporter;

// Initialize the email transporter
async function initializeTransporter() {
  // Check if SMTP settings are provided in environment variables
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    // Use provided SMTP settings
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else if (process.env.NODE_ENV !== 'production') {
    // In non-production environments, create a test account if no SMTP settings
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('Using Ethereal test account for email:', testAccount.user);
  } else {
    // In production, log an error if SMTP settings are missing
    console.error('SMTP settings not configured. Email functionality disabled.');
  }
}

// Make sure we have a transporter
async function ensureTransporter() {
  if (!transporter) {
    await initializeTransporter();
  }
}

// Send an email
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await ensureTransporter();
    
    if (!transporter) {
      console.error('Email transporter not available');
      return false;
    }
    
    const from = process.env.SMTP_FROM || 'noreply@example.com';
    
    const mailOptions = {
      from,
      ...options,
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    // Log email preview URL in development (Ethereal)
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      console.log('Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send a verification email
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify Your Email Address',
    text: `Please verify your email address by clicking the following link: ${verificationUrl}`,
    html: `
      <p>Hello,</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email Address</a></p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `,
  });
}

// Initialize the transporter on module load
initializeTransporter().catch(console.error);