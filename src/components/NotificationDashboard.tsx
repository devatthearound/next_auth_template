'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationStats {
  totalActiveTokens: number;
  totalUsers: number;
  customerTokens: number;
  ownerTokens: number;
}

interface NotificationForm {
  title: string;
  body: string;
  imageUrl?: string;
  clickAction?: string;
  targetType: 'single' | 'all' | 'userType';
  targetUserId?: string;
  targetUserType?: 'CUSTOMER' | 'OWNER';
  priority: 'high' | 'normal';
  timeToLive: number;
}

const NotificationDashboard: React.FC = () => {
  const { user, accessToken, isOwner, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    body: '',
    imageUrl: '',
    clickAction: '',
    targetType: 'all',
    targetUserId: '',
    targetUserType: 'CUSTOMER',
    priority: 'normal',
    timeToLive: 3600,
  });

  // 통계 조회
  const fetchStats = async () => {
    try {
      if (!accessToken) {
        console.error('액세스 토큰이 없습니다.');
        return;
      }

      const response = await fetch('/api/notifications/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        console.error('통계 조회 실패:', await response.text());
      }
    } catch (error) {
      console.error('통계 조회 오류:', error);
    }
  };

  // 테스트 알림 발송
  const sendTestNotification = async () => {
    if (!accessToken) {
      console.error('액세스 토큰이 없습니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('테스트 알림 오류:', error);
      setResult({ error: '테스트 알림 발송 실패' });
    }
    setLoading(false);
  };

  // 알림 발송
  const sendNotification = async () => {
    if (!accessToken) {
      console.error('액세스 토큰이 없습니다.');
      return;
    }

    setLoading(true);
    try {
      // 조건부로 필드 포함
      const payload: any = {
        title: form.title,
        body: form.body,
        targetType: form.targetType,
        priority: form.priority,
        timeToLive: form.timeToLive,
      };
      
      // 선택적 필드들 추가
      if (form.imageUrl) payload.imageUrl = form.imageUrl;
      if (form.clickAction) payload.clickAction = form.clickAction;
      if (form.targetType === 'single' && form.targetUserId) {
        payload.targetUserId = form.targetUserId;
      }
      if (form.targetType === 'userType' && form.targetUserType) {
        payload.targetUserType = form.targetUserType;
      }
      
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      setResult(data);
      
      // 성공 시 폼 초기화
      if (data.success) {
        setForm({
          ...form,
          title: '',
          body: '',
          imageUrl: '',
          clickAction: '',
          targetUserId: '',
        });
      }
    } catch (error) {
      console.error('알림 발송 오류:', error);
      setResult({ error: '알림 발송 실패' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated && isOwner && accessToken) {
      fetchStats();
    }
  }, [isAuthenticated, isOwner, accessToken]);

  // 권한 확인 - hook 호출 후에 처리
  if (!isAuthenticated || !isOwner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">접근 권한 없음</h2>
          <p className="text-red-600">
            {!isAuthenticated 
              ? '로그인이 필요합니다.' 
              : 'OWNER 권한이 필요합니다. 알림 관리는 사업자만 이용할 수 있습니다.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">🔔 알림 관리 대시보드</h1>
        <div className="text-sm text-gray-600">
          👤 {user?.name || '사용자'}님 ({user?.userType})
        </div>
      </div>
      
      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600">전체 활성 토큰</h3>
          <p className="text-2xl font-bold text-blue-900">{stats?.totalActiveTokens || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600">총 사용자</h3>
          <p className="text-2xl font-bold text-green-900">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-600">고객 토큰</h3>
          <p className="text-2xl font-bold text-purple-900">{stats?.customerTokens || 0}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-600">사업자 토큰</h3>
          <p className="text-2xl font-bold text-orange-900">{stats?.ownerTokens || 0}</p>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">빠른 액션</h2>
        <div className="flex gap-4">
          <button
            onClick={sendTestNotification}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '발송 중...' : '📱 테스트 알림 발송'}
          </button>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            🔄 통계 새로고침
          </button>
        </div>
      </div>

      {/* 알림 발송 폼 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">알림 발송</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 기본 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 제목"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as 'high' | 'normal' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">일반</option>
              <option value="high">높음</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용 *
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="알림 내용"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이미지 URL (선택)
            </label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              클릭 액션 (선택)
            </label>
            <input
              type="text"
              value={form.clickAction}
              onChange={(e) => setForm({ ...form, clickAction: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/dashboard"
            />
          </div>

          {/* 발송 대상 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              발송 대상
            </label>
            <select
              value={form.targetType}
              onChange={(e) => setForm({ ...form, targetType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 사용자</option>
              <option value="userType">사용자 유형별</option>
              <option value="single">특정 사용자</option>
            </select>
          </div>

          {form.targetType === 'userType' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 유형
              </label>
              <select
                value={form.targetUserType}
                onChange={(e) => setForm({ ...form, targetUserType: e.target.value as 'CUSTOMER' | 'OWNER' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CUSTOMER">고객</option>
                <option value="OWNER">사업자</option>
              </select>
            </div>
          )}

          {form.targetType === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사용자 ID
              </label>
              <input
                type="text"
                value={form.targetUserId}
                onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user_id_here"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              유효 시간 (초)
            </label>
            <input
              type="number"
              value={form.timeToLive}
              onChange={(e) => setForm({ ...form, timeToLive: parseInt(e.target.value) || 3600 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="2419200"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={sendNotification}
            disabled={loading || !form.title || !form.body}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '발송 중...' : '🚀 알림 발송'}
          </button>
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">발송 결과</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard; 