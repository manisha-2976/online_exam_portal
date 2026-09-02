'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { fetchApi } from '@/lib/api';

interface TestCase {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: 'passed' | 'failed' | 'error';
  executionTime: number;
  memoryUsed: number;
}

interface Submission {
  _id: string;
  challenge: string;
  user: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result: 'accepted' | 'wrong_answer' | 'time_limit' | 'memory_limit' | 'runtime_error' | 'compilation_error';
  executionTime: number;
  memoryUsed: number;
  testCases: TestCase[];
  errorMessage: string | null;
  createdAt: string;
}

export default function SubmissionsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') {
      toast.error('Invalid challenge ID');
      return;
    }
    fetchSubmissions();
  }, [id]);

  const fetchSubmissions = async () => {
    try {
      if (!id || typeof id !== 'string') {
        toast.error('Invalid challenge ID');
        return;
      }
      const data = await fetchApi(`api/challenges/${id}/submissions`);
      setSubmissions(data);
    } catch (error) {
      toast.error('Failed to load submissions');
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'wrong_answer':
        return 'bg-red-100 text-red-800';
      case 'time_limit':
        return 'bg-yellow-100 text-yellow-800';
      case 'memory_limit':
        return 'bg-orange-100 text-orange-800';
      case 'runtime_error':
      case 'compilation_error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Submissions</h1>

      <div className="space-y-6">
        {submissions.map((submission) => (
          <Card key={submission._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Submission {submission._id.slice(-6)}</CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(submission.createdAt)}
                  </CardDescription>
                </div>
                <Badge className={getResultColor(submission.result)}>
                  {submission.result.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Language:</span>
                    <span className="ml-2">{submission.language}</span>
                  </div>
                  <div>
                    <span className="font-medium">Execution Time:</span>
                    <span className="ml-2">{submission.executionTime}ms</span>
                  </div>
                  <div>
                    <span className="font-medium">Memory Used:</span>
                    <span className="ml-2">{submission.memoryUsed}MB</span>
                  </div>
                </div>

                {submission.errorMessage && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-medium text-red-800 mb-2">Error Message:</h3>
                    <pre className="text-red-600 whitespace-pre-wrap">{submission.errorMessage}</pre>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-2">Test Cases:</h3>
                  <div className="space-y-4">
                    {submission.testCases.map((testCase, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">Test Case {index + 1}</span>
                          <Badge
                            className={
                              testCase.status === 'passed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {testCase.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Input:</span>
                            <pre className="mt-1 bg-gray-50 p-2 rounded">{testCase.input}</pre>
                          </div>
                          <div>
                            <span className="font-medium">Expected Output:</span>
                            <pre className="mt-1 bg-gray-50 p-2 rounded">{testCase.expectedOutput}</pre>
                          </div>
                          <div>
                            <span className="font-medium">Your Output:</span>
                            <pre className="mt-1 bg-gray-50 p-2 rounded">{testCase.actualOutput}</pre>
                          </div>
                          <div>
                            <span className="font-medium">Performance:</span>
                            <div className="mt-1 text-sm">
                              <div>Time: {testCase.executionTime}ms</div>
                              <div>Memory: {testCase.memoryUsed}MB</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {submissions.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">No submissions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Submit your solution to see the results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}