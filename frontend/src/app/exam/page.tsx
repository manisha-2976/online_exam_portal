'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';
import { ProctoringService } from '@/services/proctoring';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

// Sample questions
const questions: Question[] = [
  {
    id: 1,
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 2
  },
  // Add more questions as needed
];

export default function Exam() {
  const router = useRouter();
  const { toast } = useToast();
  const { socket } = useSocket();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cheatingDetected, setCheatingDetected] = useState(false);
  const [proctoringService, setProctoringService] = useState<ProctoringService | null>(null);
  const warningRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Initialize proctoring service
    const service = new ProctoringService();
    setProctoringService(service);

    // Start proctoring
    service.startProctoring().catch((error) => {
      toast({
        title: 'Proctoring Error',
        description: 'Failed to start proctoring. Please ensure camera and microphone access is granted.',
        variant: 'destructive',
      });
    });

    // Listen for cheating warnings
    if (socket) {
      socket.on('cheating_warning', (data: any) => {
        setCheatingDetected(true);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 5000);
      });
    }

    // Cleanup
    return () => {
      if (proctoringService) {
        proctoringService.stopProctoring();
      }
    };
  }, [router, socket, toast]);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCheatingDetected = (type: string, details: string) => {
    if (socket) {
      socket.emit('cheating_detected', {
        studentId: JSON.parse(localStorage.getItem('user') || '{}')._id,
        examId: 'current-exam-id', // Replace with actual exam ID
        type,
        details
      });
    }
  };

  const handleAnswer = (optionIndex: number) => {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[currentQuestion] = optionIndex;
      return newAnswers;
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Stop proctoring
      if (proctoringService) {
        proctoringService.stopProctoring();
      }

      // Calculate score
      const score = answers.reduce((acc, answer, index) => {
        return acc + (answer === questions[index].correctAnswer ? 1 : 0);
      }, 0);

      // Send exam results
      if (socket) {
        socket.emit('exam_status_update', {
          examId: 'current-exam-id', // Replace with actual exam ID
          status: 'completed',
          details: {
            score,
            totalQuestions: questions.length,
            timeSpent: 3600 - timeLeft
          }
        });
      }

      toast({
        title: 'Exam Submitted',
        description: `Your score: ${score}/${questions.length}`,
      });

      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit exam',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Online Exam</h1>
        <div className={`text-xl font-semibold ${timeLeft <= 300 ? 'text-red-500 animate-pulse' : ''}`}>
          Time Left: {formatTime(timeLeft)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <AnimatePresence>
            {showWarning && (
              <motion.div
                ref={warningRef}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
              >
                Warning: Cheating Detected!
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader>
              <CardTitle>Question {currentQuestion + 1} of {questions.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-lg">{questions[currentQuestion].text}</p>
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => (
                    <Button
                      key={index}
                      variant={answers[currentQuestion] === index ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => handleAnswer(index)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            <Button
              onClick={currentQuestion === questions.length - 1 ? handleSubmit : handleNext}
              disabled={isSubmitting}
            >
              {currentQuestion === questions.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </div>
        </div>

        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Proctoring View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {cheatingDetected && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center">
                    <span className="text-red-500 font-bold">Warning: Cheating Detected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 