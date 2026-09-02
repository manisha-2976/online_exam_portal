import { create } from 'zustand';
import { proctorApi } from '@/services/proctorApi';
import {
  Exam,
  Candidate,
  ProctoringEvent,
  ProctorNotification,
  Incident,
  SystemHealth,
  WebSocketEventType,
  RiskLevel,
  RiskTrend,
} from '@/types';

interface ProctorState {
  // State
  activeExams: Exam[];
  selectedExamId: string | null;
  candidates: Candidate[];
  selectedCandidateId: string | null;
  alerts: ProctoringEvent[];
  candidateEvents: Record<string, ProctoringEvent[]>;
  notifications: ProctorNotification[];
  incidents: Incident[];
  healthStatus: SystemHealth | null;
  isReconnecting: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  setSelectedExamId: (id: string | null) => void;
  setSelectedCandidateId: (id: string | null) => void;
  setIsReconnecting: (isReconnecting: boolean) => void;
  
  // REST Fetches
  fetchInitialData: () => Promise<void>;
  fetchActiveExams: () => Promise<void>;
  fetchCandidates: (examId?: string) => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchIncidents: () => Promise<void>;
  fetchHealth: () => Promise<void>;
  resyncState: () => Promise<void>;

  // Real-Time Socket Ingestion
  ingestSocketEvent: (eventType: WebSocketEventType, payload: any) => void;

  // Optimistic Workflow Actions
  acknowledgeEventOptimistic: (eventId: string) => Promise<void>;
  reviewEventOptimistic: (eventId: string, notes?: string) => Promise<void>;
  dismissEventOptimistic: (eventId: string, reason?: string) => Promise<void>;
  addCandidateNoteOptimistic: (candidateId: string, text: string) => Promise<void>;
  submitCandidateReviewOptimistic: (candidateId: string, decision: 'PASS' | 'WARN' | 'TERMINATE', reason?: string) => Promise<void>;
  escalateCandidateOptimistic: (candidateId: string, reason: string) => Promise<void>;
  resolveIncidentOptimistic: (incidentId: string, resolutionNotes: string) => Promise<void>;
  acknowledgeNotificationOptimistic: (notificationId: string) => Promise<void>;
}

