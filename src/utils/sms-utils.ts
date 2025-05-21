// src/utils/sms-utils.ts
// This is a simplified SMS implementation
// In production, use a proper SMS service like Twilio or AWS SNS

interface SmsOptions {
    to: string;
    message: string;
  }
  
  // Send an SMS
  export async function sendSms(options: SmsOptions): Promise<boolean> {
    try {
      // Check if SMS settings are configured
      if (
        !process.env.SMS_API_KEY ||
        !process.env.SMS_API_SECRET ||
        !process.env.SMS_FROM
      ) {
        if (process.env.NODE_ENV !== 'production') {
          // In development, just log the SMS
          console.log('SMS would be sent in production:');
          console.log(`To: ${options.to}`);
          console.log(`Message: ${options.message}`);
          return true;
        } else {
          // In production, log an error
          console.error('SMS settings not configured. SMS functionality disabled.');
          return false;
        }
      }
      
      // In a real implementation, use an SMS provider API
      // This is a placeholder for demonstration purposes
      
      // For example, with Twilio:
      /*
      const client = require('twilio')(
        process.env.SMS_API_KEY,
        process.env.SMS_API_SECRET
      );
      
      await client.messages.create({
        body: options.message,
        from: process.env.SMS_FROM,
        to: options.to,
      });
      */
      
      // For now, just log success
      console.log(`SMS sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }
  
  // Send a verification SMS
  export async function sendVerificationSms(phoneNumber: string, code: string): Promise<boolean> {
    return sendSms({
      to: phoneNumber,
      message: `Your verification code is: ${code}. This code will expire in 10 minutes.`,
    });
  }