'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HomePage() {
  const { isAuthenticated, isOwner, user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Welcome to Auth Demo App</h1>
      
      <p className="mb-4">
        This application demonstrates user authentication and role-based access control.
      </p>

      {isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800">
            안녕하세요, <strong>{user?.name || '사용자'}</strong>님! 
            ({user?.userType === 'CUSTOMER' ? '고객' : '사업자'})
          </p>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Features</h2>
          <ul className="list-disc pl-5">
            <li>User authentication (login & register)</li>
            <li>Role-based access control (Customer/Owner)</li>
            <li>Protected routes</li>
            <li>JWT token authentication</li>
            <li>User activity logging</li>
            <li>FCM 푸시 알림 시스템</li>
            <li>WebView 하이브리드 앱 지원</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Quick Links</h2>
          <div className="space-y-2">
            {!isAuthenticated ? (
              <>
                <Link href="/login" className="block text-blue-600 hover:text-blue-800">
                  🔐 로그인
                </Link>
                <Link href="/register" className="block text-blue-600 hover:text-blue-800">
                  📝 회원가입
                </Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="block text-blue-600 hover:text-blue-800">
                  📊 대시보드
                </Link>
                <Link href="/profile" className="block text-blue-600 hover:text-blue-800">
                  👤 프로필
                </Link>
                {user?.userType === 'CUSTOMER' && (
                  <Link href="/customer" className="block text-blue-600 hover:text-blue-800">
                    🛍️ 고객 전용 페이지
                  </Link>
                )}
                {isOwner && (
                  <>
                    <Link href="/owner" className="block text-blue-600 hover:text-blue-800">
                      🏢 사업자 전용 페이지
                    </Link>
                    <Link href="/admin/notifications" className="block text-green-600 hover:text-green-800 font-medium">
                      🔔 알림 관리 (관리자)
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-3">Test Pages</h2>
          <ul className="list-disc pl-5">
            <li><strong>Public Page</strong> - Anyone can access</li>
            <li><strong>Dashboard</strong> - Any authenticated user</li>
            <li><strong>Customer Area</strong> - Only customers</li>
            <li><strong>Owner Area</strong> - Only business owners</li>
            <li><strong>Admin Notifications</strong> - Only owners</li>
          </ul>
        </div>

        {isOwner && (
          <div className="bg-green-50 p-6 rounded-lg shadow-md border border-green-200">
            <h2 className="text-xl font-semibold mb-3 text-green-800">🔔 알림 관리</h2>
            <p className="text-green-700 mb-4">
              사업자 전용 FCM 푸시 알림 관리 시스템에 접근할 수 있습니다.
            </p>
            <Link 
              href="/admin/notifications" 
              className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              알림 관리 대시보드 열기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}