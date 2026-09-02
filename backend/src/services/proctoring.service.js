const tf = require('@tensorflow/tfjs-node');
const faceapi = require('face-api.js');
const { createCanvas, Image } = require('canvas');
const { EvidenceService } = require('./evidence.service');
const Proctoring = require('../models/proctoring.model');
const { createNotification } = require('./notification.service');

class ProctoringService {
  constructor() {
    this.faceDetectionModel = null;
    this.landmarkDetectionModel = null;
    this.faceExpressionModel = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Load TensorFlow.js models
      await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
      await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
      await faceapi.nets.faceExpressionNet.loadFromDisk('./models');
      
      this.initialized = true;
      console.log('Proctoring models loaded successfully');
    } catch (error) {
      console.error('Error loading proctoring models:', error);
      throw error;
    }
  }

  async processFrame(imageData, examId, userId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Create canvas from image data
      const img = new Image();
      img.src = imageData;
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Detect faces
      const detections = await faceapi.detectAllFaces(canvas)
        .withFaceLandmarks()
        .withFaceExpressions();

      if (detections.length === 0) {
        await this.handleNoFace(examId, userId);
        return null;
      }

      // Process each face
      const results = await Promise.all(detections.map(async (detection) => {
        const landmarks = detection.landmarks;
        const expressions = detection.expressions;

        // Calculate eye openness
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const eyeOpenness = this.calculateEyeOpenness(leftEye, rightEye);

        // Calculate gaze direction
        const gazeDirection = this.calculateGazeDirection(landmarks);

        // Check for violations
        const violations = await this.checkViolations(
          detection,
          eyeOpenness,
          gazeDirection,
          examId,
          userId
        );

        return {
          face: {
            confidence: detection.detection.score,
            position: detection.detection.box,
            expressions
          },
          eyes: {
            openness: eyeOpenness,
            gaze: gazeDirection
          },
          violations
        };
      }));

      // Store evidence if violations detected
      if (results.some(r => r.violations.length > 0)) {
        await EvidenceService.storeScreenshot(imageData, examId, userId);
      }

      return results;
    } catch (error) {
      console.error('Error processing frame:', error);
      throw error;
    }
  }

  calculateEyeOpenness(leftEye, rightEye) {
    // Calculate eye aspect ratio (EAR)
    const leftEAR = this.calculateEAR(leftEye);
    const rightEAR = this.calculateEAR(rightEye);
    return (leftEAR + rightEAR) / 2;
  }

  calculateEAR(eye) {
    // Calculate the eye aspect ratio using the formula:
    // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
    const p1 = eye[0];
    const p2 = eye[1];
    const p3 = eye[2];
    const p4 = eye[3];
    const p5 = eye[4];
    const p6 = eye[5];

    const vertical1 = this.distance(p2, p6);
    const vertical2 = this.distance(p3, p5);
    const horizontal = this.distance(p1, p4);

    return (vertical1 + vertical2) / (2 * horizontal);
  }

  calculateGazeDirection(landmarks) {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    // Calculate center points
    const leftEyeCenter = this.centerPoint(leftEye);
    const rightEyeCenter = this.centerPoint(rightEye);
    const noseTip = nose[6]; // Tip of the nose

    // Calculate gaze direction
    const gazeX = (leftEyeCenter.x + rightEyeCenter.x) / 2 - noseTip.x;
    const gazeY = (leftEyeCenter.y + rightEyeCenter.y) / 2 - noseTip.y;

    return {
      x: gazeX,
      y: gazeY
    };
  }

  async checkViolations(detection, eyeOpenness, gazeDirection, examId, userId) {
    const violations = [];
    const session = await Proctoring.findOne({
      examId,
      userId,
      status: { $ne: 'TERMINATED' }
    });

    if (!session) return violations;

    // Check face position
    const box = detection.detection.box;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    if (Math.abs(centerX - 320) > 100 || Math.abs(centerY - 240) > 100) {
      violations.push({
        type: 'FACE_NOT_CENTERED',
        severity: 'MEDIUM'
      });
    }

    // Check eye openness
    if (eyeOpenness < 0.2) {
      violations.push({
        type: 'EYES_CLOSED',
        severity: 'HIGH'
      });
    }

    // Check gaze direction
    if (Math.abs(gazeDirection.x) > 100 || Math.abs(gazeDirection.y) > 100) {
      violations.push({
        type: 'LOOKING_AWAY',
        severity: 'HIGH'
      });
    }

    // Check for multiple faces
    if (detection.detection.score < 0.8) {
      violations.push({
        type: 'MULTIPLE_FACES',
        severity: 'HIGH'
      });
    }

    // Record violations
    for (const violation of violations) {
      await session.addViolation(
        violation.type,
        `Violation detected: ${violation.type}`,
        violation.severity
      );
    }

    return violations;
  }

  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  centerPoint(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  async handleNoFace(examId, userId) {
    const session = await Proctoring.findOne({
      examId,
      userId,
      status: { $ne: 'TERMINATED' }
    });

    if (session) {
      await session.addViolation(
        'NO_FACE',
        'No face detected in camera',
        'HIGH'
      );
    }
  }

  async initializeSession(examId, userId) {
    return await Proctoring.create({
      examId,
      userId,
      sessionStart: new Date(),
      violations: []
    });
  }

  async recordViolation(examId, userId, violationType, details = '', evidence = null) {
    const session = await Proctoring.findOne({ examId, userId, status: { $ne: 'TERMINATED' } });
    
    if (!session) {
      throw new Error('No active proctoring session found');
    }

    // Add violation to the session
    session.violations.push({
      type: violationType,
      details,
      evidence,
      timestamp: new Date()
    });

    // Increment warning count
    session.warningCount += 1;

    // Update session status based on warning count
    if (session.warningCount >= 5) {
      session.status = 'TERMINATED';
      session.sessionEnd = new Date();
      
      // Notify faculty about termination
      await createNotification({
        userId: session.userId,
        examId: session.examId,
        type: 'EXAM_TERMINATED',
        message: `Exam terminated due to multiple violations: ${session.warningCount} warnings`
      });
    } else if (session.warningCount >= 3) {
      session.status = 'WARNED';
      
      // Notify student about warning
      await createNotification({
        userId: session.userId,
        examId: session.examId,
        type: 'VIOLATION_WARNING',
        message: `Warning: Multiple violations detected. Further violations may result in exam termination.`
      });
    }

    await session.save();
    return session;
  }

  async terminateSession(examId, userId, reason) {
    const session = await Proctoring.findOne({ examId, userId, status: { $ne: 'TERMINATED' } });
    
    if (!session) {
      throw new Error('No active proctoring session found');
    }

    session.status = 'TERMINATED';
    session.sessionEnd = new Date();
    session.violations.push({
      type: 'SYSTEM_ALERT',
      details: `Session terminated by faculty: ${reason}`,
      timestamp: new Date()
    });

    await session.save();

    // Notify student about termination
    await createNotification({
      userId: session.userId,
      examId: session.examId,
      type: 'EXAM_TERMINATED',
      message: `Your exam has been terminated by the faculty: ${reason}`
    });

    return session;
  }

  async getSessionViolations(examId, userId) {
    const session = await Proctoring.findOne({ examId, userId })
      .populate('userId', 'name email')
      .populate('examId', 'title');
    
    return session ? session.violations : [];
  }

  async getAllActiveSessions(examId) {
    return await Proctoring.find({
      examId,
      status: { $ne: 'TERMINATED' }
    }).populate('userId', 'name email');
  }
}

module.exports = new ProctoringService(); 