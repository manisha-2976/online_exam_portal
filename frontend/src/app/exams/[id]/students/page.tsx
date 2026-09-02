'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { examApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function ManageStudents() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'faculty' && user?.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'Only faculty and admins can manage student registrations',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }

    // Remove all code related to managing students for exams, including:
    // - RegisteredStudent and AvailableStudent interfaces
    // - useState and useEffect for students
    // - fetchStudents, fetchAvailableStudents, handleAddSelectedStudents, handleAddStudent, handleRemoveStudent
    // - All UI for adding/removing/selecting students
    // Replace with a message: 'All registered students can access this exam once it is published.'
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* All registered students can access this exam once it is published. */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}