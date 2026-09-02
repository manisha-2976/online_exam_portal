'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
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
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

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
      enqueueSnackbar('Offline data synced successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error syncing offline data:', error);
      enqueueSnackbar('Failed to sync offline data', { variant: 'error' });
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
    enqueueSnackbar('Exam session terminated due to multiple violations', {
      variant: 'error',
    });
    navigate('/dashboard');
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
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!permissionGranted) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Proctoring System
        </Typography>
        <Typography variant="body1" gutterBottom>
          Please allow camera and microphone access to continue
        </Typography>
        <button onClick={initializeProctoring}>Start Proctoring</button>
      </Box>
    );
  }

  if (!modelsLoaded) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading proctoring models...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
        onLoadedMetadata={startMonitoring}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 2,
          borderRadius: 1,
          color: 'white',
        }}
      >
        <Typography variant="subtitle2">Proctoring Status</Typography>
        <Typography variant="body2">
          Face Detected: {faceDetected ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          Eyes Visible: {eyeVisible ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          Gaze Direction: {gazeDirection}
        </Typography>
        <Typography variant="body2">
          Audio Level: {audioLevel.toFixed(2)}
        </Typography>
        <Typography variant="body2">
          Warnings: {warningCount}/3
        </Typography>
        {isOffline && (
          <Typography variant="body2" color="warning.main">
            Offline Mode - Data will sync when online
          </Typography>
        )}
      </Box>

      {violations.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            maxWidth: '300px',
          }}
        >
          <Alert severity="warning">
            Recent Violation: {violations[violations.length - 1].message}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default ProctoringSystem; 