import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
        router.push('/unauthorized');
      }
    }
  }, [loading, isAuthenticated, user?.role, allowedRoles, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || (allowedRoles && !allowedRoles.includes(user?.role || ''))) {
    return null;
  }

  return <>{children}</>;
} 