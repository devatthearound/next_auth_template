'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ProtectedRoute({
  children,
  allowedTypes,
}: {
  children: React.ReactNode;
  allowedTypes?: ('CUSTOMER' | 'OWNER')[];
}) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?callbackUrl=' + encodeURIComponent(window.location.pathname));
    } else if (
      !isLoading &&
      isAuthenticated &&
      allowedTypes &&
      user &&
      !allowedTypes.includes(user.userType)
    ) {
      router.push('/unauthorized');
    }
  }, [isAuthenticated, isLoading, router, user, allowedTypes]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedTypes && user && !allowedTypes.includes(user.userType)) {
    return null;
  }

  return <>{children}</>;
}