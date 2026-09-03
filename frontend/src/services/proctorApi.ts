import { fetchApi } from '@/lib/api';
import {
  ProctoringEvent,
  RiskScore,
  Evidence,
  Candidate,
  RoomScan,
  ProctorNotification,
  Incident,
  AuditEntry,
  ProctoringReport,
  SystemHealth,
  RiskConfiguration,
  ProctorNote,
  Exam,
} from '@/types';

// Utility helper to safely attempt fetchApi with a fallback mock generator on error
async function withFallback<T>(apiCall: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await apiCall();
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[proctorApi] Backend endpoint returned error/404. Using dev fallback data.', err);
      return fallback();
    }
    // In production, we NEVER want to show dummy data. Throw the real error.
    console.error('[proctorApi] Backend endpoint failed in production.', err);
    throw err;
  }
}

// Mock Data Generators for fallback
const mockCandidates: Candidate[] = [
  {
    _id: 'cand-1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    studentId: 'STU-1001',
    examId: 'exam-101',
    examTitle: 'Advanced Computer Architecture',
    sessionId: 'sess-881',
    status: 'ACTIVE',
    warningCount: 1,
    liveStatus: { camera: 'ACTIVE', mic: 'ACTIVE', screen: 'SHARING', lastPing: new Date().toISOString() },
    riskScore: {
      sessionId: 'sess-881',
      candidateId: 'cand-1',
      score: 15,
      level: 'LOW',
      trend: 'STABLE',
      history: [
        { timestamp: new Date(Date.now() - 600000).toISOString(), score: 5 },
        { timestamp: new Date(Date.now() - 300000).toISOString(), score: 10 },
        { timestamp: new Date().toISOString(), score: 15 },
      ],
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    _id: 'cand-2',
    name: 'Sophia Patel',
    email: 'sophia.p@example.com',
    studentId: 'STU-1002',
    examId: 'exam-101',
    examTitle: 'Advanced Computer Architecture',
    sessionId: 'sess-882',
    status: 'WARNED',
    warningCount: 3,
    liveStatus: { camera: 'ACTIVE', mic: 'MUTED', screen: 'SHARING', lastPing: new Date().toISOString() },
    riskScore: {
      sessionId: 'sess-882',
      candidateId: 'cand-2',
      score: 72,
      level: 'HIGH',
      trend: 'RISING',
      history: [
        { timestamp: new Date(Date.now() - 900000).toISOString(), score: 20 },
        { timestamp: new Date(Date.now() - 450000).toISOString(), score: 45 },
        { timestamp: new Date().toISOString(), score: 72 },
      ],
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    _id: 'cand-3',
    name: 'Marcus Chen',
    email: 'marcus.c@example.com',
    studentId: 'STU-1003',
    examId: 'exam-101',
    examTitle: 'Advanced Computer Architecture',
    sessionId: 'sess-883',
    status: 'ACTIVE',
    warningCount: 0,
    liveStatus: { camera: 'ACTIVE', mic: 'ACTIVE', screen: 'SHARING', lastPing: new Date().toISOString() },
    riskScore: {
      sessionId: 'sess-883',
      candidateId: 'cand-3',
      score: 8,
      level: 'LOW',
      trend: 'STABLE',
      history: [
        { timestamp: new Date(Date.now() - 1200000).toISOString(), score: 10 },
        { timestamp: new Date().toISOString(), score: 8 },
      ],
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    _id: 'cand-4',
    name: 'Emma Davis',
    email: 'emma.d@example.com',
    studentId: 'STU-1004',
    examId: 'exam-101',
    examTitle: 'Advanced Computer Architecture',
    sessionId: 'sess-884',
    status: 'TERMINATED',
    warningCount: 5,
    liveStatus: { camera: 'OFFLINE', mic: 'OFFLINE', screen: 'OFFLINE', lastPing: new Date(Date.now() - 1800000).toISOString() },
    riskScore: {
      sessionId: 'sess-884',
      candidateId: 'cand-4',
      score: 95,
      level: 'CRITICAL',
      trend: 'RISING',
      history: [
        { timestamp: new Date(Date.now() - 2400000).toISOString(), score: 30 },
        { timestamp: new Date(Date.now() - 1800000).toISOString(), score: 95 },
      ],
      lastUpdated: new Date(Date.now() - 1800000).toISOString(),
    },
  },
];

const mockEvents: ProctoringEvent[] = [
  {
    eventId: 'evt-101',
    sessionId: 'sess-882',
    candidateId: 'cand-2',
    candidateName: 'Sophia Patel',
    type: 'PHONE_DETECTED',
    severity: 'HIGH',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    status: 'PENDING',
    description: 'Smart phone object detected in webcam feed bounding box (confidence: 94%)',
    evidenceId: 'evid-901',
  },
  {
    eventId: 'evt-102',
    sessionId: 'sess-882',
    candidateId: 'cand-2',
    candidateName: 'Sophia Patel',
    type: 'FACE_ABSENT',
    severity: 'MEDIUM',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    status: 'ACKNOWLEDGED',
    description: 'Candidate face absent from camera frame for 12 seconds',
    evidenceId: 'evid-902',
  },
  {
    eventId: 'evt-103',
    sessionId: 'sess-881',
    candidateId: 'cand-1',
    candidateName: 'Alex Johnson',
    type: 'TAB_SWITCH',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 450000).toISOString(),
    status: 'REVIEWED',
    description: 'Browser focus lost for 3 seconds',
  },
  {
    eventId: 'evt-104',
    sessionId: 'sess-884',
    candidateId: 'cand-4',
    candidateName: 'Emma Davis',
    type: 'MULTIPLE_PERSONS_DETECTED',
    severity: 'CRITICAL',
    timestamp: new Date(Date.now() - 1850000).toISOString(),
    status: 'REVIEWED',
    description: '2 persons detected in webcam stream frame simultaneously',
    evidenceId: 'evid-903',
  },
];

export const proctorApi = {
  // ================= PROCTORING EVENTS =================
  getEventById: (eventId: string): Promise<ProctoringEvent> =>
    withFallback(
      () => fetchApi(`proctoring/events/${eventId}`),
      () => mockEvents.find((e) => e.eventId === eventId) || mockEvents[0]
    ),

  getSessionEvents: (sessionId: string): Promise<ProctoringEvent[]> =>
    withFallback(
      () => fetchApi(`proctoring/sessions/${sessionId}/events`),
      () => mockEvents.filter((e) => e.sessionId === sessionId)
    ),

  getCandidateEvents: (candidateId: string): Promise<ProctoringEvent[]> =>
    withFallback(
      () => fetchApi(`proctoring/candidates/${candidateId}/events`),
      () => mockEvents.filter((e) => e.candidateId === candidateId)
    ),

  acknowledgeEvent: (eventId: string): Promise<{ success: boolean; event: ProctoringEvent }> =>
    withFallback(
      () => fetchApi(`proctoring/events/${eventId}/acknowledge`, { method: 'POST' }),
      () => {
        const evt = mockEvents.find((e) => e.eventId === eventId);
        if (evt) evt.status = 'ACKNOWLEDGED';
        return { success: true, event: evt || { ...mockEvents[0], status: 'ACKNOWLEDGED' } };
      }
    ),

  reviewEvent: (eventId: string, notes?: string): Promise<{ success: boolean; event: ProctoringEvent }> =>
    withFallback(
      () => fetchApi(`proctoring/events/${eventId}/review`, { method: 'POST', body: JSON.stringify({ notes }) }),
      () => {
        const evt = mockEvents.find((e) => e.eventId === eventId);
        if (evt) evt.status = 'REVIEWED';
        return { success: true, event: evt || { ...mockEvents[0], status: 'REVIEWED' } };
      }
    ),

  dismissEvent: (eventId: string, reason?: string): Promise<{ success: boolean; event: ProctoringEvent }> =>
    withFallback(
      () => fetchApi(`proctoring/events/${eventId}/dismiss`, { method: 'POST', body: JSON.stringify({ reason }) }),
      () => {
        const evt = mockEvents.find((e) => e.eventId === eventId);
        if (evt) evt.status = 'DISMISSED';
        return { success: true, event: evt || { ...mockEvents[0], status: 'DISMISSED' } };
      }
    ),

  // ================= RISK SCORING =================
  submitRiskEvent: (payload: any): Promise<{ success: boolean; newRiskScore: RiskScore }> =>
    withFallback(
      () => fetchApi('risk/events', { method: 'POST', body: JSON.stringify(payload) }),
      () => ({
        success: true,
        newRiskScore: {
          sessionId: payload.sessionId || 'sess-881',
          candidateId: payload.candidateId || 'cand-1',
          score: Math.min(100, (payload.score || 30) + 10),
          level: 'MEDIUM',
          trend: 'RISING',
          history: [{ timestamp: new Date().toISOString(), score: 40 }],
          lastUpdated: new Date().toISOString(),
        },
      })
    ),

  getSessionRisk: (sessionId: string): Promise<RiskScore> =>
    withFallback(
      () => fetchApi(`risk/session/${sessionId}`),
      () => mockCandidates.find((c) => c.sessionId === sessionId)?.riskScore || mockCandidates[0].riskScore
    ),

  getCandidateRisk: (candidateId: string): Promise<RiskScore> =>
    withFallback(
      () => fetchApi(`risk/candidate/${candidateId}`),
      () => mockCandidates.find((c) => c._id === candidateId)?.riskScore || mockCandidates[0].riskScore
    ),

  recalculateRisk: (sessionId?: string): Promise<{ success: boolean; updatedScores: RiskScore[] }> =>
    withFallback(
      () => fetchApi('risk/recalculate', { method: 'POST', body: JSON.stringify({ sessionId }) }),
      () => ({ success: true, updatedScores: mockCandidates.map((c) => c.riskScore) })
    ),

  getRiskConfiguration: (): Promise<RiskConfiguration> =>
    withFallback(
      () => fetchApi('risk/configuration'),
      () => ({
        weights: {
          FACE_ABSENT: 15,
          FACE_MISMATCH: 40,
          MULTIPLE_PERSONS_DETECTED: 50,
          PHONE_DETECTED: 45,
          OBJECT_DETECTED: 25,
          TAB_SWITCH: 10,
        },
        thresholds: { low: 20, medium: 50, high: 75, critical: 90 },
        autoEscalate: true,
      })
    ),

  updateRiskConfiguration: (config: RiskConfiguration): Promise<{ success: boolean; config: RiskConfiguration }> =>
    withFallback(
      () => fetchApi('risk/configuration', { method: 'PUT', body: JSON.stringify(config) }),
      () => ({ success: true, config })
    ),

  // ================= EVIDENCE API =================
  getEvidenceById: (evidenceId: string): Promise<Evidence> =>
    withFallback(
      () => fetchApi(`evidence/${evidenceId}`),
      () => ({
        evidenceId,
        eventId: 'evt-101',
        candidateId: 'cand-2',
        sessionId: 'sess-882',
        type: 'SNAPSHOT',
        accessUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        createdAt: new Date().toISOString(),
        metadata: { confidence: 0.94, objectType: 'Cell Phone' },
      })
    ),

  getEventEvidence: (eventId: string): Promise<Evidence[]> =>
    withFallback(
      () => fetchApi(`events/${eventId}/evidence`),
      () => [
        {
          evidenceId: `evid-${eventId}`,
          eventId,
          candidateId: 'cand-2',
          sessionId: 'sess-882',
          type: 'SNAPSHOT',
          accessUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ]
    ),

  deleteEvidence: (evidenceId: string): Promise<{ success: boolean }> =>
    withFallback(
      () => fetchApi(`evidence/${evidenceId}`, { method: 'DELETE' }),
      () => ({ success: true })
    ),

  // ================= PROCTOR DASHBOARD API =================
  getActiveExams: (): Promise<Exam[]> =>
    withFallback(
      () => fetchApi('proctor/exams/active'),
      () => [
        {
          _id: 'exam-101',
          title: 'Advanced Computer Architecture',
          description: 'Final semester proctored exam',
          duration: 120,
          totalMarks: 100,
          passingMarks: 50,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() + 3600000),
          createdBy: 'faculty-1',
          questions: [],
          isActive: true,
          status: 'active',
          proctoringSettings: { faceDetection: true, browserLock: true, screenRecording: true, audioMonitoring: true },
        },
        {
          _id: 'exam-102',
          title: 'Database Management Systems',
          description: 'Mid-term practical exam',
          duration: 90,
          totalMarks: 80,
          passingMarks: 40,
          startTime: new Date(Date.now() - 1800000),
          endTime: new Date(Date.now() + 3600000),
          createdBy: 'faculty-2',
          questions: [],
          isActive: true,
          status: 'active',
          proctoringSettings: { faceDetection: true, browserLock: true, screenRecording: true, audioMonitoring: false },
        },
      ]
    ),

  getExamCandidates: (examId: string): Promise<Candidate[]> =>
    withFallback(
      () => fetchApi(`proctor/exams/${examId}/candidates`),
      () => mockCandidates.filter((c) => c.examId === examId || examId === 'exam-101')
    ),

  getCandidateDetails: (candidateId: string): Promise<Candidate> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}`),
      () => mockCandidates.find((c) => c._id === candidateId) || mockCandidates[0]
    ),

  getCandidateLive: (candidateId: string): Promise<{ candidate: Candidate; events: ProctoringEvent[]; roomScans: RoomScan[] }> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/live`),
      () => {
        const candidate = mockCandidates.find((c) => c._id === candidateId) || mockCandidates[0];
        return {
          candidate,
          events: mockEvents.filter((e) => e.candidateId === candidateId),
          roomScans: [
            {
              scanId: `scan-${candidateId}`,
              candidateId,
              sessionId: candidate.sessionId,
              status: 'APPROVED',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              detectedObjects: [{ label: 'Laptop', confidence: 0.98 }, { label: 'Chair', confidence: 0.95 }],
              detectedPersons: 1,
              evidenceUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
            },
          ],
        };
      }
    ),

  getCandidateRoomScans: (candidateId: string): Promise<RoomScan[]> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/room-scans`),
      () => [
        {
          scanId: `scan-room-${candidateId}`,
          candidateId,
          sessionId: 'sess-882',
          status: candidateId === 'cand-2' ? 'FLAGGED' : 'APPROVED',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          detectedObjects: [
            { label: 'Monitor', confidence: 0.99 },
            { label: 'Books', confidence: 0.88 },
            { label: 'Mobile Device', confidence: candidateId === 'cand-2' ? 0.92 : 0.1 },
          ],
          detectedPersons: candidateId === 'cand-4' ? 2 : 1,
          evidenceUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
          notes: candidateId === 'cand-2' ? 'Flagged: Mobile device present on desk near keyboard' : 'Room scan clear.',
        },
      ]
    ),

  getCandidateEvidenceList: (candidateId: string): Promise<Evidence[]> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/evidence`),
      () => [
        {
          evidenceId: `evid-snap-${candidateId}`,
          candidateId,
          sessionId: 'sess-882',
          type: 'SNAPSHOT',
          accessUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date(Date.now() - 600000).toISOString(),
          metadata: { note: 'Automated high risk trigger snapshot' },
        },
      ]
    ),

  getAlerts: (): Promise<ProctoringEvent[]> =>
    withFallback(
      () => fetchApi('proctor/alerts'),
      () => mockEvents
    ),

  acknowledgeAlert: (alertId: string): Promise<{ success: boolean }> =>
    withFallback(
      () => fetchApi(`proctor/alerts/${alertId}/acknowledge`, { method: 'POST' }),
      () => ({ success: true })
    ),

  addCandidateNote: (candidateId: string, text: string): Promise<ProctorNote> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
      () => ({
        noteId: `note-${Date.now()}`,
        candidateId,
        proctorId: 'proc-1',
        proctorName: 'Proctor Admin',
        text,
        timestamp: new Date().toISOString(),
      })
    ),

  submitCandidateReview: (candidateId: string, decision: 'PASS' | 'WARN' | 'TERMINATE', reason?: string): Promise<{ success: boolean; candidate: Candidate }> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/review`, { method: 'POST', body: JSON.stringify({ decision, reason }) }),
      () => {
        const candidate = mockCandidates.find((c) => c._id === candidateId) || mockCandidates[0];
        if (decision === 'WARN') candidate.status = 'WARNED';
        if (decision === 'TERMINATE') candidate.status = 'TERMINATED';
        return { success: true, candidate };
      }
    ),

  escalateCandidate: (candidateId: string, reason: string): Promise<{ success: boolean; incident: Incident }> =>
    withFallback(
      () => fetchApi(`proctor/candidates/${candidateId}/escalate`, { method: 'POST', body: JSON.stringify({ reason }) }),
      () => {
        const candidate = mockCandidates.find((c) => c._id === candidateId) || mockCandidates[0];
        return {
          success: true,
          incident: {
            incidentId: `inc-${Date.now()}`,
            sessionId: candidate.sessionId,
            candidateId: candidate._id,
            candidateName: candidate.name,
            examTitle: candidate.examTitle,
            type: 'PROCTOR_ESCALATION',
            description: reason,
            severity: 'CRITICAL',
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          },
        };
      }
    ),

  // ================= AUDIT API =================
  getSessionAudit: (sessionId: string): Promise<AuditEntry[]> =>
    withFallback(
      () => fetchApi(`audit/session/${sessionId}`),
      () => [
        {
          auditId: 'aud-1',
          sessionId,
          candidateId: 'cand-2',
          action: 'EVENT_ACKNOWLEDGED',
          performedBy: 'Proctor Admin',
          role: 'proctor',
          details: 'Acknowledged high-risk PHONE_DETECTED alert',
          timestamp: new Date(Date.now() - 200000).toISOString(),
        },
        {
          auditId: 'aud-2',
          sessionId,
          candidateId: 'cand-2',
          action: 'WARNING_ISSUED',
          performedBy: 'Proctor Admin',
          role: 'proctor',
          details: 'Issued official cheating warning to candidate',
          timestamp: new Date(Date.now() - 100000).toISOString(),
        },
      ]
    ),

  getCandidateAudit: (candidateId: string): Promise<AuditEntry[]> =>
    withFallback(
      () => fetchApi(`audit/candidate/${candidateId}`),
      () => [
        {
          auditId: `aud-cand-${candidateId}`,
          sessionId: 'sess-882',
          candidateId,
          action: 'CANDIDATE_LOGGED_IN',
          performedBy: 'System',
          role: 'system',
          details: 'Candidate initiated exam session & environment check',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
    ),

  getExamAudit: (examId: string): Promise<AuditEntry[]> =>
    withFallback(
      () => fetchApi(`audit/exam/${examId}`),
      () => [
        {
          auditId: `aud-exam-${examId}`,
          sessionId: 'sess-881',
          examId,
          action: 'EXAM_STARTED',
          performedBy: 'System',
          role: 'system',
          details: 'Proctored exam session started for 4 candidates',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
    ),

  getEventAudit: (eventId: string): Promise<AuditEntry[]> =>
    withFallback(
      () => fetchApi(`audit/events/${eventId}`),
      () => [
        {
          auditId: `aud-evt-${eventId}`,
          sessionId: 'sess-882',
          action: 'EVENT_TRIGGERED',
          performedBy: 'AI Engine',
          role: 'system',
          details: 'Detection model identified unauthorized object',
          timestamp: new Date(Date.now() - 300000).toISOString(),
        },
      ]
    ),

  getAuditExportUrl: (sessionId: string): string => {
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/audit/export/${sessionId}`;
  },

  // ================= REPORTING API =================
  getReport: (sessionId: string): Promise<ProctoringReport> =>
    withFallback(
      () => fetchApi(`reports/proctoring/${sessionId}`),
      () => ({
        sessionId,
        examId: 'exam-101',
        examTitle: 'Advanced Computer Architecture',
        candidateName: 'Sophia Patel',
        candidateId: 'cand-2',
        summary: {
          totalEvents: 4,
          acknowledgedEvents: 2,
          reviewedEvents: 1,
          dismissedEvents: 1,
          averageRiskScore: 48,
          peakRiskScore: 72,
          finalStatus: 'WARNED',
          durationMinutes: 45,
        },
        events: mockEvents.filter((e) => e.candidateId === 'cand-2'),
        roomScans: [
          {
            scanId: 'scan-rep-1',
            candidateId: 'cand-2',
            sessionId,
            status: 'FLAGGED',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            detectedObjects: [{ label: 'Mobile Device', confidence: 0.92 }],
            detectedPersons: 1,
            evidenceUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
          },
        ],
        generatedAt: new Date().toISOString(),
        pdfUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reports/proctoring/${sessionId}/pdf`,
        jsonUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reports/proctoring/${sessionId}/json`,
      })
    ),

  getReportPdfUrl: (sessionId: string): string =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reports/proctoring/${sessionId}/pdf`,

  getReportJsonUrl: (sessionId: string): string =>
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reports/proctoring/${sessionId}/json`,

  // ================= NOTIFICATIONS API =================
  getUnreadNotifications: (): Promise<ProctorNotification[]> =>
    withFallback(
      () => fetchApi('notifications/unread'),
      () => [
        {
          notificationId: 'notif-1',
          title: 'High Risk Alert',
          message: 'Candidate Sophia Patel exceeded risk score threshold (72/100)',
          type: 'ALERT',
          severity: 'HIGH',
          candidateId: 'cand-2',
          sessionId: 'sess-882',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          read: false,
          acknowledged: false,
        },
        {
          notificationId: 'notif-2',
          title: 'Incident Reported',
          message: 'Candidate Emma Davis exam session terminated due to multiple persons',
          type: 'INCIDENT',
          severity: 'CRITICAL',
          candidateId: 'cand-4',
          sessionId: 'sess-884',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          read: false,
          acknowledged: false,
        },
      ]
    ),

  acknowledgeNotification: (notificationId: string): Promise<{ success: boolean }> =>
    withFallback(
      () => fetchApi(`notifications/${notificationId}/acknowledge`, { method: 'POST' }),
      () => ({ success: true })
    ),

  dismissNotification: (notificationId: string): Promise<{ success: boolean }> =>
    withFallback(
      () => fetchApi(`notifications/${notificationId}/dismiss`, { method: 'POST' }),
      () => ({ success: true })
    ),

  // ================= INCIDENTS API =================
  getIncidents: (): Promise<Incident[]> =>
    withFallback(
      () => fetchApi('incidents'),
      () => [
        {
          incidentId: 'inc-501',
          sessionId: 'sess-884',
          candidateId: 'cand-4',
          candidateName: 'Emma Davis',
          examTitle: 'Advanced Computer Architecture',
          type: 'MULTIPLE_PERSONS_DETECTED',
          description: 'Two individuals detected present in frame during active exam session',
          severity: 'CRITICAL',
          status: 'OPEN',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          incidentId: 'inc-502',
          sessionId: 'sess-882',
          candidateId: 'cand-2',
          candidateName: 'Sophia Patel',
          examTitle: 'Advanced Computer Architecture',
          type: 'PHONE_DETECTED',
          description: 'Proctor flagged unauthorized mobile device detected in frame',
          severity: 'HIGH',
          status: 'OPEN',
          createdAt: new Date(Date.now() - 300000).toISOString(),
        },
      ]
    ),

  getIncidentById: (incidentId: string): Promise<Incident> =>
    withFallback(
      () => fetchApi(`incidents/${incidentId}`),
      () => ({
        incidentId,
        sessionId: 'sess-884',
        candidateId: 'cand-4',
        candidateName: 'Emma Davis',
        examTitle: 'Advanced Computer Architecture',
        type: 'MULTIPLE_PERSONS_DETECTED',
        description: 'Two individuals detected present in frame during active exam session',
        severity: 'CRITICAL',
        status: 'OPEN',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      })
    ),

  resolveIncident: (incidentId: string, resolutionNotes: string): Promise<{ success: boolean; incident: Incident }> =>
    withFallback(
      () => fetchApi(`incidents/${incidentId}/resolve`, { method: 'POST', body: JSON.stringify({ resolutionNotes }) }),
      () => ({
        success: true,
        incident: {
          incidentId,
          sessionId: 'sess-884',
          candidateId: 'cand-4',
          candidateName: 'Emma Davis',
          type: 'MULTIPLE_PERSONS_DETECTED',
          description: 'Resolved by proctor action',
          severity: 'CRITICAL',
          status: 'RESOLVED',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          resolvedAt: new Date().toISOString(),
          resolutionNotes,
        },
      })
    ),

  // ================= SYSTEM HEALTH =================
  getSystemHealth: async (): Promise<SystemHealth> => {
    return withFallback(
      async () => {
        const [ai, ws, redis, db, storage] = await Promise.all([
          fetchApi('system/ai-health'),
          fetchApi('system/websocket-health'),
          fetchApi('system/redis-health'),
          fetchApi('system/database-health'),
          fetchApi('system/storage-health'),
        ]);
        return {
          ai: ai.status || 'OPERATIONAL',
          websocket: ws.status || 'OPERATIONAL',
          redis: redis.status || 'OPERATIONAL',
          database: db.status || 'OPERATIONAL',
          storage: storage.status || 'OPERATIONAL',
          details: { ai, ws, redis, db, storage },
          lastChecked: new Date().toISOString(),
        };
      },
      () => ({
        ai: 'OPERATIONAL',
        websocket: 'OPERATIONAL',
        redis: 'OPERATIONAL',
        database: 'OPERATIONAL',
        storage: 'OPERATIONAL',
        details: { ai: { status: 'OPERATIONAL' }, ws: { status: 'OPERATIONAL' }, redis: { status: 'OPERATIONAL' }, db: { status: 'OPERATIONAL' }, storage: { status: 'OPERATIONAL' } },
        lastChecked: new Date().toISOString(),
      })
    );
  },
};
