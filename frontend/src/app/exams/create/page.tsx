'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import BackToDashboard from '@/components/BackToDashboard';
import { useAuth } from '@/contexts/AuthContext';

interface ExamForm {
  title: string;
  subject: string;
  duration: number;
  totalMarks: number;
  passingPercentage: number;
  description: string;
  instructions: string;
  startTime: string;
  endTime: string;
  questionCriteria: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export default function CreateExam() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ExamForm>({
    title: '',
    subject: '',
    duration: 60,
    totalMarks: 100,
    passingPercentage: 40,
    description: '',
    instructions: '',
    startTime: '',
    endTime: '',
    questionCriteria: {
      easy: 5,
      medium: 3,
      hard: 2
    }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to continue',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    if (!authLoading && user?.role !== 'faculty') {
      toast({
        title: 'Access Denied',
        description: 'Only faculty members can create exams',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }
  }, [user, authLoading, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim() || !formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return false;
    }

    const startTime = new Date(formData.startTime);
    const endTime = new Date(formData.endTime);

    if (!formData.startTime || !formData.endTime || startTime >= endTime) {
      toast({
        title: 'Error',
        description: 'Invalid start or end time',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          duration: +formData.duration,
          totalMarks: +formData.totalMarks,
          passingPercentage: +formData.passingPercentage,
          startTime: new Date(formData.startTime).toISOString(),
          endTime: new Date(formData.endTime).toISOString(),
          questions: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create exam');
      }

      toast({
        title: 'Success',
        description: 'Exam created successfully',
      });

      router.push('/exams');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#fdfbff] to-[#edf4ff] p-6">
      <BackToDashboard />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        <Card className="shadow-2xl rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold text-primary">
              Create New Exam
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  ['title', 'Title'],
                  ['subject', 'Subject'],
                  ['duration', 'Duration (minutes)', 'number'],
                  ['totalMarks', 'Total Marks', 'number'],
                  ['passingPercentage', 'Passing %', 'number'],
                  ['startTime', 'Start Time', 'datetime-local'],
                  ['endTime', 'End Time', 'datetime-local'],
                ].map(([name, label, type = 'text']) => (
                  <div key={name} className="flex flex-col gap-2">
                    <Label htmlFor={name}>{label}</Label>
                    <Input
                      id={name}
                      name={name}
                      type={type}
                      value={(formData as any)[name]}
                      onChange={handleChange}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <Label>Question Distribution</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <div className="flex flex-col gap-2" key={level}>
                      <Label htmlFor={`${level}Questions`}>
                        {level.charAt(0).toUpperCase() + level.slice(1)} Questions
                      </Label>
                      <Input
                        id={`${level}Questions`}
                        type="number"
                        min="0"
                        value={(formData.questionCriteria as any)[level]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            questionCriteria: {
                              ...prev.questionCriteria,
                              [level]: parseInt(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/exams')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Exam'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
