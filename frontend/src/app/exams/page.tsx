'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { examApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Pencil,
  Trash2,
  CalendarDays,
  Plus,
} from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  subject: string;
  duration: number;
  totalMarks: number;
  passingPercentage: number;
  startTime: string;
  endTime: string;
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed';
  isPublished: boolean;
  createdBy: {
    _id: string;
    name: string;
  };
  questionCriteria?: {
    easy: number;
    medium: number;
    hard: number;
  };
  hasSubmitted?: boolean;
}

export default function Exams() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && isAuthenticated) fetchExams();
    else if (!authLoading) router.push('/login');
  }, [authLoading, isAuthenticated]);

  const fetchExams = async () => {
    try {
      const data = await examApi.getAll();
      setExams(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch exams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId: string) => {
    try {
      const exam = exams.find(e => e._id === examId);
      if (!exam || exam.isPublished || ['ongoing', 'completed'].includes(exam.status))
        throw new Error('Cannot delete this exam');
      await examApi.delete(examId);
      toast({ title: 'Deleted', description: 'Exam removed successfully' });
      await fetchExams();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handlePublish = async (examId: string) => {
    try {
      const exam = exams.find((e) => e._id === examId);
      if (!exam || exam.isPublished) throw new Error('Exam is already published');
  
      const { easy = 0, medium = 0, hard = 0 } = exam.questionCriteria || {};
      const totalQ = easy + medium + hard;
  
      if (totalQ < 1) {
        throw new Error('Add at least one question in criteria before publishing');
      }
  
      await examApi.publish(examId);
      toast({
        title: 'Published',
        description: 'Exam is now live',
      });
      await fetchExams();
    } catch (error: any) {
      const message =
        error.message?.includes('Not enough questions') ||
        error.response?.data?.message?.includes('Not enough questions')
          ? 'Not enough questions available. Please ensure enough easy, medium, and hard questions are added.'
          : error.message || 'Failed to publish exam';
  
      toast({
        title: 'Failed to Publish',
        description: message,
        variant: 'destructive',
      });
    }
  };
  

  const getStatusBadge = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (!exam.isPublished) return <Badge variant="secondary">Draft</Badge>;
    if (now < start) return <Badge variant="outline">Upcoming</Badge>;
    if (now >= start && now <= end) return <Badge variant="success">Ongoing</Badge>;
    return <Badge>Completed</Badge>;
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#cddafd] via-[#fdf2f8] to-[#c1f5e6] animate-gradient-x blur-2xl opacity-50 -z-10" />

      <motion.div
        className="container mx-auto p-6 max-w-7xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <BackToDashboard />

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-800">Exams</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {user?.role === 'student'
                ? 'View and attempt scheduled exams.'
                : 'Manage or create new exams below.'}
            </p>
          </div>
          {(user?.role === 'faculty' || user?.role === 'admin') && (
            <Button
              onClick={() => router.push('/exams/create')}
              size="sm"
              className="rounded-3xl bg-primary text-white hover:brightness-110 hover:shadow-md transition"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          )}
        </div>

        {exams.length === 0 ? (
          <Card className="rounded-3xl shadow-xl backdrop-blur-lg bg-white/80 border border-border">
            <CardHeader>
              <CardTitle>No Exams Found</CardTitle>
              <CardDescription>
                {user?.role === 'student'
                  ? 'You are not enrolled in any exams.'
                  : 'Click "Create Exam" to get started.'}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="rounded-3xl shadow-xl backdrop-blur-md bg-white/80 border border-border">
            <CardHeader>
              <CardTitle>All Exams</CardTitle>
              <CardDescription>
                {user?.role === 'student'
                  ? 'Here are your available exams.'
                  : 'These are exams you\'ve created.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam._id} className="hover:bg-muted/40 transition">
                        <TableCell className="font-medium text-gray-800">{exam.title}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>{exam.duration} min</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          <div className="flex items-center">
                            <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                            <div>
                              <div>{new Date(exam.startTime).toLocaleDateString()}</div>
                              <div className="text-xs">
                                {new Date(exam.startTime).toLocaleTimeString()} -{' '}
                                {new Date(exam.endTime).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(exam)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user?.role === 'student' ? (
                              (!exam.hasSubmitted && (
                                <Button
                                  size="sm"
                                  onClick={() => router.push(`/exams/${exam._id}/take`)}
                                  disabled={
                                    !exam.isPublished ||
                                    new Date() < new Date(exam.startTime) ||
                                    new Date() > new Date(exam.endTime)
                                  }
                                  className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  <Rocket className="mr-1 h-4 w-4" />
                                  Start Exam
                                </Button>
                              ))
                            ) : (
                              <>
                                {!exam.isPublished && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-full hover:bg-gray-100"
                                      onClick={() => router.push(`/exams/${exam._id}/edit`)}
                                    >
                                      <Pencil className="h-4 w-4 text-gray-600" />
                                    </Button>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="rounded-full hover:bg-red-100"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete this exam?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDelete(exam._id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            Confirm
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}

                                {!exam.isPublished && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button className="rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm px-4">
                                        <Rocket className="h-4 w-4 mr-1" />
                                        Publish
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Publish this exam?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Once published, this cannot be edited or deleted.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handlePublish(exam._id)}>
                                          Confirm
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
