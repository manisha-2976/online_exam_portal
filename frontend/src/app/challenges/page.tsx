'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import BackToDashboard from '@/components/BackToDashboard';
import { fetchApi } from '@/lib/api';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  status: 'draft' | 'published' | 'archived';
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchChallenges();
  }, [isAuthenticated]);

  const fetchChallenges = async () => {
    try {
      const data = await fetchApi('/api/challenges');
      setChallenges(
        data.filter((challenge: Challenge) =>
          user?.role === 'student' ? challenge.status === 'published' : true
        )
      );
    } catch (error: any) {
      console.error('Error fetching challenges:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load challenges. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
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

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">Coding Challenges</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'student'
              ? 'Practice your coding skills with these challenges'
              : 'Manage and create coding challenges for students'}
          </p>
        </div>
        {(user?.role === 'faculty' || user?.role === 'admin') && (
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push('/challenges/manage')}>
              Manage Challenges
            </Button>
            <Button onClick={() => router.push('/challenges/create')}>
              Create Challenge
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((challenge) => (
          <Card
            key={challenge._id}
            className="hover:scale-[1.02] transition-transform duration-300 bg-gradient-to-tr from-white via-sky-50 to-gray-100 rounded-3xl shadow-2xl border border-gray-200"
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-semibold text-blue-700">
                    {challenge.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-muted-foreground line-clamp-2">
                    {challenge.description}
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs font-medium px-3 py-1 rounded-full shadow-md transition-all duration-300 ${getDifficultyColor(
                    challenge.difficulty
                  )}`}
                >
                  {challenge.difficulty}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                  variant="outline"
                >
                  {challenge.category}
                </Badge>
                {challenge.status !== 'published' && (
                  <Badge
                    className="bg-pink-100 text-pink-700 hover:bg-pink-200 transition-colors"
                    variant="secondary"
                  >
                    {challenge.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Created by{' '}
                <span className="font-medium text-gray-700">
                  {challenge.createdBy?.name || 'Unknown'}
                </span>
              </p>
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                onClick={() => router.push(`/challenges/${challenge._id}`)}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md"
              >
                {user?.role === 'student' ? 'Solve Challenge' : 'View Details'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No challenges available</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'faculty'
              ? 'Create your first coding challenge to get started!'
              : 'Check back later for new coding challenges.'}
          </p>
          {(user?.role === 'faculty' || user?.role === 'admin') && (
            <Button className="mt-4" onClick={() => router.push('/challenges/create')}>
              Create First Challenge
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
