'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { fetchApi } from '@/lib/api';

type EnrollmentState =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'capturing'
  | 'success'
  | 'error';

export default function FaceEnrollmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<EnrollmentState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      setState('starting');
      setErrorMessage('');
      setCapturedImage(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState('ready');
    } catch (error) {
      console.error('Camera error:', error);

      setState('error');

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage(
            'Camera permission was denied. Please allow camera access and try again.'
          );
        } else if (error.name === 'NotFoundError') {
          setErrorMessage(
            'No camera was found on this device.'
          );
        } else {
          setErrorMessage(
            'Unable to access the camera. Please check your device and browser permissions.'
          );
        }
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to access the camera.'
        );
      }
    }
  };

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current || !user) {
      return;
    }

    try {
      setState('capturing');

      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to capture camera frame.');
      }

      context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = canvas.toDataURL('image/jpeg', 0.85);

      setCapturedImage(imageData);

      const response = await fetchApi('/face/enroll', {
        method: 'POST',
        body: JSON.stringify({
          candidateId: user._id,
          image: imageData,
        }),
      });

      if (!response?.success) {
        throw new Error(
          response?.message || 'Face enrollment failed.'
        );
      }

      stopCamera();
      setState('success');

      toast({
        title: 'Face enrolled',
        description: 'Your face has been enrolled successfully.',
      });
    } catch (error) {
      console.error('Face enrollment error:', error);

      setState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Face enrollment failed. Please try again.'
      );
    }
  };

  const retry = () => {
    setErrorMessage('');
    setCapturedImage(null);
    setState('idle');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#dbeafe] via-[#f0f9ff] to-[#e0f2fe] p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="rounded-2xl shadow-xl border border-slate-200 bg-white/90 backdrop-blur">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <Camera className="w-7 h-7 text-blue-600" />
            </div>

            <CardTitle className="text-2xl font-bold text-slate-800">
              Face Enrollment
            </CardTitle>

            <p className="text-sm text-slate-500">
              Register your face for secure examination verification.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured face"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {state === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900/80">
                  <Camera className="w-12 h-12 mb-3" />
                  <p className="font-medium">
                    Camera is not started
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    Start your camera to continue
                  </p>
                </div>
              )}

              {state === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-900/80">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mx-auto mb-3" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              {state === 'capturing' && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-900/70">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-white border-t-transparent mx-auto mb-3" />
                    <p>Enrolling your face...</p>
                  </div>
                </div>
              )}

              {state === 'success' && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-emerald-900/80">
                  <div className="text-center">
                    <CheckCircle2 className="w-14 h-14 mx-auto mb-3" />
                    <p className="text-xl font-semibold">
                      Face enrolled successfully
                    </p>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {state === 'error' && (
              <div className="flex gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Enrollment failed
                  </p>
                  <p className="text-sm mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}

            {state === 'ready' && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                <p className="font-semibold">
                  Position your face inside the camera frame.
                </p>
                <p className="mt-1">
                  Make sure your face is clearly visible and well lit.
                </p>
              </div>
            )}

            {state === 'success' ? (
              <div className="space-y-3">
                <Button
                  className="w-full rounded-xl"
                  onClick={() => router.push('/dashboard')}
                >
                  Continue to Dashboard
                </Button>
              </div>
            ) : state === 'error' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={retry}
                  className="rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  onClick={startCamera}
                  className="rounded-xl"
                >
                  Start Camera
                </Button>
              </div>
            ) : state === 'idle' ? (
              <Button
                onClick={startCamera}
                className="w-full rounded-xl"
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : state === 'ready' ? (
              <Button
                onClick={captureFace}
                className="w-full rounded-xl"
              >
                Capture & Enroll Face
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}