'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';

interface Submission {
  _id: string;
  challenge: {
    _id: string;
    title: string;
  };
  user: {
    _id: string;
    name: string;
  };
  code: string;
  language: string;
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit' | 'memory_limit' | 'runtime_error';
  result: {
    passed: boolean;
    testCasesPassed: number;
    totalTestCases: number;
    executionTime: number;
    memoryUsed: number;
  };
  createdAt: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchSubmissions();
  }, [isAuthenticated]);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/submissions${user?.role === 'student' ? '/my' : ''}`, {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('=')[1]}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load submissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'wrong_answer':
        return 'bg-red-100 text-red-800';
      case 'time_limit':
      case 'memory_limit':
        return 'bg-yellow-100 text-yellow-800';
      case 'runtime_error':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />
      <Card>
        <CardHeader>
          <CardTitle>Challenge Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Card key={submission._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {submission.challenge.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        by {submission.user.name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Language:</strong> {submission.language}</p>
                      <p><strong>Submitted:</strong> {formatDate(submission.createdAt)}</p>
                    </div>
                    <div>
                      <p>
                        <strong>Test Cases:</strong>{' '}
                        {submission.result.testCasesPassed}/{submission.result.totalTestCases} passed
                      </p>
                      <p><strong>Execution Time:</strong> {submission.result.executionTime}ms</p>
                      <p><strong>Memory Used:</strong> {submission.result.memoryUsed}MB</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/challenges/${submission.challenge._id}/submissions/${submission._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {submissions.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900">No submissions yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {user?.role === 'student'
                    ? 'Try solving some challenges to see your submissions here!'
                    : 'No submissions have been made yet.'}
                </p>
                {user?.role === 'student' && (
                  <Button
                    className="mt-4"
                    onClick={() => router.push('/challenges')}
                  >
                    View Challenges
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 