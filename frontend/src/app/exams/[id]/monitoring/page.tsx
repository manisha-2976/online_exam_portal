'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProctorStore } from '@/stores/proctorStore';
import { CandidateCard } from '@/components/proctor/CandidateCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import BackToDashboard from '@/components/BackToDashboard';

export default function ExamMonitoring() {
  const params = useParams();
  const examId = params.id as string;
  const router = useRouter();

  const candidates = useProctorStore((state) => state.candidates);
  const fetchCandidates = useProctorStore((state) => state.fetchCandidates);
  const loading = useProctorStore((state) => state.loading);

  useEffect(() => {
    if (examId) {
      fetchCandidates(examId);
    }
  }, [examId, fetchCandidates]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <BackToDashboard />
        <Button variant="default" size="sm" onClick={() => router.push('/proctor/dashboard')} className="gap-1.5">
          <Shield className="h-4 w-4" />
          Open Full Proctor Console
        </Button>
      </div>

      <Card className="border-muted">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-lg font-bold">Exam Session Monitoring: {examId}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time Peak-Hard AI Proctoring active candidate monitoring grid.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading active candidate streams...</div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No candidates currently active in this exam session.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((cand) => (
                <CandidateCard key={cand._id} candidate={cand} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

