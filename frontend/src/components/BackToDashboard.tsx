'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './BackToDashboard.css';

export default function BackToDashboard() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleNavigation = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleNavigation}
      className="back-button"
    >
      <ArrowLeft className="back-icon" />
      Back to Dashboard
    </Button>
  );
} 