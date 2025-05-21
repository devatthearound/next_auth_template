'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function OwnerPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute allowedTypes={['OWNER']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Business Owner Area</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Owner Dashboard!</h2>
          <p className="mb-2">This page is only accessible to users with the OWNER role.</p>
          <p>If you were logged in as a customer, you would not be able to see this page.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Business Management</h2>
            <ul className="list-disc pl-5">
              <li>Update your business profile</li>
              <li>Manage products or services</li>
              <li>Set business hours</li>
              <li>View analytics</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Orders Management</h2>
            <p className="italic text-gray-500">No pending orders at the moment.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}