'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { fetchApi } from '@/lib/api';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  starterCode: string;
  timeLimit: number;
  memoryLimit: number;
  createdBy: {
    _id: string;
    name: string;
  };
}

export default function ChallengePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchChallenge();
  }, [isAuthenticated, id]);

  const fetchChallenge = async () => {
    try {
      const data = await fetchApi(`/api/challenges/${id}`);
      setChallenge(data);
      setCode(data.starterCode);
    } catch (error: any) {
      console.error('Error fetching challenge:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load challenge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const data = await fetchApi('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: id,
          code,
          language,
        }),
      });
      router.push(`/challenges/${id}/submissions/${data._id}`);
    } catch (error: any) {
      console.error('Error submitting solution:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit solution. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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

  if (!challenge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Challenge not found</h3>
          <Button
            className="mt-4"
            onClick={() => router.push('/challenges')}
          >
            Back to Challenges
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Challenge Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{challenge.title}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                  <Badge variant="outline">{challenge.category}</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div className="whitespace-pre-wrap">{challenge.description}</div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Time Limit:</strong> {challenge.timeLimit}ms</p>
                <p><strong>Memory Limit:</strong> {challenge.memoryLimit}MB</p>
                <p><strong>Created by:</strong> {challenge.createdBy.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Code Editor */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Solution</CardTitle>
              <Select
                value={language}
                onValueChange={setLanguage}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono min-h-[400px] resize-none"
              placeholder="Write your solution here..."
            />
            <div className="flex justify-end mt-4 space-x-4">
              <Button
                variant="outline"
                onClick={() => setCode(challenge.starterCode)}
              >
                Reset Code
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Solution'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 