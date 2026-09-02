'use client';

import React from 'react';
import { Candidate } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Mic, MicOff, Monitor, AlertTriangle, Eye, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface CandidateCardProps {
  candidate: Candidate;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({ candidate }) => {
  const risk = candidate.riskScore;
  const live = candidate.liveStatus;

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-600 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'WARNED':
        return 'bg-amber-500 text-white';
      case 'TERMINATED':
        return 'bg-destructive text-destructive-foreground';
      case 'COMPLETED':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-emerald-500 text-white';
    }
  };

  return (
    <Card className="flex flex-col justify-between overflow-hidden transition-all hover:shadow-md border-muted">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm text-foreground line-clamp-1">{candidate.name}</h4>
            <p className="text-xs text-muted-foreground">{candidate.email}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{candidate.studentId || candidate._id}</p>
          </div>
          <Badge className={`text-[10px] font-bold uppercase ${getStatusBadgeColor(candidate.status)}`}>
            {candidate.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        {/* Risk Score & Trend */}
        <div className="flex items-center justify-between rounded-lg bg-accent/30 p-2.5 border">
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={`h-4 w-4 ${
                risk?.level === 'CRITICAL'
                  ? 'text-red-500'
                  : risk?.level === 'HIGH'
                  ? 'text-amber-500'
                  : 'text-emerald-500'
              }`}
            />
            <span className="text-xs font-medium">Risk Index</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{risk?.score ?? 0}/100</span>
            <Badge variant="outline" className={`text-[10px] font-bold ${getRiskBadgeColor(risk?.level || 'LOW')}`}>
              {risk?.level || 'LOW'}
            </Badge>
          </div>
        </div>

        {/* Live Device Status Chips */}
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <div
            className={`flex items-center justify-center gap-1 rounded py-1 px-1.5 border font-medium ${
              live?.camera === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            <Camera className="h-3 w-3" />
            <span>Cam</span>
          </div>

          <div
            className={`flex items-center justify-center gap-1 rounded py-1 px-1.5 border font-medium ${
              live?.mic === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : live?.mic === 'MUTED'
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}
          >
            {live?.mic === 'MUTED' ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            <span>Mic</span>
          </div>

          <div
            className={`flex items-center justify-center gap-1 rounded py-1 px-1.5 border font-medium ${
              live?.screen === 'SHARING'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}
          >
            <Monitor className="h-3 w-3" />
            <span>Screen</span>
          </div>
        </div>

        {candidate.warningCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{candidate.warningCount} violation warnings issued</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-3 bg-muted/20 border-t flex justify-end">
        <Link href={`/proctor/candidates/${candidate._id}`} className="w-full">
          <Button size="sm" variant="default" className="w-full h-8 text-xs flex items-center justify-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Live Monitor
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
