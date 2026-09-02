'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { examApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, Camera, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import './page.css';

interface Question {
  _id: string;
  title: string;
  description: string;
  options: string[];
  difficulty: string;
  marks: number;
}

interface ExamData {
  _id: string;
  title: string;
  description: string;
  duration: number;
  questions: Question[];
  proctoring: {
    webcamEnabled: boolean;
    tabSwitchingEnabled: boolean;
    voiceDetectionEnabled: boolean;
  };
}

export default function TakeExamPage() {
  const params = useParams();
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    fetchExam();
    checkSubmission();
    return () => {
      // Cleanup media streams
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (exam?.proctoring?.tabSwitchingEnabled) {
      document.addEventListener('visibilitychange', handleTabSwitch);
      return () => document.removeEventListener('visibilitychange', handleTabSwitch);
    }
  }, [exam]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const data = await examApi.getById(id);
      setExam(data);
      setTimeLeft(data.duration * 60);
      
      if (data.proctoring.webcamEnabled) {
        await setupWebcam();
      }
      if (data.proctoring.voiceDetectionEnabled) {
        await setupAudioMonitoring();
      }
    } catch (error: any) {
      console.error('Error fetching exam:', error);
      setError(error.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
      }
      // Take periodic snapshots
      setInterval(() => {
        if (webcamRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = webcamRef.current.videoWidth;
          canvas.height = webcamRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(webcamRef.current, 0, 0);
            // Here you would typically send the image to your server for analysis
            // canvas.toDataURL('image/jpeg', 0.5)
          }
        }
      }, 30000); // Every 30 seconds
    } catch (error) {
      console.error('Error accessing webcam:', error);
      addWarning('Failed to access webcam');
    }
  };

  const setupAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      source.connect(analyzer);
      
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      let voiceDetectedCount = 0;
      
      setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 50) { // Threshold for voice detection
          voiceDetectedCount++;
          if (voiceDetectedCount > 3) {
            addWarning('Multiple voices detected');
            voiceDetectedCount = 0;
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addWarning('Failed to access microphone');
    }
  };

  const handleTabSwitch = () => {
    if (document.hidden) {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        addWarning(`Tab switch detected (${newCount} ${newCount === 1 ? 'time' : 'times'})`);
        if (newCount > 3) {
          addWarning('Multiple tab switches detected - your exam may be terminated');
        }
        return newCount;
      });
    }
  };

  const addWarning = (message: string) => {
    setWarnings(prev => [...prev, message]);
    toast({
      title: 'Warning',
      description: message,
      variant: 'destructive'
    });
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      await examApi.submit(id, {
        answers,
        warnings,
        tabSwitchCount
      });

      toast({
        title: 'Success',
        description: 'Exam submitted successfully'
      });
      // Redirect to the result page after successful submission
      router.push(`/exams/${id}/result`);
    } catch (error: any) {
      console.error('Error submitting exam:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit exam',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const checkSubmission = async () => {
    try {
      const submission = await examApi.getStudentSubmission(id);
      if (submission) {
        setHasSubmitted(true);
        toast({
          title: 'Submission Check',
          description: 'This exam has already been submitted'
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error checking submission:', error);
      if (error.message && error.message.includes('Submission not found')) {
        // This is expected if the user hasn't started/submitted the exam
        console.log('No submission found yet.');
      } else {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive'
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Failed to load exam'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container"
    >
      <BackToDashboard />
      <Card>
        <CardHeader className="header-actions">
          <CardTitle>Taking Exam</CardTitle>
          <Button variant="outline" onClick={() => router.push('/exams')}>
            Exit Exam
          </Button>
        </CardHeader>
        <CardContent>
          <div className="exam-container">
            <Card className="mb-6">
              <CardHeader>
                <div className="header-actions">
                  <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription>{exam.description}</CardDescription>
                  </div>
                  <div className="timer-info">
                    <div className="timer-display">
                      <Clock className="timer-icon" />
                      <span>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                    {exam?.proctoring?.webcamEnabled && <Camera className="h-4 w-4" />}
                    {exam?.proctoring?.voiceDetectionEnabled && <Volume2 className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress
                  value={(timeLeft / (exam.duration * 60)) * 100}
                  className="mb-4"
                />
                {warnings.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Warnings</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {exam?.proctoring?.webcamEnabled && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <video
                    ref={webcamRef}
                    autoPlay
                    playsInline
                    muted
                    className="webcam-preview"
                  />
                </CardContent>
              </Card>
            )}

            <div className="question-list">
              {exam.questions.map((question, index) => (
                <Card key={question._id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Question {index + 1} ({question.marks} marks)
                    </CardTitle>
                    <CardDescription className="text-base font-medium">
                      {question.title}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={answers[question._id] || ''}
                      onValueChange={(value) => handleAnswerChange(question._id, value)}
                      className="option-group"
                    >
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="option-item">
                          <RadioGroupItem value={option} id={`q${question._id}-${optionIndex}`} />
                          <Label htmlFor={`q${question._id}-${optionIndex}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="submit-button">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <div className="submit-loading">
                    <div className="submit-spinner"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Exam'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 