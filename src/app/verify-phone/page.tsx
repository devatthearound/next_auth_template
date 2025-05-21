'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Link from 'next/link';

export default function VerifyPhonePage() {
  const { user, accessToken, refreshCsrfToken, requestPhoneVerification } = useAuth();
  const router = useRouter();
  
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Request new verification code
  const handleRequestCode = async () => {
    if (!user?.phoneNumber) {
      setError('No phone number associated with this account');
      return;
    }
    
    setError('');
    setSuccess('');
    setIsRequesting(true);
    
    try {
      const successful = await requestPhoneVerification();
      
      if (successful) {
        setSuccess('Verification code sent to your phone');
      } else {
        setError('Failed to send verification code');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };
  
  // Submit verification code
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }
    
    if (!accessToken) {
      setError('Authentication required');
      return;
    }
    
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    
    try {
      // Refresh CSRF token
      await refreshCsrfToken();
      
      // Get CSRF token from cookie
      const cookies = document.cookie.split(';');
      let csrfToken = '';
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'XSRF-TOKEN') {
          csrfToken = decodeURIComponent(value);
          break;
        }
      }
      
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      
      if (response.ok) {
        setSuccess('Phone number verified successfully');
        
        // Redirect to profile page after 2 seconds
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to verify phone number');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Verify Phone Number</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
            <p>{success}</p>
          </div>
        )}
        
        <div className="mb-6">
          <p className="mb-2">
            We've sent a 6-digit verification code to your phone number: 
            <span className="font-semibold"> {user?.phoneNumber}</span>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Enter the code below to verify your phone number.
          </p>
          
          <button
            onClick={handleRequestCode}
            className="text-blue-500 hover:text-blue-700 text-sm"
            disabled={isRequesting}
          >
            {isRequesting ? 'Sending...' : 'Request a new code'}
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="verificationCode" className="block text-gray-700 mb-2">Verification Code</label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={isSubmitting}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Verify Phone Number'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <Link href="/profile" className="text-blue-500 hover:text-blue-700">
            Back to Profile
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}