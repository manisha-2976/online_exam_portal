'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Camera, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import BackToDashboard from '@/components/BackToDashboard';
import { challengeApi, fetchApi } from '@/lib/api';
import CodeEditor from '@/components/CodeEditor';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  challengeType?: 'coding' | 'bash';
  starterCode: Record<string, string>;
  allowedLanguages: string[];
  timeLimit: number;
  memoryLimit: number;
  proctoring?: {
    webcamEnabled: boolean;
    tabSwitchingEnabled: boolean;
    voiceDetectionEnabled: boolean;
  };
}

interface SubmitResult {
  score: number;
  passedTestCases: number;
  totalTestCases: number;
}

export default function TakeChallengePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [blocked, setBlocked] = useState(false);

  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    const sessionId = sessionStorage.getItem(`challenge-session-${id}`);
    if (!sessionId) {
      // Skipped the proctoring pre-check — send them there first.
      router.replace(`/challenges/${id}/setup`);
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchChallenge();
    }

    return () => {
      activeStreamsRef.current.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
      activeStreamsRef.current = [];
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchChallenge = async () => {
    try {
      setLoading(true);

      // Already submitted? Block re-entry.
      try {
        const sub = await challengeApi.getStudentSubmission(id as string);
        if (sub?.status === 'completed') {
          setBlocked(true);
          toast({ title: 'Already submitted', description: 'You cannot reopen a submitted challenge.' });
          setLoading(false);
          return;
        }
      } catch {
        // no submission yet — fine, continue
      }

      const data = await challengeApi.getById(id as string);
      setChallenge(data);

      if (data.proctoring?.webcamEnabled) await setupWebcam();
      if (data.proctoring?.voiceDetectionEnabled) await setupAudioMonitoring();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load challenge.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const attachStreamToVideo = useCallback(() => {
    if (webcamRef.current && mediaStreamRef.current) {
      if (webcamRef.current.srcObject !== mediaStreamRef.current) {
        webcamRef.current.srcObject = mediaStreamRef.current;
        webcamRef.current.play().catch((err) => console.error('Video play error:', err));
      }
    }
  }, []);

  const setWebcamRef = useCallback((node: HTMLVideoElement | null) => {
    webcamRef.current = node;
    if (node) attachStreamToVideo();
  }, [attachStreamToVideo]);

  useEffect(() => {
    if (challenge?.proctoring?.webcamEnabled && webcamRef.current && mediaStreamRef.current) {
      webcamRef.current.srcObject = mediaStreamRef.current;
      webcamRef.current.play().catch((err) => console.error('Video play error:', err));
    }
  }, [challenge]);

  useEffect(() => {
    if (challenge?.proctoring?.tabSwitchingEnabled) {
      document.addEventListener('visibilitychange', handleTabSwitch);
      return () => document.removeEventListener('visibilitychange', handleTabSwitch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamsRef.current.push(stream);
      mediaStreamRef.current = stream;
      attachStreamToVideo();

      const track = stream.getVideoTracks()[0];
      track.onended = () => addWarning('Camera disconnected');
    } catch (error) {
      console.error('Error accessing webcam:', error);
      addWarning('Failed to access webcam');
    }
  };

  const setupAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamsRef.current.push(stream);
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      let voiceDetectedCount = 0;

      setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average > 50) {
          voiceDetectedCount++;
          if (voiceDetectedCount > 3) {
            addWarning('Multiple voices detected');
            voiceDetectedCount = 0;
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addWarning('Failed to access microphone');
    }
  };

  const handleTabSwitch = () => {
    if (document.hidden) {
      setTabSwitchCount((prev) => {
        const newCount = prev + 1;
        addWarning(`Tab switch detected (${newCount} ${newCount === 1 ? 'time' : 'times'})`);
        return newCount;
      });
    }
  };

  const addWarning = (message: string) => {
    setWarnings((prev) => [...prev, message]);
    toast({ title: 'Warning', description: message, variant: 'destructive' });
  };

  const stopAllMedia = () => {
    activeStreamsRef.current.forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    activeStreamsRef.current = [];
    mediaStreamRef.current = null;
    if (webcamRef.current) webcamRef.current.srcObject = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleRun = async (code: string, language: string) => {
    try {
      setRunning(true);
      setRunOutput('');
      const data = await fetchApi('/api/code/run', {
        method: 'POST',
        body: JSON.stringify({ code, language, challengeId: id }),
      });
      setRunOutput(data.output || data.stdout || 'Code executed successfully.');
    } catch (error: any) {
      setRunOutput(error.message || 'Failed to run code.');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async (code: string, language: string) => {
    try {
      setSubmitting(true);
      const data = await challengeApi.submit(id as string, code, language, { warnings, tabSwitchCount });

      setResult({
        score: data.score,
        passedTestCases: data.passedTestCases,
        totalTestCases: data.totalTestCases,
      });

      toast({
        title: 'Submitted',
        description: `Score: ${data.score}% (${data.passedTestCases}/${data.totalTestCases} test cases passed)`,
      });

      stopAllMedia();
      sessionStorage.removeItem(`challenge-session-${id}`);

      setTimeout(() => router.push('/challenges'), 2500);
    } catch (error: any) {
      toast({ title: 'Submission Failed', description: error.message || 'Failed to submit solution.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="max-w-lg mx-auto text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Already submitted</h3>
          <p className="mt-2 text-sm text-gray-500">This challenge has already been submitted and can't be reopened.</p>
          <Button className="mt-4" onClick={() => router.push('/challenges')}>Back to Challenges</Button>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BackToDashboard />
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Challenge not found</h3>
          <Button className="mt-4" onClick={() => router.push('/challenges')}>Back to Challenges</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackToDashboard />

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          <div className="flex gap-2 mt-1">
            {challenge.proctoring?.webcamEnabled && <Camera className="h-4 w-4 text-slate-500" />}
            {challenge.proctoring?.voiceDetectionEnabled && <Volume2 className="h-4 w-4 text-slate-500" />}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            stopAllMedia();
            router.push(`/challenges/${id}`);
          }}
        >
          Exit
        </Button>
      </div>

      {warnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="mb-4 border-green-300 bg-green-50">
          <AlertTitle>Submitted — Score: {result.score}%</AlertTitle>
          <AlertDescription>
            {result.passedTestCases}/{result.totalTestCases} test cases passed. Redirecting...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{challenge.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{challenge.category}</Badge>
              <Badge variant="outline" className="capitalize">{challenge.challengeType || 'coding'}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none whitespace-pre-wrap">{challenge.description}</div>

            {challenge.proctoring?.webcamEnabled && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Webcam</p>
                <div className="relative overflow-hidden rounded-xl bg-black aspect-video">
                  <video ref={setWebcamRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{challenge.challengeType === 'bash' ? 'Write Your Shell Script' : 'Write Your Solution'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeEditor
              starterCodeMap={challenge.starterCode || {}}
              allowedLanguages={
                challenge.allowedLanguages?.length
                  ? challenge.allowedLanguages
                  : challenge.challengeType === 'bash' ? ['bash'] : ['javascript']
              }
              onRun={handleRun}
              onSubmit={handleSubmit}
              submitting={submitting}
              running={running}
            />

            {runOutput && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Output</h3>
                <pre className="bg-black text-white p-4 rounded-md overflow-auto whitespace-pre-wrap">{runOutput}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}