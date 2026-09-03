

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { challengeApi } from '@/lib/api';
import { CheckCircle2 } from 'lucide-react';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  challengeType?: 'coding' | 'bash';
  startDate: string;
  endDate: string;
  allowedLanguages: string[];
  timeLimit: number;
  memoryLimit: number;
  proctoring?: {
    webcamEnabled: boolean;
    tabSwitchingEnabled: boolean;
    voiceDetectionEnabled: boolean;
  };
  createdBy: { _id: string; name: string };
}

interface SubmissionInfo {
  status: 'in-progress' | 'completed';
  score?: number;
  passedTestCases?: number;
  totalTestCases?: number;
}

export default function ChallengeOverviewPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (id) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const data = await challengeApi.getById(id as string);
      setChallenge(data);

      if (user?.role === 'student') {
        try {
          const sub = await challengeApi.getStudentSubmission(id as string);
          setSubmission(sub);
        } catch {
          setSubmission(null); // no submission yet — fine
        }
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load challenge.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
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
          <Button className="mt-4" onClick={() => router.push('/challenges')}>Back to Challenges</Button>
        </div>
      </div>
    );
  }

  const alreadySubmitted = submission?.status === 'completed';

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <CardTitle className="text-2xl">{challenge.title}</CardTitle>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge className={getDifficultyColor(challenge.difficulty)}>{challenge.difficulty}</Badge>
                <Badge variant="outline">{challenge.category}</Badge>
                <Badge variant="outline" className="capitalize">{challenge.challengeType || 'coding'}</Badge>
              </div>
            </div>
            {alreadySubmitted && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1 px-3 py-1">
                <CheckCircle2 className="h-4 w-4" />
                Submitted{typeof submission?.score === 'number' ? ` — ${submission.score}%` : ''}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="prose max-w-none whitespace-pre-wrap">{challenge.description}</div>

          <div className="mt-6 text-sm text-gray-600 space-y-2">
            <p><strong>Time Limit:</strong> {challenge.timeLimit}ms</p>
            <p><strong>Memory Limit:</strong> {challenge.memoryLimit}MB</p>
            <p>
              <strong>Allowed Languages:</strong>{' '}
              {challenge.allowedLanguages?.join(', ')}
            </p>
            <p><strong>Created by:</strong> {challenge.createdBy?.name || 'Admin'}</p>
            {challenge.proctoring && (
              <p>
                <strong>Proctoring:</strong>{' '}
                {[
                  challenge.proctoring.webcamEnabled && 'Webcam',
                  challenge.proctoring.tabSwitchingEnabled && 'Tab-switch detection',
                  challenge.proctoring.voiceDetectionEnabled && 'Voice detection',
                ].filter(Boolean).join(', ') || 'None'}
              </p>
            )}
          </div>

          {user?.role === 'student' && (
            <div className="mt-8">
              {alreadySubmitted ? (
                <div className="p-4 rounded-md bg-green-50 text-green-700 text-sm">
                  You've already submitted this challenge
                  {typeof submission?.passedTestCases === 'number'
                    ? ` (${submission.passedTestCases}/${submission.totalTestCases} test cases passed).`
                    : '.'}{' '}
                  It can't be reopened.
                </div>
              ) : (
                <Button className="w-full" onClick={() => router.push(`/challenges/${id}/setup`)}>
                  Start Challenge
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}