import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ui/use-toast';
import { examApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Exam {
  _id?: string;
  title: string;
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
  questions: string[];
}

export default function CreateEditExamPage() {
  const router = useRouter();
  const { examId } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('basic-details');
  const [exam, setExam] = useState<Exam>({
    title: '',
    description: '',
    duration: 60,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    questions: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (examId) {
        await examApi.update(examId as string, exam);
        toast({ title: 'Success', description: 'Exam updated successfully' });
      } else {
        await examApi.create(exam);
        toast({ title: 'Success', description: 'Exam created successfully' });
      }
      router.push('/dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to save exam: ' + (error.message || 'Unknown error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{examId ? 'Edit Exam' : 'Create New Exam'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="basic-details">Basic Details</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit}>
              <TabsContent value="basic-details">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={exam.title}
                      onChange={(e) => setExam(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={exam.description}
                      onChange={(e) => setExam(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={exam.duration}
                        onChange={(e) => setExam(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="datetime-local"
                        value={exam.startTime.slice(0, 16)}
                        onChange={(e) => setExam(prev => ({ ...prev, startTime: new Date(e.target.value).toISOString() }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="datetime-local"
                        value={exam.endTime.slice(0, 16)}
                        onChange={(e) => setExam(prev => ({ ...prev, endTime: new Date(e.target.value).toISOString() }))}
                        required
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="questions">
                <div className="space-y-4">
                  {/* Question selection component will go here */}
                  <p>Question selection coming soon...</p>
                </div>
              </TabsContent>

              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : examId ? 'Update Exam' : 'Create Exam'}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 