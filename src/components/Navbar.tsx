'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { isAuthenticated, user, logout, isCustomer, isOwner } = useAuth();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Auth Demo
        </Link>
        
        <div className="flex space-x-4">
          <Link href="/" className="hover:text-gray-300">
            Home
          </Link>
          <Link href="/public-page" className="hover:text-gray-300">
            Public Page
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="hover:text-gray-300">
                Dashboard
              </Link>
              
              <Link href="/activity" className="hover:text-gray-300">
                Activity History
              </Link>
              
              {isCustomer && (
                <Link href="/customer" className="hover:text-gray-300">
                  Customer Area
                </Link>
              )}
              
              {isOwner && (
                <Link href="/owner" className="hover:text-gray-300">
                  Owner Area
                </Link>
              )}
              
              <button
                onClick={logout}
                className="hover:text-gray-300"
              >
                Logout
              </button>
              
              <span className="bg-blue-600 px-2 py-1 rounded text-sm">
                {user?.name || user?.email || 'User'} ({user?.userType})
              </span>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-300">
                Login
              </Link>
              <Link href="/register" className="hover:text-gray-300">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}