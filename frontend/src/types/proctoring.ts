export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskTrend = 'STABLE' | 'RISING' | 'FALLING';
export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EventStatus = 'PENDING' | 'ACKNOWLEDGED' | 'REVIEWED' | 'DISMISSED';
export type CandidateStatus = 'ACTIVE' | 'WARNED' | 'TERMINATED' | 'COMPLETED';
export type StreamStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE' | 'MUTED' | 'SHARING' | 'PAUSED';

export interface ProctoringEvent {
  eventId: string;
  sessionId: string;
  candidateId: string;
  candidateName?: string;
  type: 
    | 'PROCTORING_ALERT'
    | 'RISK_SCORE_UPDATED'
    | 'FACE_MISMATCH'
    | 'FACE_ABSENT'
    | 'MULTIPLE_PERSONS_DETECTED'
    | 'PHONE_DETECTED'
    | 'OBJECT_DETECTED'
    | 'TAB_SWITCH'
    | 'AUDIO_WARNING'
    | string;
  severity: EventSeverity;
  timestamp: string;
  status: EventStatus;
  description: string;
  evidenceId?: string;
  metadata?: Record<string, any>;
}

export interface RiskScore {
  sessionId: string;
  candidateId: string;
  score: number; // 0 - 100
  level: RiskLevel;
  trend: RiskTrend;
  history: Array<{
    timestamp: string;
    score: number;
  }>;
  lastUpdated: string;
}

export interface Evidence {
  evidenceId: string;
  eventId?: string;
  candidateId: string;
  sessionId: string;
  type: 'SNAPSHOT' | 'AUDIO_CLIP' | 'SCREENSHOT' | 'ROOM_SCAN';
  accessUrl: string;
  expiresAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface CandidateLiveStatus {
  camera: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  mic: 'ACTIVE' | 'MUTED' | 'OFFLINE';
  screen: 'SHARING' | 'PAUSED' | 'OFFLINE';
  lastPing: string;
}

export interface Candidate {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  examId: string;
  examTitle?: string;
  sessionId: string;
  status: CandidateStatus;
  riskScore: RiskScore;
  liveStatus: CandidateLiveStatus;
  warningCount: number;
  lastActive?: string;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RoomScan {
  scanId: string;
  candidateId: string;
  sessionId: string;
  status: 'PENDING' | 'APPROVED' | 'FLAGGED';
  timestamp: string;
  detectedObjects: DetectedObject[];
  detectedPersons: number;
  evidenceUrl: string;
  notes?: string;
}

export interface ProctorNotification {
  notificationId: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INCIDENT' | 'SYSTEM';
  severity: EventSeverity;
  candidateId?: string;
  sessionId?: string;
  timestamp: string;
  read: boolean;
  acknowledged: boolean;
}

export interface Incident {
  incidentId: string;
  sessionId: string;
  candidateId: string;
  candidateName: string;
  examTitle?: string;
  type: string;
  description: string;
  severity: EventSeverity;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AuditEntry {
  auditId: string;
  sessionId: string;
  candidateId?: string;
  examId?: string;
  action: string;
  performedBy: string;
  role: string;
  details: string;
  timestamp: string;
}

export interface ProctoringReport {
  sessionId: string;
  examId: string;
  examTitle: string;
  candidateName: string;
  candidateId: string;
  summary: {
    totalEvents: number;
    acknowledgedEvents: number;
    reviewedEvents: number;
    dismissedEvents: number;
    averageRiskScore: number;
    peakRiskScore: number;
    finalStatus: CandidateStatus;
    durationMinutes: number;
  };
  events: ProctoringEvent[];
  roomScans: RoomScan[];
  generatedAt: string;
  pdfUrl?: string;
  jsonUrl?: string;
}

export interface SystemHealth {
  ai: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  websocket: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  redis: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  database: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  storage: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  details?: Record<string, any>;
  lastChecked: string;
}

export interface RiskConfiguration {
  weights: Record<string, number>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  autoEscalate: boolean;
}

export interface ProctorNote {
  noteId: string;
  candidateId: string;
  proctorId: string;
  proctorName: string;
  text: string;
  timestamp: string;
}

// WebSocket Event Payload Contracts
export type WebSocketEventType =
  | 'PROCTORING_ALERT'
  | 'RISK_SCORE_UPDATED'
  | 'FACE_MISMATCH'
  | 'FACE_ABSENT'
  | 'MULTIPLE_PERSONS_DETECTED'
  | 'PHONE_DETECTED'
  | 'OBJECT_DETECTED';

export interface BaseSocketPayload {
  eventId?: string;
  sessionId: string;
  candidateId: string;
  timestamp: string;
}

export interface ProctoringAlertPayload extends BaseSocketPayload {
  alertType: string;
  severity: EventSeverity;
  description: string;
  evidenceId?: string;
}

export interface RiskScoreUpdatedPayload extends BaseSocketPayload {
  newScore: number;
  level: RiskLevel;
  trend: RiskTrend;
  reason?: string;
}

export interface FaceMismatchPayload extends BaseSocketPayload {
  confidence: number;
  evidenceId?: string;
}

export interface FaceAbsentPayload extends BaseSocketPayload {
  durationSeconds: number;
  evidenceId?: string;
}

export interface MultiplePersonsDetectedPayload extends BaseSocketPayload {
  personCount: number;
  evidenceId?: string;
}

export interface PhoneDetectedPayload extends BaseSocketPayload {
  confidence: number;
  evidenceId?: string;
}

export interface ObjectDetectedPayload extends BaseSocketPayload {
  objectLabel: string;
  confidence: number;
  evidenceId?: string;
}

export type SocketEventPayloadMap = {
  PROCTORING_ALERT: ProctoringAlertPayload;
  RISK_SCORE_UPDATED: RiskScoreUpdatedPayload;
  FACE_MISMATCH: FaceMismatchPayload;
  FACE_ABSENT: FaceAbsentPayload;
  MULTIPLE_PERSONS_DETECTED: MultiplePersonsDetectedPayload;
  PHONE_DETECTED: PhoneDetectedPayload;
  OBJECT_DETECTED: ObjectDetectedPayload;
};
