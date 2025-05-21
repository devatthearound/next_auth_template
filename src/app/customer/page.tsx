'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function CustomerPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute allowedTypes={['CUSTOMER']}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Customer Area</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to the Customer Area!</h2>
          <p className="mb-2">This page is only accessible to users with the CUSTOMER role.</p>
          <p>If you were logged in as a business owner, you would not be able to see this page.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Orders</h2>
            <p className="italic text-gray-500">No orders yet. Start shopping!</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Favorite Businesses</h2>
            <p className="italic text-gray-500">You haven't added any businesses to your favorites yet.</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}