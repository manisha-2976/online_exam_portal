
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { evidenceApi, examApi, proctoringApi } from '@/lib/api';
import BackToDashboard from '@/components/BackToDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, Camera, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
// SOCKET DISABLED — no backend socket.io server exists yet.
// Re-enable once backend team ships one; the client file (lib/proctoringSocket.ts)
// is already written and just needs these two lines + the effect below un-commented.
// import { connectProctoringSocket, disconnectProctoringSocket } from '@/lib/proctoringSocket';
import './page.css';

interface Question {
  _id: string;
  title: string;
  description: string;
  options: string[];
  difficulty: string;
  marks: number;
  text?: string;
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
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth(); 

  const examId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [webcamReady, setWebcamReady] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]) 
  const initializedRef = useRef(false);
  useEffect(() => {
    if (examId) {
      setSessionId(sessionStorage.getItem(`exam-session-${examId}`));
    }
  }, [examId]);

  useEffect(() => {
    if (!examId) {
      toast({
        title: 'Error',
        description: 'No exam ID provided. Redirecting to dashboard.',
        variant: 'destructive',
      });
      router.push('/dashboard');
    }
  }, [examId, router, toast]);

  useEffect(() => {
     if (examId && !initializedRef.current) { 
    initializedRef.current = true;         
    fetchExam();
    checkSubmission();
  }

    return () => {
    activeStreamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    activeStreamsRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };
  }, [examId]);

