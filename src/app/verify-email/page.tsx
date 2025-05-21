'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

enum VerificationStatus {
  VERIFYING = 'verifying',
  SUCCESS = 'success',
  ERROR = 'error',
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<VerificationStatus>(VerificationStatus.VERIFYING);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setStatus(VerificationStatus.ERROR);
      setError('Verification token is missing');
    }
  }, [token]);
  
  // Verify email token
  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email/${token}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        setStatus(VerificationStatus.SUCCESS);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);
      } else {
        const data = await response.json();
        setStatus(VerificationStatus.ERROR);
        setError(data.error || 'Email verification failed');
      }
    } catch (error) {
      setStatus(VerificationStatus.ERROR);
      setError('An error occurred during verification');
    }
  };
  
  // Render based on verification status
  const renderContent = () => {
    switch (status) {
      case VerificationStatus.VERIFYING:
        return (
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4">Verifying your email address...</p>
          </div>
        );
        
      case VerificationStatus.SUCCESS:
        return (
          <div className="text-center">
            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-4">
              Your email has been successfully verified.
            </p>
            <p className="text-gray-600">
              Redirecting to login page in a few seconds...
            </p>
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Log In Now
              </Link>
            </div>
          </div>
        );
        
      case VerificationStatus.ERROR:
        return (
          <div className="text-center">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-4">
              {error || 'We could not verify your email address.'}
            </p>
            <p className="text-gray-600 mb-4">
              The link may have expired or is invalid.
            </p>
            <div className="mt-4 space-x-4">
              <Link
                href="/login"
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Log In
              </Link>
              <Link
                href="/"
                className="inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
              >
                Go Home
              </Link>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Email Verification</h1>
      {renderContent()}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailContent />
    </Suspense>
  );
}