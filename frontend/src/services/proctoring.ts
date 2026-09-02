import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { useSocket } from '@/contexts/SocketContext';

export class ProctoringService {
  private video: HTMLVideoElement | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private faceDetectionInterval: NodeJS.Timeout | null = null;
  private eyeTrackingInterval: NodeJS.Timeout | null = null;
  private audioAnalysisInterval: NodeJS.Timeout | null = null;
  private lastFaceDetected: number = Date.now();
  private lastEyesDetected: number = Date.now();
  private socket: any;

  constructor() {
    this.socket = useSocket().socket;
    this.initializeModels();
  }

  private async initializeModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  }

  public async startProctoring() {
    try {
      // Initialize video stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      // Set up video element
      this.video = document.createElement('video');
      this.video.srcObject = this.mediaStream;
      this.video.play();

      // Initialize audio context
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const analyzer = this.audioContext.createAnalyser();
      source.connect(analyzer);

      // Start monitoring
      this.startFaceDetection();
      this.startEyeTracking();
      this.startAudioAnalysis();
      this.startTabSwitchingDetection();
    } catch (error) {
      console.error('Error starting proctoring:', error);
      throw error;
    }
  }

  private startFaceDetection() {
    this.faceDetectionInterval = setInterval(async () => {
      if (!this.video) return;

      const detections = await faceapi.detectAllFaces(
        this.video,
        new faceapi.TinyFaceDetectorOptions()
      );

      if (detections.length === 0) {
        this.lastFaceDetected = Date.now();
        if (Date.now() - this.lastFaceDetected > 5000) {
          this.emitCheatingAlert('No Face Detected', 'Student face not detected for more than 5 seconds');
        }
      } else if (detections.length > 1) {
        this.emitCheatingAlert('Multiple Faces Detected', `${detections.length} faces detected in frame`);
      }
    }, 1000);
  }

  private startEyeTracking() {
    this.eyeTrackingInterval = setInterval(async () => {
      if (!this.video) return;

      const landmarks = await faceapi.detectFaceLandmarks(this.video);
      if (landmarks) {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        
        // Calculate eye openness
        const leftEyeOpenness = this.calculateEyeOpenness(leftEye);
        const rightEyeOpenness = this.calculateEyeOpenness(rightEye);

        if (leftEyeOpenness < 0.2 || rightEyeOpenness < 0.2) {
          this.lastEyesDetected = Date.now();
          if (Date.now() - this.lastEyesDetected > 3000) {
            this.emitCheatingAlert('Eyes Closed', 'Student eyes closed for more than 3 seconds');
          }
        }
      }
    }, 1000);
  }

  private calculateEyeOpenness(eye: any): number {
    // Calculate the ratio of eye height to width
    const height = Math.sqrt(
      Math.pow(eye[1].y - eye[4].y, 2) + Math.pow(eye[1].x - eye[4].x, 2)
    );
    const width = Math.sqrt(
      Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2)
    );
    return height / width;
  }

  private startAudioAnalysis() {
    if (!this.audioContext) return;

    const analyzer = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream!);
    source.connect(analyzer);
    analyzer.fftSize = 2048;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.audioAnalysisInterval = setInterval(() => {
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      if (average > 100) { // Threshold for loud noise
        this.emitCheatingAlert('Suspicious Audio', 'Unusual background noise detected');
      }
    }, 1000);
  }

  private startTabSwitchingDetection() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.emitCheatingAlert('Tab Switch', 'Student switched tabs during exam');
      }
    });

    window.addEventListener('blur', () => {
      this.emitCheatingAlert('Window Switch', 'Student switched windows during exam');
    });
  }

  private emitCheatingAlert(type: string, details: string) {
    if (this.socket) {
      this.socket.emit('cheating_detected', {
        type,
        details,
        timestamp: new Date()
      });
    }
  }

  public stopProctoring() {
    if (this.faceDetectionInterval) {
      clearInterval(this.faceDetectionInterval);
    }
    if (this.eyeTrackingInterval) {
      clearInterval(this.eyeTrackingInterval);
    }
    if (this.audioAnalysisInterval) {
      clearInterval(this.audioAnalysisInterval);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
} 