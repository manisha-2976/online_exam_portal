'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackToDashboard from '@/components/BackToDashboard';
import { Loader2 } from 'lucide-react';

interface ExamData {
  title: string;
  description: string;
  subject: string;
  duration: string;
  startTime: string;
  endTime: string;
  questionCriteria: {
    easy: number;
    medium: number;
    hard: number;
  };
  isPublished: boolean;
  createdBy: string;
}

export default function EditExam({ params }: { params: { id: string } }) {
  console.log('EditExam page mounted with params:', params);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic-details');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExamData>({
    title: '',
    description: '',
    subject: '',
    duration: '',
    startTime: '',
    endTime: '',
    questionCriteria: {
      easy: 0,
      medium: 0,
      hard: 0
    },
    isPublished: false,
    createdBy: ''
  });

  useEffect(() => {
    console.log('EditExam useEffect triggered with examId:', params.id);
    checkUserRole();
    fetchExamData();
  }, [params.id]);

  const checkUserRole = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:5000/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUserRole(userData.role);

      // Redirect if not faculty or admin
      if (!['faculty', 'admin'].includes(userData.role)) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to edit exams',
          variant: 'destructive',
        });
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      router.push('/login');
    }
  };

  const fetchExamData = async () => {
    try {
      console.log('Fetching exam data for ID:', params.id);
      const token = localStorage.getItem('accessToken');
      console.log('Using token:', token ? 'Token exists' : 'No token found');

      const response = await fetch(`http://localhost:5000/api/exams/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Exam data API response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch exam data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Exam data received:', data);
      
      // Format dates for datetime-local input
      const formatDate = (date: string) => {
        return new Date(date).toISOString().slice(0, 16);
      };

      setFormData({
        ...data,
        startTime: formatDate(data.startTime),
        endTime: formatDate(data.endTime),
        duration: data.duration.toString()
      });

      // Redirect if exam is published
      if (data.isPublished) {
        console.log('Exam is published, redirecting to exams page');
        toast({
          title: 'Error',
          description: 'Published exams cannot be edited',
          variant: 'destructive',
        });
        router.push('/exams');
      }
    } catch (error: any) {
      console.error('Error fetching exam data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exam data',
        variant: 'destructive',
      });
      router.push('/exams');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:5000/api/exams/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration),
          questionCriteria: {
            easy: parseInt(formData.questionCriteria.easy.toString()),
            medium: parseInt(formData.questionCriteria.medium.toString()),
            hard: parseInt(formData.questionCriteria.hard.toString())
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update exam');
      }

      toast({
        title: 'Success',
        description: 'Exam updated successfully',
      });

      router.push('/exams');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update exam',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('questionCriteria.')) {
      const difficulty = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        questionCriteria: {
          ...prev.questionCriteria,
          [difficulty]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTabChange = (value: string) => {
    console.log('Tab changed to:', value);
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto p-6">
      <BackToDashboard />
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit Exam</CardTitle>
        </CardHeader>
        <CardContent>
          {['faculty', 'admin'].includes(userRole || '') ? (
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-4">
                <TabsTrigger value="basic-details">Basic Details</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
                <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic-details">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      value={formData.duration}
                      onChange={handleChange}
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Question Criteria</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="easy">Easy Questions</Label>
                        <Input
                          id="easy"
                          name="questionCriteria.easy"
                          type="number"
                          value={formData.questionCriteria.easy}
                          onChange={handleChange}
                          required
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="medium">Medium Questions</Label>
                        <Input
                          id="medium"
                          name="questionCriteria.medium"
                          type="number"
                          value={formData.questionCriteria.medium}
                          onChange={handleChange}
                          required
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hard">Hard Questions</Label>
                        <Input
                          id="hard"
                          name="questionCriteria.hard"
                          type="number"
                          value={formData.questionCriteria.hard}
                          onChange={handleChange}
                          required
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => router.push('/exams')}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Exam'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
          
              
              <TabsContent value="questions">
                <div className="p-4 text-center text-muted-foreground">
                  Question selection coming soon...
                </div>
              </TabsContent>
              
              <TabsContent value="proctoring">
                <div className="p-4 text-center text-muted-foreground">
                  Proctoring settings coming soon...
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 