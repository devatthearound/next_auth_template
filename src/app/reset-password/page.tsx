'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

enum ResetStage {
  REQUEST = 'request',
  CONFIRMATION = 'confirmation',
  NEW_PASSWORD = 'new_password',
  SUCCESS = 'success',
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Determine the current stage
  const [stage, setStage] = useState<ResetStage>(
    token ? ResetStage.NEW_PASSWORD : ResetStage.REQUEST
  );
  
  // Request password reset (send email)
  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setStage(ResetStage.CONFIRMATION);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to request password reset');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Submit new password
  const handleSetNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });
      
      if (response.ok) {
        setStage(ResetStage.SUCCESS);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render different content based on the current stage
  const renderStageContent = () => {
    switch (stage) {
      case ResetStage.REQUEST:
        return (
          <form onSubmit={handleRequestReset}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Reset Password'}
            </button>
          </form>
        );
        
      case ResetStage.CONFIRMATION:
        return (
          <div>
            <p className="mb-4">
              If your email is in our system, we've sent you instructions to reset your password.
              Please check your inbox and spam folders.
            </p>
            <p className="mb-4">
              The password reset link will expire in 30 minutes.
            </p>
            <Link href="/login" className="text-blue-500 hover:text-blue-700">
              Return to login
            </Link>
          </div>
        );
        
      case ResetStage.NEW_PASSWORD:
        return (
          <form onSubmit={handleSetNewPassword}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 mb-2">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-gray-700 mb-2">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Set New Password'}
            </button>
          </form>
        );
        
      case ResetStage.SUCCESS:
        return (
          <div>
            <div className="mb-4 text-center">
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
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-4">
                Your password has been successfully reset.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Log In with New Password
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Reset Password</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {renderStageContent()}
      
      {stage === ResetStage.REQUEST && (
        <div className="mt-4 text-center">
          <p>
            Remember your password?{' '}
            <Link href="/login" className="text-blue-500 hover:text-blue-700">
              Log In
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  );
}