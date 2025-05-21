'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.name || user?.email || 'User'}!</h2>
          <p>This page is accessible to all authenticated users (both customers and owners).</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">User ID:</p>
              <p className="text-gray-700">{user?.id}</p>
            </div>
            <div>
              <p className="font-semibold">User Type:</p>
              <p className="text-gray-700">{user?.userType}</p>
            </div>
            <div>
              <p className="font-semibold">Email:</p>
              <p className="text-gray-700">{user?.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Phone:</p>
              <p className="text-gray-700">{user?.phoneNumber || 'Not provided'}</p>
            </div>
            <div>
              <p className="font-semibold">Email Verified:</p>
              <p className="text-gray-700">{user?.isEmailVerified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="font-semibold">Phone Verified:</p>
              <p className="text-gray-700">{user?.isPhoneVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}