'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { examApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { ProctoringSystem } from '@/components/exam/ProctoringSystem';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Question {
  _id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
}

interface Exam {
  _id: string;
  title: string;
  description: string;
  subject: string;
  duration: number;
  totalMarks: number;
  passingPercentage: number;
  startTime: string;
  endTime: string;
  questions: Question[];
}

export default function TakeExam() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examStarted, setExamStarted] = useState(false);
  const [proctoringSession, setProctoringSession] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'student') {
      toast({
        title: 'Access Denied',
        description: 'Only students can take exams',
        variant: 'destructive',
      });
      router.push('/dashboard');
      return;
    }

    fetchExam();
  }, [id, isAuthenticated]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (examStarted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [examStarted, timeLeft]);

  const fetchExam = async () => {
    try {
      const examData = await examApi.getById(id);
      setExam(examData);
      
      // Calculate time left in seconds
      const endTime = new Date(examData.endTime).getTime();
      const now = new Date().getTime();
      const timeLeftInSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(timeLeftInSeconds);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch exam details',
        variant: 'destructive',
      });
      router.push('/exams');
    }
  };

  const handleStartExam = async () => {
    try {
      setLoading(true);
      console.log('Starting exam:', id);

      const response = await examApi.start(id);
      console.log('Exam start response:', response);

      if (!response || !response.questions) {
        throw new Error('Invalid response from server');
      }

      if (response.questions.length === 0) {
        throw new Error('No questions available for this exam');
      }

      // Update all necessary state
      setQuestions(response.questions);
      setExamStarted(true);
      setTimeLeft(response.timeLeft || response.duration * 60); // Use server-provided timeLeft or calculate from duration

      // Reset other state
      setCurrentQuestionIndex(0);
      setAnswers({});

      toast({
        title: 'Exam Started',
        description: 'Good luck with your exam!',
      });
    } catch (error: any) {
      console.error('Error starting exam:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start exam';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Only redirect if it's not a timing issue
      if (!errorMessage.includes('starts at') && !errorMessage.includes('ended at')) {
        router.push('/exams');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitExam = async () => {
    try {
      await examApi.submit(id, { answers });
      toast({
        title: 'Success',
        description: 'Exam submitted successfully',
      });
      router.push('/exams');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit exam',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProctoringViolation = async (type: string, details: string) => {
    try {
      await examApi.recordProctoring(id, {
        type,
        details,
        severity: 'medium'
      });
    } catch (error) {
      console.error('Error recording proctoring violation:', error);
    }
  };

  if (loading || !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!examStarted) {
    return (
      <div className="container mx-auto p-6">
        <BackToDashboard />
        <Card>
          <CardHeader>
            <CardTitle>{exam.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p><strong>Subject:</strong> {exam.subject}</p>
              <p><strong>Duration:</strong> {exam.duration} minutes</p>
              <p><strong>Total Marks:</strong> {exam.totalMarks}</p>
              <p><strong>Passing Percentage:</strong> {exam.passingPercentage}%</p>
              <p><strong>Start Time:</strong> {new Date(exam.startTime).toLocaleString()}</p>
              <p><strong>End Time:</strong> {new Date(exam.endTime).toLocaleString()}</p>
              <p className="mt-4">{exam.description}</p>
              <div className="mt-6">
                <Button 
                  onClick={handleStartExam}
                  disabled={new Date() < new Date(exam.startTime)}
                >
                  Start Exam
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            No questions available for this exam.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <BackToDashboard />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{exam.title}</CardTitle>
              <div className="text-right">
                <div className="text-lg font-bold">Time Left: {formatTime(timeLeft)}</div>
                <div className="text-sm">Question {currentQuestionIndex + 1} of {questions.length}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-md">
                  <h3 className="text-lg font-medium mb-4">{currentQuestion.text}</h3>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`option-${index}`}
                          name={`question-${currentQuestion._id}`}
                          checked={answers[currentQuestion._id] === index}
                          onChange={() => handleAnswer(currentQuestion._id, index)}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`option-${index}`} className="text-sm">
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  {currentQuestionIndex === questions.length - 1 ? (
                    <Button onClick={handleSubmitExam}>
                      Submit Exam
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          {proctoringSession && (
            <ProctoringSystem
              examId={exam._id}
              userId={user._id}
              onViolation={handleProctoringViolation}
            />
          )}
        </div>
      </div>
    </div>
  );
} 