export const useProctorStore = create<ProctorState>((set, get) => ({
  activeExams: [],
  selectedExamId: null,
  candidates: [],
  selectedCandidateId: null,
  alerts: [],
  candidateEvents: {},
  notifications: [],
  incidents: [],
  healthStatus: null,
  isReconnecting: false,
  loading: false,
  error: null,

  setSelectedExamId: (id) => set({ selectedExamId: id }),
  setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),
  setIsReconnecting: (isReconnecting) => set({ isReconnecting }),

  fetchInitialData: async () => {
    set({ loading: true, error: null });
    try {
      const [exams, alerts, notifications, incidents, health] = await Promise.all([
        proctorApi.getActiveExams(),
        proctorApi.getAlerts(),
        proctorApi.getUnreadNotifications(),
        proctorApi.getIncidents(),
        proctorApi.getSystemHealth(),
      ]);

      const selectedExam = exams.length > 0 ? exams[0]._id : null;
      let candidates: Candidate[] = [];
      if (selectedExam) {
        candidates = await proctorApi.getExamCandidates(selectedExam);
      }

      set({
        activeExams: exams,
        selectedExamId: selectedExam,
        candidates,
        alerts,
        notifications,
        incidents,
        healthStatus: health,
        loading: false,
      });
    } catch (err: any) {
      console.error('[proctorStore] Error fetching initial data:', err);
      set({ error: err.message || 'Failed to initialize proctor store', loading: false });
    }
  },

  fetchActiveExams: async () => {
    try {
      const exams = await proctorApi.getActiveExams();
      set({ activeExams: exams });
    } catch (err) {
      console.error('[proctorStore] fetchActiveExams error:', err);
    }
  },

  fetchCandidates: async (examId?: string) => {
    const targetExamId = examId || get().selectedExamId;
    if (!targetExamId) return;
    try {
      const candidates = await proctorApi.getExamCandidates(targetExamId);
      set({ candidates });
    } catch (err) {
      console.error('[proctorStore] fetchCandidates error:', err);
    }
  },

  fetchAlerts: async () => {
    try {
      const alerts = await proctorApi.getAlerts();
      set({ alerts });
    } catch (err) {
      console.error('[proctorStore] fetchAlerts error:', err);
    }
  },

  fetchNotifications: async () => {
    try {
      const notifications = await proctorApi.getUnreadNotifications();
      set({ notifications });
    } catch (err) {
      console.error('[proctorStore] fetchNotifications error:', err);
    }
  },

  fetchIncidents: async () => {
    try {
      const incidents = await proctorApi.getIncidents();
      set({ incidents });
    } catch (err) {
      console.error('[proctorStore] fetchIncidents error:', err);
    }
  },

  fetchHealth: async () => {
    try {
      const health = await proctorApi.getSystemHealth();
      set({ healthStatus: health });
    } catch (err) {
      console.error('[proctorStore] fetchHealth error:', err);
    }
  },

  resyncState: async () => {
    console.log('[proctorStore] Socket reconnected. Re-syncing REST state...');
    await get().fetchInitialData();
    const selectedCandidate = get().selectedCandidateId;
    if (selectedCandidate) {
      try {
        const events = await proctorApi.getCandidateEvents(selectedCandidate);
        set((state) => ({
          candidateEvents: {
            ...state.candidateEvents,
            [selectedCandidate]: events,
          },
        }));
      } catch (e) {
        console.error('[proctorStore] Candidate re-sync error:', e);
      }
    }
  },

  // Real-Time Socket Event Ingestion with Deduplication & Ordering
  ingestSocketEvent: (eventType: WebSocketEventType, payload: any) => {
    const eventId = payload.eventId || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const candidateId = payload.candidateId;
    const sessionId = payload.sessionId;
    const timestamp = payload.timestamp || new Date().toISOString();

    set((state) => {
      // 1. De-duplication check against existing global alerts & candidate events
      const existingAlert = state.alerts.find((a) => a.eventId === eventId);
      if (existingAlert) {
        console.log(`[proctorStore] Duplicate event ${eventId} ignored.`);
        return state;
      }

      // 2. Build new ProctoringEvent object
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = payload.severity || 'MEDIUM';
      let description = payload.description || `${eventType} detected`;

      if (eventType === 'FACE_ABSENT') {
        severity = 'MEDIUM';
        description = `Face absent for ${payload.durationSeconds || 5} seconds`;
      } else if (eventType === 'FACE_MISMATCH') {
        severity = 'HIGH';
        description = `Face mismatch detected (confidence: ${Math.round((payload.confidence || 0.8) * 100)}%)`;
      } else if (eventType === 'MULTIPLE_PERSONS_DETECTED') {
        severity = 'CRITICAL';
        description = `Multiple persons detected (${payload.personCount || 2} in frame)`;
      } else if (eventType === 'PHONE_DETECTED') {
        severity = 'HIGH';
        description = `Unauthorized mobile phone detected in frame`;
      } else if (eventType === 'OBJECT_DETECTED') {
        severity = 'MEDIUM';
        description = `Unauthorized object '${payload.objectLabel || 'unknown'}' detected`;
      }

      const newEvent: ProctoringEvent = {
        eventId,
        sessionId,
        candidateId,
        type: eventType,
        severity,
        timestamp,
        status: 'PENDING',
        description,
        evidenceId: payload.evidenceId,
      };

      // 3. Update candidate list (risk score, last event, warning counts)
      const updatedCandidates = state.candidates.map((cand) => {
        if (cand._id === candidateId || cand.sessionId === sessionId) {
          let updatedScore = cand.riskScore ? cand.riskScore.score : 10;
          let trend: RiskTrend = 'STABLE';

          if (eventType === 'RISK_SCORE_UPDATED') {
            updatedScore = payload.newScore ?? updatedScore;
            trend = payload.trend ?? 'RISING';
          } else {
            // Bump score based on event severity
            const delta = severity === 'CRITICAL' ? 30 : severity === 'HIGH' ? 20 : severity === 'MEDIUM' ? 10 : 5;
            updatedScore = Math.min(100, updatedScore + delta);
            trend = 'RISING';
          }

          const level: RiskLevel =
            updatedScore >= 90 ? 'CRITICAL' : updatedScore >= 70 ? 'HIGH' : updatedScore >= 40 ? 'MEDIUM' : 'LOW';

          const history = [
            ...(cand.riskScore?.history || []),
            { timestamp, score: updatedScore },
          ].slice(-20);

          return {
            ...cand,
            warningCount: severity === 'CRITICAL' || severity === 'HIGH' ? cand.warningCount + 1 : cand.warningCount,
            status: updatedScore >= 90 ? ('WARNED' as const) : cand.status,
            riskScore: {
              sessionId,
              candidateId,
              score: updatedScore,
              level,
              trend,
              history,
              lastUpdated: timestamp,
            },
          };
        }
        return cand;
      });

      // 4. Update global alerts (sorted descending by timestamp)
      const newAlerts = [newEvent, ...state.alerts].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 5. Update candidate-specific timeline
      const candidateTimeline = state.candidateEvents[candidateId] || [];
      const updatedCandidateTimeline = [newEvent, ...candidateTimeline].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 6. Generate unread notification for HIGH/CRITICAL events
      let updatedNotifications = state.notifications;
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        const newNotif: ProctorNotification = {
          notificationId: `notif-${Date.now()}`,
          title: `${severity} Risk Alert: ${eventType.replace(/_/g, ' ')}`,
          message: description,
          type: 'ALERT',
          severity,
          candidateId,
          sessionId,
          timestamp,
          read: false,
          acknowledged: false,
        };
        updatedNotifications = [newNotif, ...state.notifications];
      }

      return {
        candidates: updatedCandidates,
        alerts: newAlerts,
        candidateEvents: {
          ...state.candidateEvents,
          [candidateId]: updatedCandidateTimeline,
        },
        notifications: updatedNotifications,
      };
    });
  },

  // Optimistic UI Actions with automatic Rollback
  acknowledgeEventOptimistic: async (eventId: string) => {
    const previousAlerts = get().alerts;
    const previousCandidateEvents = get().candidateEvents;

    // Optimistic Update
    set((state) => ({
      alerts: state.alerts.map((a) => (a.eventId === eventId ? { ...a, status: 'ACKNOWLEDGED' } : a)),
      candidateEvents: Object.fromEntries(
        Object.entries(state.candidateEvents).map(([cid, evts]) => [
          cid,
          evts.map((e) => (e.eventId === eventId ? { ...e, status: 'ACKNOWLEDGED' } : e)),
        ])
      ),
    }));

    try {
      await proctorApi.acknowledgeEvent(eventId);
    } catch (err) {
      console.error('[proctorStore] acknowledgeEvent failed. Rolling back:', err);
      set({ alerts: previousAlerts, candidateEvents: previousCandidateEvents });
    }
  },

  reviewEventOptimistic: async (eventId: string, notes?: string) => {
    const previousAlerts = get().alerts;
    const previousCandidateEvents = get().candidateEvents;

    set((state) => ({
      alerts: state.alerts.map((a) => (a.eventId === eventId ? { ...a, status: 'REVIEWED' } : a)),
      candidateEvents: Object.fromEntries(
        Object.entries(state.candidateEvents).map(([cid, evts]) => [
          cid,
          evts.map((e) => (e.eventId === eventId ? { ...e, status: 'REVIEWED' } : e)),
        ])
      ),
    }));

    try {
      await proctorApi.reviewEvent(eventId, notes);
    } catch (err) {
      console.error('[proctorStore] reviewEvent failed. Rolling back:', err);
      set({ alerts: previousAlerts, candidateEvents: previousCandidateEvents });
    }
  },

  dismissEventOptimistic: async (eventId: string, reason?: string) => {
    const previousAlerts = get().alerts;
    const previousCandidateEvents = get().candidateEvents;

    set((state) => ({
      alerts: state.alerts.map((a) => (a.eventId === eventId ? { ...a, status: 'DISMISSED' } : a)),
      candidateEvents: Object.fromEntries(
        Object.entries(state.candidateEvents).map(([cid, evts]) => [
          cid,
          evts.map((e) => (e.eventId === eventId ? { ...e, status: 'DISMISSED' } : e)),
        ])
      ),
    }));

    try {
      await proctorApi.dismissEvent(eventId, reason);
    } catch (err) {
      console.error('[proctorStore] dismissEvent failed. Rolling back:', err);
      set({ alerts: previousAlerts, candidateEvents: previousCandidateEvents });
    }
  },

  addCandidateNoteOptimistic: async (candidateId: string, text: string) => {
    try {
      await proctorApi.addCandidateNote(candidateId, text);
    } catch (err) {
      console.error('[proctorStore] addCandidateNote error:', err);
    }
  },

  submitCandidateReviewOptimistic: async (candidateId: string, decision: 'PASS' | 'WARN' | 'TERMINATE', reason?: string) => {
    const previousCandidates = get().candidates;

    set((state) => ({
      candidates: state.candidates.map((c) =>
        c._id === candidateId
          ? {
              ...c,
              status: decision === 'WARN' ? 'WARNED' : decision === 'TERMINATE' ? 'TERMINATED' : c.status,
            }
          : c
      ),
    }));

    try {
      await proctorApi.submitCandidateReview(candidateId, decision, reason);
    } catch (err) {
      console.error('[proctorStore] submitCandidateReview failed. Rolling back:', err);
      set({ candidates: previousCandidates });
    }
  },

  escalateCandidateOptimistic: async (candidateId: string, reason: string) => {
    try {
      const result = await proctorApi.escalateCandidate(candidateId, reason);
      if (result.incident) {
        set((state) => ({
          incidents: [result.incident, ...state.incidents],
        }));
      }
    } catch (err) {
      console.error('[proctorStore] escalateCandidate error:', err);
    }
  },

  resolveIncidentOptimistic: async (incidentId: string, resolutionNotes: string) => {
    const previousIncidents = get().incidents;

    set((state) => ({
      incidents: state.incidents.map((inc) =>
        inc.incidentId === incidentId
          ? { ...inc, status: 'RESOLVED', resolvedAt: new Date().toISOString(), resolutionNotes }
          : inc
      ),
    }));

    try {
      await proctorApi.resolveIncident(incidentId, resolutionNotes);
    } catch (err) {
      console.error('[proctorStore] resolveIncident failed. Rolling back:', err);
      set({ incidents: previousIncidents });
    }
  },

  acknowledgeNotificationOptimistic: async (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.notificationId === notificationId ? { ...n, read: true, acknowledged: true } : n
      ),
    }));

    try {
      await proctorApi.acknowledgeNotification(notificationId);
    } catch (err) {
      console.error('[proctorStore] acknowledgeNotification error:', err);
    }
  },
}));