const attachStreamToVideo = useCallback(() => {
  if (webcamRef.current && mediaStreamRef.current) {
    // extra guard: don't reassign if it's already the same stream
    if (webcamRef.current.srcObject !== mediaStreamRef.current) {
      webcamRef.current.srcObject = mediaStreamRef.current;
      webcamRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }
}, []);

const setWebcamRef = useCallback((node: HTMLVideoElement | null) => {
  webcamRef.current = node;
  if (node) {
    attachStreamToVideo();
  }
}, [attachStreamToVideo]);

  // FIX: attach the already-acquired stream once the <video> element
  // actually exists in the DOM (i.e. after `exam` state triggers a render
  // that mounts the webcam Card). Doing this inside fetchExam() was too early.
  useEffect(() => {
    if (
      exam?.proctoring?.webcamEnabled &&
      webcamRef.current &&
      mediaStreamRef.current
    ) {
      webcamRef.current.srcObject = mediaStreamRef.current;
      webcamRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [exam,webcamReady]);

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
      setError(null);

      const data = await examApi.getById(examId);
      setExam(data);
      setTimeLeft(data.duration * 60);

      if (data.proctoring?.webcamEnabled) {
        await setupWebcam();
      }
      if (data.proctoring?.voiceDetectionEnabled) {
        await setupAudioMonitoring();
      }
    } catch (error: any) {
      console.error('Error fetching exam:', error);
      setError(error.message || 'Failed to load exam');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exam',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  const captureAndUploadEvidence = async (evidenceType: string) => {
  const candidateId = user?._id || (user as any)?.id;
  if (!sessionId || !candidateId) return;

  try {
    const captureRes = await evidenceApi.capture(candidateId, sessionId, evidenceType);
    if (!captureRes?.success) return;

    const initRes = await evidenceApi.initiateUpload(candidateId, sessionId, evidenceType);
    if (!initRes?.success) return;

    await evidenceApi.completeUpload(initRes.uploadId, candidateId, sessionId);
  } catch (err) {
    console.error(`Evidence capture/upload failed (${evidenceType}):`, err);
  }
};

  const reportMediaStatus = async (camera: string, microphone: string) => {
    if (!sessionId || !user?._id) return;
    try {
      await proctoringApi.mediaStatus(user._id, sessionId, camera, microphone);
    } catch (err) {
      console.error('Media status report failed:', err);
    }
  };

  const reportScreenStatus = async (focused: boolean) => {
    if (!sessionId || !user?._id) return;
    try {
      await proctoringApi.screenStatus(user._id, sessionId, focused);
    } catch (err) {
      console.error('Screen status report failed:', err);
    }
  };
const stopAllMedia = () => {
  
  activeStreamsRef.current.forEach((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });
  activeStreamsRef.current = [];

  mediaStreamRef.current = null;
  audioStreamRef.current = null;
  if (webcamRef.current) {
    webcamRef.current.srcObject = null; 
  }

  if (audioContextRef.current) {
    audioContextRef.current.close();
    audioContextRef.current = null;
  }
};
  const attemptReconnect = async () => {
    if (!sessionId || !user?._id) return;
    setConnectionStatus('reconnecting');
    try {
      await proctoringApi.reconnect(user._id, sessionId);
      setConnectionStatus('connected');
      toast({ title: 'Reconnected', description: 'Proctoring session restored.' });
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  };

  // Heartbeat — real REST endpoint, keep active
  useEffect(() => {
    if (!sessionId || !user?._id || !exam) return;
    const interval = setInterval(() => {
      proctoringApi.heartbeat(user._id, sessionId).catch((err) =>
        console.error('Heartbeat failed:', err)
      );
    }, 20000);
    return () => clearInterval(interval);
  }, [sessionId, user, exam]);

  // Online/offline reconnect — real REST endpoint, keep active
  useEffect(() => {
    const handleOnline = () => attemptReconnect();
    const handleOffline = () => setConnectionStatus('disconnected');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionId]);

  // SOCKET DISABLED — uncomment once backend adds a socket.io server.
  // useEffect(() => {
  //   if (!sessionId || !user?._id) return;
  //   connectProctoringSocket(
  //     { candidateId: user._id, sessionId },
  //     {
  //       onCameraDisconnected: () => addWarning('Camera disconnected (server notice)'),
  //       onMicrophoneDisconnected: () => addWarning('Microphone disconnected (server notice)'),
  //       onTechnicalFailure: (p) => addWarning(p?.message || 'Technical failure detected'),
  //       onSessionStatusChanged: (p) => p?.status && setConnectionStatus(p.status),
  //       onRoomScanRequired: () =>
  //         toast({ title: 'Room scan required', description: 'Please complete a room scan.' }),
  //     }
  //   );
  //   return () => disconnectProctoringSocket();
  // }, [sessionId, user]);

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamsRef.current.push(stream); 
      mediaStreamRef.current = stream;
      attachStreamToVideo();
      // Attaching to webcamRef.current here is a best-effort early attempt;
      // the useEffect above guarantees it happens once the element exists.
      // if (webcamRef.current) {
      //   webcamRef.current.srcObject = stream;
      // }

      const track = stream.getVideoTracks()[0];
      reportMediaStatus('active', 'active');
      track.onended = () => {
        addWarning('Camera disconnected');
        reportMediaStatus('inactive', 'active');
        captureAndUploadEvidence('camera_disconnect');
        attemptReconnect();
      };

      setInterval(() => {
        if (webcamRef.current) {
          const canvas = document.createElement('canvas');
          canvas.width = webcamRef.current.videoWidth;
          canvas.height = webcamRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(webcamRef.current, 0, 0);
            // canvas.toDataURL('image/jpeg', 0.5) — send to server when evidence API is wired
            captureAndUploadEvidence('periodic_snapshot');
          }
        }
      }, 30000);
    } catch (error) {
      console.error('Error accessing webcam:', error);
      addWarning('Failed to access webcam');
    }
  };

  const setupAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamsRef.current.push(stream);
      audioStreamRef.current = stream;
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      let voiceDetectedCount = 0;

      setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 50) {
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
    reportScreenStatus(!document.hidden);
    if (document.hidden) {
      setTabSwitchCount((prev) => {
        const newCount = prev + 1;
        addWarning(`Tab switch detected (${newCount} ${newCount === 1 ? 'time' : 'times'})`);
        if (newCount > 3) addWarning('Multiple tab switches detected - your exam may be terminated');
        return newCount;
      });
      captureAndUploadEvidence('tab_switch'); 
    }
  };

  const addWarning = (message: string) => {
    setWarnings(prev => [...prev, message]);
    toast({ title: 'Warning', description: message, variant: 'destructive' });
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (submitting || !examId) return;
    setSubmitting(true);

    try {
      // FIX: examApi.submit now sends this object AS the body directly
      // (see lib/api.ts fix) — previously it was double-wrapped in { answers: ... }
      await examApi.submit(examId, { answers, warnings, tabSwitchCount });

      toast({ title: 'Success', description: 'Exam submitted successfully' });
      stopAllMedia();
      router.push(`/dashboard`);
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
    if (!examId) return;

    try {
      const submission = await examApi.getStudentSubmission(examId);
      if (submission) {
        setHasSubmitted(true);
        toast({ title: 'Submission Check', description: 'This exam has already been submitted' });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Error checking submission:', error);
      if (!error.message?.includes('Submission not found') && !error.message?.includes('404')) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive'
        });
      }
    }
  };

  if (!examId) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Invalid Exam</AlertTitle>
          <AlertDescription>
            No exam ID was provided. Please return to the dashboard and try again.
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Failed to load exam'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
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
          <Button variant="outline" onClick={() => {stopAllMedia();
            router.push('/exams')}}>
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
                <Progress value={(timeLeft / (exam.duration * 60)) * 100} className="mb-4" />
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
                    ref={setWebcamRef}
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
                      {question.text || question.title || question.description}
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
              <Button onClick={handleSubmit} disabled={submitting}>
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