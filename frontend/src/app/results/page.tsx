
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { examApi } from '@/lib/api';

interface ExamResult {
  _id: string;

  exam: {
    _id: string;
    title: string;
    subject: string;
    totalMarks: number;
    passingPercentage?: number;
  };

  student: {
    _id: string;
    name: string;
    email: string;
  };

  score: number;
  totalMarks: number;
  percentage: number;
  status: 'passed' | 'failed';

  createdAt: string;
  updatedAt?: string;
}

export default function Results() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const data = await examApi.getResults();

      if (!Array.isArray(data)) {
        throw new Error('Invalid results response from server');
      }

      setResults(data);
    } catch (error: any) {
      console.error('Failed to fetch results:', error);

      toast({
        title: 'Error',
        description:
          error?.message || 'Failed to fetch exam results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6"
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {isStudent ? 'My Exam Results' : 'Exam Results'}
            </CardTitle>

            <p className="text-sm text-muted-foreground mt-1">
              {isStudent
                ? 'View your completed exam results'
                : 'View student examination results'}
            </p>
          </div>

          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardHeader>

        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {isStudent
                ? 'You have not completed any exams yet.'
                : 'No exam results are available.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>

                    {(isAdmin || isFaculty) && (
                      <TableHead>Student</TableHead>
                    )}

                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result._id}>
                      <TableCell className="font-medium">
                        {result.exam?.title || 'N/A'}
                      </TableCell>

                      <TableCell>
                        {result.exam?.subject || 'N/A'}
                      </TableCell>

                      {(isAdmin || isFaculty) && (
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {result.student?.name || 'N/A'}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {result.student?.email || ''}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      <TableCell>
                        {result.score}/{result.totalMarks}
                      </TableCell>

                      <TableCell>
                        {Number(result.percentage || 0).toFixed(2)}%
                      </TableCell>

                      <TableCell>
                        <span
                          className={
                            result.status === 'passed'
                              ? 'text-green-600 font-medium'
                              : 'text-red-600 font-medium'
                          }
                        >
                          {result.status === 'passed'
                            ? 'Passed'
                            : 'Failed'}
                        </span>
                      </TableCell>

                      <TableCell>
                        {result.createdAt
                          ? new Date(
                              result.createdAt
                            ).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

