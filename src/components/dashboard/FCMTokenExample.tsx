'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function FCMTokenExample() {
  const { saveFcmToken, clearFcmToken, getFcmTokens, isWebView, isMobile } = useAuth();
  const [fcmTokens, setFcmTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testToken, setTestToken] = useState('');

  // FCM 토큰 목록 로드
  const loadFcmTokens = async () => {
    setIsLoading(true);
    try {
      const tokens = await getFcmTokens();
      setFcmTokens(tokens);
    } catch (error) {
      console.error('FCM 토큰 목록 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 토큰 목록 로드
  useEffect(() => {
    loadFcmTokens();
  }, []);

  // 테스트 FCM 토큰 저장
  const handleSaveTestToken = async () => {
    if (!testToken.trim()) {
      alert('테스트 토큰을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await saveFcmToken(testToken.trim(), {
        deviceId: 'test-device-' + Date.now(),
        deviceType: isWebView ? (isMobile ? 'android' : 'web') : 'web',
        deviceInfo: navigator.userAgent,
        appVersion: '1.0.0'
      });

      if (success) {
        alert('FCM 토큰이 성공적으로 저장되었습니다!');
        setTestToken('');
        await loadFcmTokens();
      } else {
        alert('FCM 토큰 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('FCM 토큰 저장 실패:', error);
      alert('FCM 토큰 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // FCM 토큰 전체 삭제
  const handleClearTokens = async () => {
    if (!confirm('모든 FCM 토큰을 삭제하시겠습니까?')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await clearFcmToken();
      if (success) {
        alert('FCM 토큰이 성공적으로 삭제되었습니다!');
        await loadFcmTokens();
      } else {
        alert('FCM 토큰 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('FCM 토큰 삭제 실패:', error);
      alert('FCM 토큰 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 웹에서 FCM 토큰 생성 시뮬레이션 (실제 환경에서는 Firebase SDK 사용)
  const generateMockFcmToken = () => {
    const mockToken = 'fcm_' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    setTestToken(mockToken);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        FCM 토큰 관리 
        {isWebView && <span className="text-sm text-blue-600 ml-2">(WebView 환경)</span>}
        {isMobile && !isWebView && <span className="text-sm text-green-600 ml-2">(모바일 브라우저)</span>}
      </h2>

      {/* 환경 정보 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">현재 환경</h3>
        <div className="text-sm text-gray-600">
          <p>WebView: {isWebView ? '예' : '아니오'}</p>
          <p>모바일: {isMobile ? '예' : '아니오'}</p>
          <p>User Agent: {navigator.userAgent}</p>
        </div>
      </div>

      {/* FCM 토큰 저장 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">FCM 토큰 저장</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
            placeholder="FCM 토큰 입력 또는 mock 토큰 생성"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={generateMockFcmToken}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Mock 생성
          </button>
        </div>
        <button
          onClick={handleSaveTestToken}
          disabled={isLoading || !testToken.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '저장 중...' : 'FCM 토큰 저장'}
        </button>
      </div>

      {/* 저장된 FCM 토큰 목록 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-700">
            저장된 FCM 토큰 ({fcmTokens.length}개)
          </h3>
          <button
            onClick={loadFcmTokens}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:bg-gray-400 transition-colors"
          >
            새로고침
          </button>
        </div>
        
        {fcmTokens.length > 0 ? (
          <div className="space-y-2">
            {fcmTokens.map((token, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded border text-sm font-mono text-gray-700 break-all"
              >
                {token}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">저장된 FCM 토큰이 없습니다.</p>
        )}
      </div>

      {/* FCM 토큰 삭제 */}
      <div>
        <button
          onClick={handleClearTokens}
          disabled={isLoading || fcmTokens.length === 0}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '삭제 중...' : '모든 FCM 토큰 삭제'}
        </button>
      </div>

      {/* 사용 가이드 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">사용 가이드</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• WebView 환경에서는 React Native 앱에서 FCM 토큰이 자동으로 전송됩니다.</p>
          <p>• 웹 브라우저에서는 Firebase SDK를 통해 FCM 토큰을 생성해야 합니다.</p>
          <p>• Mock 토큰 생성 버튼으로 테스트용 토큰을 만들 수 있습니다.</p>
          <p>• 토큰은 디바이스별로 고유하며, 푸시 알림 전송에 사용됩니다.</p>
        </div>
      </div>
    </div>
  );
} 