'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProctorStore } from '@/stores/proctorStore';
import { proctorApi } from '@/services/proctorApi';
import { Candidate, ProctoringEvent, RoomScan, ProctorNote } from '@/types';
import { RiskGauge } from '@/components/proctor/RiskGauge';
import { EventTimeline } from '@/components/proctor/EventTimeline';
import { RoomScanViewer } from '@/components/proctor/RoomScanViewer';
import { EvidenceModal } from '@/components/proctor/EvidenceModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Mic,
  MicOff,
  Monitor,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CandidateLiveMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params.id as string;
  const { toast } = useToast();

  const candidate = useProctorStore((state) => state.candidates.find((c) => c._id === candidateId));
  const candidateEvents = useProctorStore((state) => state.candidateEvents[candidateId] || []);
  const submitReview = useProctorStore((state) => state.submitCandidateReviewOptimistic);
  const escalateCandidate = useProctorStore((state) => state.escalateCandidateOptimistic);
  const addNote = useProctorStore((state) => state.addCandidateNoteOptimistic);

  const [localEvents, setLocalEvents] = useState<ProctoringEvent[]>([]);
  const [roomScans, setRoomScans] = useState<RoomScan[]>([]);
  const [notes, setNotes] = useState<ProctorNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!candidateId) return;

    setLoading(true);
    proctorApi
      .getCandidateLive(candidateId)
      .then((data) => {
        setRoomScans(data.roomScans || []);
        if (data.events) {
          setLocalEvents(data.events);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch candidate live monitoring data:', err);
        setLoading(false);
      });
  }, [candidateId]);

  const displayEvents = candidateEvents.length > 0 ? candidateEvents : localEvents;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    await addNote(candidateId, newNoteText);
    setNotes([
      {
        noteId: `note-${Date.now()}`,
        candidateId,
        proctorId: 'proc-1',
        proctorName: 'Proctor Admin',
        text: newNoteText,
        timestamp: new Date().toISOString(),
      },
      ...notes,
    ]);
    setNewNoteText('');
    toast({ title: 'Note Saved', description: 'Proctor note appended to session log.' });
  };

  const handleReviewAction = async (decision: 'PASS' | 'WARN' | 'TERMINATE') => {
    const confirmMsg =
      decision === 'TERMINATE'
        ? 'Are you sure you want to DISQUALIFY and TERMINATE this exam session?'
        : `Submit decision: ${decision}?`;
    if (!confirm(confirmMsg)) return;

    await submitReview(candidateId, decision, reviewReason);
    setReviewReason('');
    toast({
      title: 'Review Decision Submitted',
      description: `Candidate status updated to ${decision}`,
    });
  };

  const handleEscalate = async () => {
    if (!reviewReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for escalation.', variant: 'destructive' });
      return;
    }
    await escalateCandidate(candidateId, reviewReason);
    setReviewReason('');
    toast({ title: 'Incident Escalated', description: 'Technical incident log created for committee review.' });
  };

  if (loading && !candidate) {
    return (
      <div className="flex h-96 items-center justify-center space-y-3 flex-col">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Initializing candidate live stream feeds...</p>
      </div>
    );
  }

  const currentCand = candidate || {
    _id: candidateId,
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    studentId: 'STU-1001',
    examId: 'exam-101',
    examTitle: 'Advanced Computer Architecture',
    sessionId: 'sess-881',
    status: 'ACTIVE' as const,
    warningCount: 1,
    liveStatus: { camera: 'ACTIVE' as const, mic: 'ACTIVE' as const, screen: 'SHARING' as const, lastPing: new Date().toISOString() },
    riskScore: {
      sessionId: 'sess-881',
      candidateId,
      score: 15,
      level: 'LOW' as const,
      trend: 'STABLE' as const,
      history: [{ timestamp: new Date().toISOString(), score: 15 }],
      lastUpdated: new Date().toISOString(),
    },
  };

  return (
    <div className="space-y-6">
      {/* Evidence Viewer Modal */}
      <EvidenceModal evidenceId={selectedEvidenceId} onClose={() => setSelectedEvidenceId(null)} />

      {/* Top Navigation & Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => router.push('/proctor/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{currentCand.name}</h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                {currentCand.studentId || currentCand._id}
              </Badge>
              <Badge
                className={`text-[10px] font-bold uppercase ${
                  currentCand.status === 'WARNED'
                    ? 'bg-amber-500'
                    : currentCand.status === 'TERMINATED'
                    ? 'bg-destructive'
                    : 'bg-emerald-500'
                }`}
              >
                {currentCand.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exam: <span className="font-medium text-foreground">{currentCand.examTitle}</span> | Email:{' '}
              {currentCand.email}
            </p>
          </div>
        </div>

        {/* Quick Action Decision Bar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            onClick={() => handleReviewAction('WARN')}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Issue Warning
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleReviewAction('TERMINATE')}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Disqualify Session
          </Button>
        </div>
      </div>

      {/* Live Stream Tiles (Camera / Mic / Screen) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Webcam Stream Tile */}
        <Card className="border-muted overflow-hidden">
          <CardHeader className="p-3 bg-muted/30 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Camera className="h-4 w-4 text-primary" />
              <span>Candidate Webcam Stream</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] ${
                currentCand.liveStatus?.camera === 'ACTIVE'
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                  : 'bg-destructive/15 text-destructive border-destructive/30'
              }`}
            >
              {currentCand.liveStatus?.camera || 'ACTIVE'}
            </Badge>
          </CardHeader>
          <CardContent className="p-0 bg-black aspect-video flex items-center justify-center relative group">
            {/* Simulated Live Stream Preview Frame */}
            {/* eslint-disable-next-html-element-suppression */}
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80"
              alt="Candidate Video Stream"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-mono">
              REC ● 720p 30fps
            </div>
          </CardContent>
        </Card>

        {/* Screen Recording Stream Tile */}
        <Card className="border-muted overflow-hidden">
          <CardHeader className="p-3 bg-muted/30 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <Monitor className="h-4 w-4 text-primary" />
              <span>Live Screen Feed</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[9px] ${
                currentCand.liveStatus?.screen === 'SHARING'
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
              }`}
            >
              {currentCand.liveStatus?.screen || 'SHARING'}
            </Badge>
          </CardHeader>
          <CardContent className="p-0 bg-black aspect-video flex items-center justify-center relative">
            {/* eslint-disable-next-html-element-suppression */}
            <img
              src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80"
              alt="Screen Feed"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded font-mono">
              SCREEN 1 ● ACTIVE
            </div>
          </CardContent>
        </Card>

        {/* Mic / Audio Spectrum Tile */}
        <Card className="border-muted overflow-hidden">
          <CardHeader className="p-3 bg-muted/30 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              {currentCand.liveStatus?.mic === 'MUTED' ? (
                <MicOff className="h-4 w-4 text-amber-500" />
              ) : (
                <Mic className="h-4 w-4 text-primary" />
              )}
              <span>Audio Stream</span>
            </div>
            <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
              {currentCand.liveStatus?.mic || 'ACTIVE'}
            </Badge>
          </CardHeader>
          <CardContent className="p-6 bg-card aspect-video flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-1">
              <span className="h-8 w-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span className="h-12 w-1.5 bg-emerald-500 rounded-full animate-bounce delay-75" />
              <span className="h-6 w-1.5 bg-emerald-500 rounded-full animate-bounce delay-150" />
              <span className="h-10 w-1.5 bg-emerald-500 rounded-full animate-bounce delay-100" />
              <span className="h-4 w-1.5 bg-emerald-500 rounded-full animate-bounce" />
            </div>
            <p className="text-xs text-muted-foreground font-mono">Audio Noise Level: Normal (-42 dB)</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Risk Score Gauge + Event Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Risk Score Component */}
          <RiskGauge riskScore={currentCand.riskScore} />

          {/* Proctor Notes Panel */}
          <Card className="border-muted">
            <CardHeader className="p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Proctor Log Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Type proctor note or observation..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
                <Button type="submit" size="sm" className="w-full h-8 text-xs">
                  Save Note
                </Button>
              </form>

              {notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t text-xs">
                  {notes.map((n) => (
                    <div key={n.noteId} className="p-2 rounded bg-accent/30 border">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span className="font-semibold">{n.proctorName}</span>
                        <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-foreground text-xs">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Incident Escalation Box */}
          <Card className="border-muted">
            <CardHeader className="p-4 border-b">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm font-semibold">Escalate Incident</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder="Reason for technical escalation to admin..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={handleEscalate}
              >
                Escalate Technical Incident
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Timeline & Room Scan Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline" className="text-xs">
                Event Timeline Feed ({displayEvents.length})
              </TabsTrigger>
              <TabsTrigger value="roomscans" className="text-xs">
                Room-Scan 360 Verification ({roomScans.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <EventTimeline events={displayEvents} onSelectEvidence={(id) => setSelectedEvidenceId(id)} />
            </TabsContent>

            <TabsContent value="roomscans" className="mt-4">
              <RoomScanViewer roomScans={roomScans} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
