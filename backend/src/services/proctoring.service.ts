import { ProctoringSession } from '../models/proctoring.model';
import { EvidenceService } from './evidence.service';
import { NotificationService } from './notification.service';
import { CacheService } from './cache.service';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

export class ProctoringService {
  private evidenceService: EvidenceService;
  private notificationService: NotificationService;
  private cacheService: CacheService;
  private errorHandler: ErrorHandler;

  constructor() {
    this.evidenceService = new EvidenceService();
    this.notificationService = new NotificationService();
    this.cacheService = new CacheService();
    this.errorHandler = new ErrorHandler();
  }

  async initializeSession(
    examId: string,
    userId: string,
    settings: any
  ): Promise<ProctoringSession> {
    try {
      const session = await ProctoringSession.create({
        examId,
        userId,
        status: 'ACTIVE',
        settings,
        startTime: new Date(),
        violations: [],
        monitoringData: {
          faceDetection: [],
          eyeTracking: [],
          audioMonitoring: [],
          screenMonitoring: [],
          keyboardActivity: [],
          mouseActivity: [],
        },
      });

      // Cache session for quick access
      await this.cacheService.set(
        `proctoring:${examId}:${userId}`,
        session.toJSON(),
        3600
      );

      // Notify user
      await this.notificationService.sendProctoringStartNotification(
        userId,
        examId
      );

      return session;
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.initializeSession',
        examId,
        userId,
      });
      throw error;
    }
  }

  async processFrame(
    sessionId: string,
    frameData: {
      imageData: Buffer;
      timestamp: Date;
      metadata: any;
    }
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.status !== 'ACTIVE') return;

      // Store frame as evidence
      const evidenceUrl = await this.evidenceService.storeScreenshot(
        session.examId,
        session.userId,
        frameData.imageData
      );

      // Update monitoring data
      session.monitoringData.faceDetection.push({
        timestamp: frameData.timestamp,
        evidenceUrl,
        ...frameData.metadata,
      });

      await session.save();

      // Check for violations
      await this.checkViolations(session);
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.processFrame',
        sessionId,
      });
    }
  }

  async processAudio(
    sessionId: string,
    audioData: {
      buffer: Buffer;
      timestamp: Date;
      level: number;
    }
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.status !== 'ACTIVE') return;

      // Store audio clip as evidence
      const evidenceUrl = await this.evidenceService.storeAudioClip(
        session.examId,
        session.userId,
        audioData.buffer
      );

      // Update monitoring data
      session.monitoringData.audioMonitoring.push({
        timestamp: audioData.timestamp,
        evidenceUrl,
        level: audioData.level,
      });

      await session.save();

      // Check for violations
      await this.checkViolations(session);
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.processAudio',
        sessionId,
      });
    }
  }

  async recordViolation(
    sessionId: string,
    violation: {
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      message: string;
      evidenceUrls?: string[];
    }
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return;

      const newViolation = {
        ...violation,
        timestamp: new Date(),
        action: this.determineAction(session, violation),
      };

      session.violations.push(newViolation);

      // Update session status based on violations
      if (session.violations.length >= 3) {
        session.status = 'WARNED';
      } else if (session.violations.length >= 5) {
        session.status = 'FLAGGED';
      }

      await session.save();

      // Notify relevant parties
      await this.notificationService.sendViolationNotification(
        session.userId,
        session.examId,
        newViolation
      );

      // Take action if necessary
      if (newViolation.action === 'TERMINATE') {
        await this.terminateSession(sessionId, 'Multiple violations detected');
      }
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.recordViolation',
        sessionId,
        violation,
      });
    }
  }

  async terminateSession(
    sessionId: string,
    reason: string
  ): Promise<ProctoringSession> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) throw new Error('Session not found');

      session.status = 'TERMINATED';
      session.endTime = new Date();
      session.terminationReason = reason;

      await session.save();

      // Clear cache
      await this.cacheService.del(
        `proctoring:${session.examId}:${session.userId}`
      );

      // Notify user
      await this.notificationService.sendSessionTerminationNotification(
        session.userId,
        session.examId,
        reason
      );

      return session;
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.terminateSession',
        sessionId,
        reason,
      });
      throw error;
    }
  }

  private async getSession(sessionId: string): Promise<ProctoringSession | null> {
    try {
      // Try cache first
      const cachedSession = await this.cacheService.get(
        `proctoring:${sessionId}`
      );
      if (cachedSession) {
        return new ProctoringSession(cachedSession);
      }

      // Fallback to database
      const session = await ProctoringSession.findById(sessionId);
      if (session) {
        // Update cache
        await this.cacheService.set(
          `proctoring:${sessionId}`,
          session.toJSON(),
          3600
        );
      }

      return session;
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.getSession',
        sessionId,
      });
      return null;
    }
  }

  private async checkViolations(session: ProctoringSession): Promise<void> {
    try {
      const settings = session.settings;

      // Check face detection violations
      if (settings.faceDetection?.enabled) {
        const recentFaceData = session.monitoringData.faceDetection.slice(-10);
        const noFaceCount = recentFaceData.filter(
          (data) => !data.faceDetected
        ).length;

        if (noFaceCount >= 5) {
          await this.recordViolation(session._id, {
            type: 'face',
            severity: 'HIGH',
            message: 'Face not detected for extended period',
          });
        }
      }

      // Check eye tracking violations
      if (settings.eyeTracking?.enabled) {
        const recentEyeData = session.monitoringData.eyeTracking.slice(-10);
        const closedEyesCount = recentEyeData.filter(
          (data) => data.eyeOpenness < settings.eyeTracking.threshold
        ).length;

        if (closedEyesCount >= 5) {
          await this.recordViolation(session._id, {
            type: 'eye',
            severity: 'MEDIUM',
            message: 'Eyes closed for extended period',
          });
        }
      }

      // Check audio violations
      if (settings.audioMonitoring?.enabled) {
        const recentAudioData = session.monitoringData.audioMonitoring.slice(-10);
        const highAudioCount = recentAudioData.filter(
          (data) => data.level > settings.audioMonitoring.threshold
        ).length;

        if (highAudioCount >= 5) {
          await this.recordViolation(session._id, {
            type: 'audio',
            severity: 'MEDIUM',
            message: 'High audio level detected',
          });
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error, {
        context: 'ProctoringService.checkViolations',
        sessionId: session._id,
      });
    }
  }

  private determineAction(
    session: ProctoringSession,
    violation: { severity: string }
  ): 'WARN' | 'FLAG' | 'TERMINATE' {
    const violationCount = session.violations.length + 1;

    if (violation.severity === 'HIGH') {
      return 'TERMINATE';
    }

    if (violationCount >= 5) {
      return 'TERMINATE';
    }

    if (violationCount >= 3) {
      return 'FLAG';
    }

    return 'WARN';
  }
} 