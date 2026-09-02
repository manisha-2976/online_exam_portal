'use client';

import React, { useEffect, useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { proctorApi } from '@/services/proctorApi';
import { RoomScanViewer } from '@/components/proctor/RoomScanViewer';
import { RoomScan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RoomScansPage() {
  const candidates = useProctorStore((state) => state.candidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('ALL');
  const [roomScans, setRoomScans] = useState<RoomScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const candidateToFetch = selectedCandidateId !== 'ALL' ? selectedCandidateId : candidates[0]?._id || 'cand-2';
    proctorApi
      .getCandidateRoomScans(candidateToFetch)
      .then((scans) => {
        setRoomScans(scans);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [selectedCandidateId, candidates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Room-Scan 360 Verification Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspect recorded candidate environment scans, AI detected objects, and person counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Select candidate..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Session Candidates
              </SelectItem>
              {candidates.map((cand) => (
                <SelectItem key={cand._id} value={cand._id} className="text-xs">
                  {cand.name} ({cand.studentId || cand._id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center space-y-3 flex-col">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading room scan history...</p>
        </div>
      ) : (
        <RoomScanViewer roomScans={roomScans} />
      )}
    </div>
  );
}
