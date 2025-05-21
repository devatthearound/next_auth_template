'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Activity {
  id: string;
  timestamp: string;
  activityType: {
    code: string;
    name: string;
    category: string;
  };
  status: string;
  ipAddress: string;
  userAgent: string;
  metadata: any;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function ActivityHistoryPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  });
  
  const fetchActivities = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/user/activities?limit=${pagination.limit}&offset=${pagination.offset}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(prev => 
        pagination.offset === 0 ? data.activities : [...prev, ...data.activities]
      );
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load activity history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchActivities();
    }
  }, [isAuthenticated, pagination.offset, accessToken]);
  
  const loadMore = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit,
    }));
  };
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Activity History</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No activities recorded yet.
                  </td>
                </tr>
              ) : (
                activities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {activity.activityType.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {activity.activityType.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(activity.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.status === 'SUCCESS' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {activity.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.ipAddress || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {loading && (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {pagination.hasMore && !loading && (
            <div className="p-4 text-center">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}