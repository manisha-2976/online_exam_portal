'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { api } from '../../lib/api';

interface ProctoringSystemProps {
  examId: string;
  userId: string;
  onViolation: (violation: any) => void;
}

const ProctoringSystem: React.FC<ProctoringSystemProps> = ({
  examId,
  userId,
  onViolation,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number>();
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();

  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [eyeVisible, setEyeVisible] = useState<boolean>(true);
  const [gazeDirection, setGazeDirection] = useState<string>('center');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [violations, setViolations] = useState<any[]>([]);
  const [warningCount, setWarningCount] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [offlineData, setOfflineData] = useState<any[]>([]);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/proctoring.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'modelsLoaded':
          setModelsLoaded(data.success);
          if (!data.success) {
            setError('Failed to load face detection models');
          }
          break;

        case 'detections':
          handleDetections(data);
          break;

        case 'ear':
          handleEyeTracking(data);
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Handle offline mode
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline data when back online
  useEffect(() => {
    if (!isOffline && offlineData.length > 0) {
      syncOfflineData();
    }
  }, [isOffline, offlineData]);

  const syncOfflineData = async () => {
    try {
      for (const data of offlineData) {
        await api.recordProctoringIncident(examId, data);
      }
      setOfflineData([]);
      toast({ title: 'Success', description: 'Offline data synced successfully' });
    } catch (error) {
      console.error('Error syncing offline data:', error);
      toast({ title: 'Error', description: 'Failed to sync offline data', variant: 'destructive' });
    }
  };

  const initializeProctoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setPermissionGranted(true);
        workerRef.current?.postMessage({ type: 'loadModels' });
      }

      // Initialize audio monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);

        if (average > 50) {
          handleViolation({
            type: 'audio',
            severity: 'MEDIUM',
            message: 'High audio level detected',
            timestamp: new Date().toISOString(),
          });
        }
      };

      monitoringIntervalRef.current = setInterval(checkAudio, 1000);
    } catch (err) {
      setError('Failed to access camera or microphone');
      console.error('Error initializing proctoring:', err);
    }
  };

  const startMonitoring = () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    const processFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        workerRef.current?.postMessage(
          { type: 'processFrame', data: imageData },
          [imageData.data.buffer]
        );
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  const handleDetections = (detections: any[]) => {
    if (!detections || detections.length === 0) {
      setFaceDetected(false);
      handleViolation({
        type: 'face',
        severity: 'HIGH',
        message: 'No face detected',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (detections.length > 1) {
      handleViolation({
        type: 'face',
        severity: 'HIGH',
        message: 'Multiple faces detected',
        timestamp: new Date().toISOString(),
      });
    }

    setFaceDetected(true);
    const landmarks = detections[0].landmarks;
    workerRef.current?.postMessage({ type: 'calculateEAR', data: landmarks });
  };

  const handleEyeTracking = (ear: number) => {
    const eyeThreshold = 0.3;
    setEyeVisible(ear > eyeThreshold);

    if (ear <= eyeThreshold) {
      handleViolation({
        type: 'eye',
        severity: 'MEDIUM',
        message: 'Eyes not visible',
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleViolation = async (violation: any) => {
    setViolations((prev) => [...prev, violation]);
    onViolation(violation);

    if (isOffline) {
      setOfflineData((prev) => [...prev, violation]);
      return;
    }

    try {
      await api.recordProctoringIncident(examId, {
        userId,
        ...violation,
      });

      setWarningCount((prev) => prev + 1);
      if (warningCount >= 3) {
        handleSessionTermination();
      }
    } catch (error) {
      console.error('Error recording violation:', error);
      setOfflineData((prev) => [...prev, violation]);
    }
  };

  const handleSessionTermination = () => {
    toast({
      title: 'Exam Terminated',
      description: 'Exam session terminated due to multiple violations',
      variant: 'destructive',
    });
    router.push('/dashboard');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-2">
        {error}
      </div>
    );
  }

  if (!permissionGranted) {
    return (
      <div className="text-center mt-4 p-4 border rounded">
        <h3 className="text-lg font-semibold mb-2">Proctoring System</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please allow camera and microphone access to continue
        </p>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={initializeProctoring}
        >
          Start Proctoring
        </button>
      </div>
    );
  }

  if (!modelsLoaded) {
    return (
      <div className="text-center mt-4 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-sm text-gray-600">Loading proctoring models...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
        onLoadedMetadata={startMonitoring}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="absolute top-4 right-4 bg-black/70 p-4 rounded text-white text-xs space-y-1">
        <div className="font-semibold text-sm mb-1">Proctoring Status</div>
        <div>Face Detected: {faceDetected ? 'Yes' : 'No'}</div>
        <div>Eyes Visible: {eyeVisible ? 'Yes' : 'No'}</div>
        <div>Gaze Direction: {gazeDirection}</div>
        <div>Audio Level: {audioLevel.toFixed(2)}</div>
        <div>Warnings: {warningCount}/3</div>
        {isOffline && (
          <div className="text-yellow-400">
            Offline Mode - Data will sync when online
          </div>
        )}
      </div>

      {violations.length > 0 && (
        <div className="absolute bottom-4 left-4 max-w-xs bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded text-xs">
          Recent Violation: {violations[violations.length - 1].message}
        </div>
      )}
    </div>
  );
};

export { ProctoringSystem };
export default ProctoringSystem;