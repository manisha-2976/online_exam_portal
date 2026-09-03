'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Camera, CheckCircle2, AlertCircle, Loader2, Mic, ScanFace,
  ShieldCheck, Video, XCircle, RotateCcw, Home,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi, challengeApi } from '@/lib/api';

type Step = 'enrollment' | 'permissions' | 'verification' | 'room-scan' | 'session' | 'complete';

const MAX_FACE_RETRIES = 3;
const ROOM_SCAN_DURATION = 10;

export default function ChallengeSetupPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const challengeId = (params?.id as string) || '';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const roomScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>('enrollment');
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [enrollmentStatus, setEnrollmentStatus] = useState<'checking' | 'enrolled' | 'not-enrolled' | 'error'>('checking');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'checking' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [microphoneStatus, setMicrophoneStatus] = useState<'idle' | 'checking' | 'granted' | 'denied' | 'unavailable'>('idle');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [faceRetries, setFaceRetries] = useState(0);
  const [roomScanStatus, setRoomScanStatus] = useState<'idle' | 'starting' | 'scanning' | 'completed' | 'failed' | 'timeout'>('idle');
  const [roomScanProgress, setRoomScanProgress] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'starting' | 'started' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const candidateId = user?._id || (user as any)?.id;

  const cleanupMedia = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (roomScanTimerRef.current) {
      clearInterval(roomScanTimerRef.current);
      roomScanTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const checkFaceEnrollment = useCallback(async () => {
    if (!user) return;
    try {
      setCheckingEnrollment(true);
      setEnrollmentStatus('checking');
      setErrorMessage('');

      const response = await fetchApi('face/status');

      if (response?.success && response?.enrollment === 'completed') {
        setEnrollmentStatus('enrolled');
        setCurrentStep('permissions');
      } else {
        setEnrollmentStatus('not-enrolled');
        setCurrentStep('enrollment');
      }
    } catch (error: any) {
      setEnrollmentStatus('error');
      setErrorMessage(error?.message || 'Unable to check face enrollment status.');
    } finally {
      setCheckingEnrollment(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) checkFaceEnrollment();
  }, [user, checkFaceEnrollment]);

  const requestDevicePermissions = async () => {
    try {
      setErrorMessage('');
      setCameraStatus('checking');
      setMicrophoneStatus('checking');

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus('unavailable');
        setMicrophoneStatus('unavailable');
        setErrorMessage('Camera and microphone access is not supported by this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setCameraStatus(videoTrack ? 'granted' : 'unavailable');
      setMicrophoneStatus(audioTrack ? 'granted' : 'unavailable');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (videoTrack && audioTrack) {
        setCurrentStep('verification');
      } else {
        setErrorMessage('Both camera and microphone are required to continue.');
      }
    } catch (error: any) {
      setCameraStatus('denied');
      setMicrophoneStatus('denied');
      setErrorMessage('Camera and microphone permission is required before starting the challenge.');
    }
  };

  useEffect(() => {
    if ((currentStep === 'verification' || currentStep === 'room-scan') && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((error) => console.error('Video play error:', error));
    }
  }, [currentStep]);

  const verifyFace = async () => {
    if (!candidateId) {
      setErrorMessage('Candidate information is unavailable.');
      return;
    }
    if (faceRetries >= MAX_FACE_RETRIES) {
      setVerificationStatus('failed');
      setErrorMessage('Maximum face verification attempts reached.');
      return;
    }

    try {
      setVerificationStatus('verifying');
      setErrorMessage('');

      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          if (context) context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }

      const response = await fetchApi('face/verify', {
        method: 'POST',
        body: JSON.stringify({ candidateId }),
      });

      if (response?.success && response?.status === 'verified') {
        setVerificationStatus('verified');
        setCurrentStep('room-scan');
        toast({ title: 'Face verified', description: 'Your identity has been successfully verified.' });
      } else {
        const newRetryCount = faceRetries + 1;
        setFaceRetries(newRetryCount);
        setVerificationStatus('failed');
        setErrorMessage(response?.message || `Face verification failed. Attempt ${newRetryCount} of ${MAX_FACE_RETRIES}.`);
      }
    } catch (error: any) {
      const newRetryCount = faceRetries + 1;
      setFaceRetries(newRetryCount);
      setVerificationStatus('failed');
      setErrorMessage(error?.message || `Face verification failed. Attempt ${newRetryCount} of ${MAX_FACE_RETRIES}.`);
    }
  };

  const startRoomScan = async () => {
    if (!candidateId) {
      setErrorMessage('Candidate information is unavailable.');
      return;
    }

    const sessionId = crypto.randomUUID();

    try {
      setRoomScanStatus('starting');
      setRoomScanProgress(0);
      setErrorMessage('');

      await fetchApi('room-scan/start', {
        method: 'POST',
        body: JSON.stringify({ candidateId, sessionId }),
      });

      setRoomScanStatus('scanning');

      let progress = 0;
      roomScanTimerRef.current = setInterval(() => {
        progress += 10;
        setRoomScanProgress(progress);
        if (progress >= 100) {
          if (roomScanTimerRef.current) {
            clearInterval(roomScanTimerRef.current);
            roomScanTimerRef.current = null;
          }
          completeRoomScan(sessionId);
        }
      }, ROOM_SCAN_DURATION * 100);
    } catch (error: any) {
      setRoomScanStatus('failed');
      setErrorMessage(error?.message || 'Unable to start room scan.');
    }
  };

  const completeRoomScan = async (sessionId: string) => {
    if (!candidateId) return;

    try {
      setRoomScanStatus('scanning');

      const response = await fetchApi('room-scan/complete', {
        method: 'POST',
        body: JSON.stringify({ candidateId, sessionId }),
      });

      if (response?.success && response?.status === 'completed') {
        setRoomScanStatus('completed');
        toast({ title: 'Room scan completed', description: 'Your environment check is complete.' });
        await startProctoringSession(sessionId);
      } else {
        setRoomScanStatus('failed');
        setErrorMessage(response?.message || 'Room scan could not be completed.');
      }
    } catch (error: any) {
      setRoomScanStatus('failed');
      setErrorMessage(error?.message || 'Failed to complete room scan.');
    }
  };

  const markRoomScanIncomplete = async () => {
    if (!candidateId) return;
    const sessionId = crypto.randomUUID();
    try {
      await fetchApi('room-scan/incomplete', {
        method: 'POST',
        body: JSON.stringify({ candidateId, sessionId }),
      });
    } catch (error) {
      console.error('Incomplete room scan error:', error);
    }
    setRoomScanStatus('failed');
    setErrorMessage('Room scan was not completed. Please try again.');
  };

  const startProctoringSession = async (sessionId: string) => {
    if (!candidateId) {
      setSessionStatus('failed');
      setErrorMessage('Candidate information is unavailable.');
      return;
    }

    try {
      setSessionStatus('starting');

      const response = await fetchApi('proctoring/session/start', {
        method: 'POST',
        body: JSON.stringify({ candidateId, sessionId }),
      });

      if (response?.success && response?.status === 'started') {
        // Create/resume the challenge submission now that pre-checks passed.
        await challengeApi.start(challengeId, '');

        setSessionStatus('started');
        setCurrentStep('complete');
        sessionStorage.setItem(`challenge-session-${challengeId}`, sessionId);

        toast({ title: 'Ready to start', description: 'All pre-challenge checks have passed.' });

        setTimeout(() => {
          cleanupMedia();
          router.push(`/challenges/${challengeId}/take`);
        }, 1000);
      } else {
        setSessionStatus('failed');
        setErrorMessage(response?.message || 'Unable to start the proctoring session.');
      }
    } catch (error: any) {
      setSessionStatus('failed');
      setErrorMessage(error?.message || 'Failed to start the proctoring session.');
    }
  };

  const getStepNumber = (step: Step) => {
    const steps: Step[] = ['enrollment', 'permissions', 'verification', 'room-scan', 'session'];
    return steps.indexOf(step) + 1;
  };

  const stepLabels = [
    { id: 'enrollment', label: 'Face Enrollment', icon: ScanFace },
    { id: 'permissions', label: 'Device Check', icon: Video },
    { id: 'verification', label: 'Face Verification', icon: ScanFace },
    { id: 'room-scan', label: 'Room Scan', icon: ShieldCheck },
    { id: 'session', label: 'Proctoring Session', icon: ShieldCheck },
  ];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">Challenge Setup</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-1">Pre-Challenge Verification</h1>
              <p className="text-slate-600 mt-2">Complete all verification steps before entering the challenge.</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="hidden md:flex gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>

        <Card className="mb-6 bg-white/80 backdrop-blur border-slate-200">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-5 gap-2">
              {stepLabels.map((step, index) => {
                const stepIndex = index + 1;
                const currentIndex = getStepNumber(currentStep);
                const completed = stepIndex < currentIndex;
                const active = stepIndex === currentIndex;
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition ${
                      completed ? 'bg-green-100 border-green-500 text-green-600'
                        : active ? 'bg-blue-100 border-blue-500 text-blue-600'
                        : 'bg-slate-100 border-slate-300 text-slate-400'
                    }`}>
                      {completed ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={`text-xs mt-2 hidden sm:block ${active ? 'font-semibold text-blue-700' : 'text-slate-500'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">Verification issue</p>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/90 backdrop-blur shadow-xl border-slate-200">
          <CardHeader>
            <CardTitle>
              {currentStep === 'enrollment' && 'Face Enrollment Status'}
              {currentStep === 'permissions' && 'Camera & Microphone Check'}
              {currentStep === 'verification' && 'Face Verification'}
              {currentStep === 'room-scan' && 'Room Scan'}
              {currentStep === 'complete' && 'Verification Complete'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {currentStep === 'enrollment' && (
              <div className="max-w-xl mx-auto text-center py-8">
                {checkingEnrollment ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                    <h2 className="text-xl font-semibold mt-5">Checking face enrollment...</h2>
                    <p className="text-slate-500 mt-2">Please wait while we check your enrollment status.</p>
                  </>
                ) : enrollmentStatus === 'not-enrolled' ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                      <ScanFace className="h-8 w-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-semibold mt-5">Face enrollment required</h2>
                    <p className="text-slate-600 mt-2">You need to complete face enrollment before starting this challenge.</p>
                    <Button className="mt-6" onClick={() => router.push('/face-enrollment')}>Complete Face Enrollment</Button>
                  </>
                ) : (
                  <>
                    <XCircle className="h-12 w-12 mx-auto text-red-500" />
                    <h2 className="text-xl font-semibold mt-5">Unable to check enrollment</h2>
                    <Button variant="outline" className="mt-6" onClick={checkFaceEnrollment}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </>
                )}
              </div>
            )}

            {currentStep === 'permissions' && (
              <div className="max-w-2xl mx-auto">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-blue-100"><Camera className="h-6 w-6 text-blue-600" /></div>
                      <div>
                        <p className="font-semibold">Camera</p>
                        <p className="text-sm text-slate-500">Required</p>
                      </div>
                      <div className="ml-auto">
                        {cameraStatus === 'granted' && <CheckCircle2 className="text-green-500" />}
                        {cameraStatus === 'denied' && <XCircle className="text-red-500" />}
                      </div>
                    </div>
                    <p className="text-sm mt-4 text-slate-600">Your camera is required for identity verification and proctoring.</p>
                  </div>

                  <div className="border rounded-xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-purple-100"><Mic className="h-6 w-6 text-purple-600" /></div>
                      <div>
                        <p className="font-semibold">Microphone</p>
                        <p className="text-sm text-slate-500">Required</p>
                      </div>
                      <div className="ml-auto">
                        {microphoneStatus === 'granted' && <CheckCircle2 className="text-green-500" />}
                        {microphoneStatus === 'denied' && <XCircle className="text-red-500" />}
                      </div>
                    </div>
                    <p className="text-sm mt-4 text-slate-600">Your microphone is required for the proctoring environment.</p>
                  </div>
                </div>

                {cameraStatus === 'granted' && (
                  <div className="mt-6">
                    <div className="relative overflow-hidden rounded-xl bg-black aspect-video max-w-xl mx-auto">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-6">
                  <Button
                    onClick={requestDevicePermissions}
                    disabled={cameraStatus === 'checking' || microphoneStatus === 'checking'}
                    className="min-w-[220px]"
                  >
                    {cameraStatus === 'checking' || microphoneStatus === 'checking' ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking devices...</>
                    ) : (
                      <><Video className="h-4 w-4 mr-2" />Allow Camera & Microphone</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'verification' && (
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-slate-600 mb-6">Position your face inside the camera frame. Make sure your face is clearly visible.</p>
                <div className="relative max-w-lg mx-auto aspect-video rounded-2xl overflow-hidden bg-black border-4 border-blue-200">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-60 md:w-56 md:h-72 border-2 border-white rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="mt-5">
                  <p className="text-sm text-slate-500">Verification attempts: {faceRetries}/{MAX_FACE_RETRIES}</p>
                </div>
                {verificationStatus === 'verifying' ? (
                  <Button disabled className="mt-5 min-w-[220px]">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying face...
                  </Button>
                ) : verificationStatus === 'verified' ? (
                  <div className="mt-5 flex justify-center items-center gap-2 text-green-600 font-semibold">
                    <CheckCircle2 className="h-5 w-5" />Face verified successfully
                  </div>
                ) : (
                  <Button onClick={verifyFace} disabled={faceRetries >= MAX_FACE_RETRIES} className="mt-5 min-w-[220px]">
                    <ScanFace className="h-4 w-4 mr-2" />Verify My Face
                  </Button>
                )}
              </div>
            )}

            {currentStep === 'room-scan' && (
              <div className="max-w-2xl mx-auto text-center">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold mt-5">Check your surroundings</h2>
                <p className="text-slate-600 mt-2">Slowly move your camera around the room so the environment can be checked.</p>

                <div className="bg-slate-50 rounded-xl p-5 mt-6 text-left">
                  <p className="font-semibold mb-3">Room scan instructions</p>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Keep your camera enabled.</li>
                    <li>• Slowly pan around your surroundings.</li>
                    <li>• Make sure the room is well lit.</li>
                    <li>• Keep the camera steady.</li>
                    <li>• Complete the scan before the timer ends.</li>
                  </ul>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-black aspect-video mt-6">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  {roomScanStatus === 'scanning' && (
                    <div className="absolute top-4 left-4 right-4">
                      <div className="bg-black/60 rounded-lg p-3">
                        <div className="flex justify-between text-white text-sm mb-2">
                          <span>Scanning room...</span>
                          <span>{roomScanProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${roomScanProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {roomScanStatus === 'idle' && <Button onClick={startRoomScan} className="mt-6 min-w-[220px]">Start Room Scan</Button>}
                {roomScanStatus === 'starting' && (
                  <Button disabled className="mt-6"><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting room scan...</Button>
                )}
                {roomScanStatus === 'scanning' && (
                  <p className="mt-5 text-sm text-blue-600 font-medium">Slowly pan your camera around the room...</p>
                )}
                {roomScanStatus === 'completed' && (
                  <div className="mt-6 text-green-600 font-semibold flex justify-center gap-2"><CheckCircle2 />Room scan completed</div>
                )}
                {roomScanStatus === 'failed' && (
                  <div className="mt-6">
                    <Button variant="outline" onClick={startRoomScan}><RotateCcw className="h-4 w-4 mr-2" />Retry Room Scan</Button>
                  </div>
                )}
                {roomScanStatus === 'scanning' && (
                  <Button variant="ghost" className="mt-3 text-red-600" onClick={markRoomScanIncomplete}>Stop Room Scan</Button>
                )}
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="max-w-xl mx-auto text-center py-8">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mt-6 text-slate-900">All checks completed</h2>
                <p className="text-slate-600 mt-3">Your identity, device and room verification have been completed successfully.</p>

                {sessionStatus === 'starting' && (
                  <div className="flex justify-center items-center gap-2 mt-6 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin" />Starting proctoring session...
                  </div>
                )}
                {sessionStatus === 'started' && (
                  <div className="mt-6 text-green-600 font-semibold">Redirecting you to the challenge...</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">Challenge ID: {challengeId}</p>
        </div>
      </div>
    </div>
  );
}