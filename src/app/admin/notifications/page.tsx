import { Metadata } from 'next';
import NotificationDashboard from '@/components/NotificationDashboard';

export const metadata: Metadata = {
  title: '알림 관리 | 관리자',
  description: 'FCM 푸시 알림을 관리하고 발송할 수 있는 관리자 대시보드',
};

export default function AdminNotificationsPage() {
  return <NotificationDashboard />;
} 