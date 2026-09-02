'use client';

import React from 'react';
import { RoomScan } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle, Users, Box, Camera, CheckCircle2 } from 'lucide-react';

interface RoomScanViewerProps {
  roomScans: RoomScan[];
}

export const RoomScanViewer: React.FC<RoomScanViewerProps> = ({ roomScans }) => {
  if (roomScans.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
        No room scan records available for this session.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Room-Scan 360 Verification</h3>
        </div>
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-bold">
          {roomScans.length} Scan Recorded
        </Badge>
      </div>

      <div className="space-y-4">
        {roomScans.map((scan) => (
          <div key={scan.scanId} className="rounded-lg border bg-accent/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Scan ID: {scan.scanId}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(scan.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase ${
                  scan.status === 'FLAGGED'
                    ? 'bg-red-500/15 text-red-600 border-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                }`}
              >
                {scan.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Snapshot Preview */}
              <div className="relative rounded-lg overflow-hidden border bg-black/90 aspect-video flex items-center justify-center">
                {/* eslint-disable-next-html-element-suppression */}
                <img
                  src={scan.evidenceUrl}
                  alt="Room Scan Frame"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* AI Detection Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded bg-card p-2 border">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Persons Detected in Frame:</span>
                  </div>
                  <span
                    className={`font-bold ${
                      scan.detectedPersons > 1 ? 'text-red-500' : 'text-emerald-600'
                    }`}
                  >
                    {scan.detectedPersons} Person(s)
                  </span>
                </div>

                <div className="rounded bg-card p-2.5 border space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Box className="h-4 w-4 text-muted-foreground" />
                    <span>Objects Analysis ({scan.detectedObjects.length}):</span>
                  </div>

                  <div className="space-y-1.5 pl-1">
                    {scan.detectedObjects.map((obj, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-mono">{obj.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {Math.round(obj.confidence * 100)}% conf
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {scan.notes && (
                  <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{scan.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
