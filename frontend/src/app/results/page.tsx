'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  examId: {
    _id: string;
    title: string;
    subject: string;
    totalMarks: number;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  score: number;
  answers: Array<{
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
  }>;
  submittedAt: string;
}

export default function Results() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const data = await examApi.getResults();
      setResults(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
          <CardTitle>Exam Results</CardTitle>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Submitted</TableHead>
                {(user?.role === 'faculty' || user?.role === 'admin') && (
                  <TableHead>Student</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result._id}>
                  <TableCell>{result.examId.title}</TableCell>
                  <TableCell>{result.examId.subject}</TableCell>
                  <TableCell>{result.score}/{result.examId.totalMarks}</TableCell>
                  <TableCell>
                    {((result.score / result.examId.totalMarks) * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    {new Date(result.submittedAt).toLocaleDateString()}
                  </TableCell>
                  {(user?.role === 'faculty' || user?.role === 'admin') && (
                    <TableCell>{result.userId.name}</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
} 