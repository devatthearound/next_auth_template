'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ProfilePage() {
  const { user, accessToken, isLoading, refreshCsrfToken, requestEmailVerification, requestPhoneVerification } = useAuth();
  
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  
  // Initialize form with current user data
  const initializeForm = () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
    }
  };
  
  // Enter edit mode
  const handleEditClick = () => {
    initializeForm();
    setEditMode(true);
  };
  
  // Cancel editing
  const handleCancelClick = () => {
    setEditMode(false);
    setError('');
    setSuccess('');
  };
  
  // Update profile
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!accessToken) return;
    
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
      
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          name,
          email,
          phoneNumber,
        }),
      });
      
      if (response.ok) {
        setSuccess('Profile updated successfully');
        setEditMode(false);
        
        // If email/phone changed, they will need to be verified again
        setTimeout(() => {
          window.location.reload(); // Refresh to update user data
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Request email verification
  const handleRequestEmailVerification = async () => {
    setError('');
    setSuccess('');
    setIsRequestingVerification(true);
    
    try {
      const success = await requestEmailVerification();
      
      if (success) {
        setSuccess('Verification email sent. Please check your inbox.');
      } else {
        setError('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsRequestingVerification(false);
    }
  };
  
  // Request phone verification
  const handleRequestPhoneVerification = async () => {
    setError('');
    setSuccess('');
    setIsRequestingVerification(true);
    
    try {
      const success = await requestPhoneVerification();
      
      if (success) {
        setSuccess('Verification code sent to your phone.');
      } else {
        setError('Failed to send verification code. Please try again.');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsRequestingVerification(false);
    }
  };
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
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
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            {editMode ? (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-700 mb-2">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Your email address"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Changing your email will require verification.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="phoneNumber" className="block text-gray-700 mb-2">Phone Number</label>
                    <input
                      id="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Your phone number"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Changing your phone number will require verification.
                    </p>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold">Name:</p>
                      <p className="text-gray-700">{user?.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="font-semibold">User Type:</p>
                      <p className="text-gray-700">{user?.userType}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Email:</p>
                        <p className="text-gray-700">{user?.email || 'Not provided'}</p>
                      </div>
                      <div>
                        {user?.email && (
                          user?.isEmailVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Not Verified
                              </span>
                              <button
                                onClick={handleRequestEmailVerification}
                                className="text-sm text-blue-500 hover:text-blue-700"
                                disabled={isRequestingVerification}
                              >
                                {isRequestingVerification ? 'Sending...' : 'Request Verification'}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Phone:</p>
                        <p className="text-gray-700">{user?.phoneNumber || 'Not provided'}</p>
                      </div>
                      <div>
                        {user?.phoneNumber && (
                          user?.isPhoneVerified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Verified
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Not Verified
                              </span>
                              <button
                                onClick={handleRequestPhoneVerification}
                                className="text-sm text-blue-500 hover:text-blue-700"
                                disabled={isRequestingVerification}
                              >
                                {isRequestingVerification ? 'Sending...' : 'Request Verification'}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleEditClick}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* For phone verification code entry */}
        {user?.phoneNumber && !user?.isPhoneVerified && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Phone Verification</h2>
            <p className="mb-4">If you've requested a phone verification code, enter it below:</p>
            
            <div className="flex space-x-4">
              <input
                type="text"
                maxLength={6}
                className="p-2 border border-gray-300 rounded"
                placeholder="Enter 6-digit code"
              />
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Verify Phone
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}