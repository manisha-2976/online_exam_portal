'use client';

import React, { useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { CandidateCard } from '@/components/proctor/CandidateCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, ShieldAlert, AlertTriangle, CheckCircle2, Search, Filter, Radio, Bell } from 'lucide-react';
import Link from 'next/link';

export default function ProctorDashboardPage() {
  const candidates = useProctorStore((state) => state.candidates);
  const activeExams = useProctorStore((state) => state.activeExams);
  const selectedExamId = useProctorStore((state) => state.selectedExamId);
  const alerts = useProctorStore((state) => state.alerts);
  const loading = useProctorStore((state) => state.loading);

  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const selectedExam = activeExams.find((e) => e._id === selectedExamId) || activeExams[0];

  const filteredCandidates = candidates.filter((cand) => {
    const matchesSearch =
      cand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cand.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cand.studentId && cand.studentId.toLowerCase().includes(searchTerm.toLowerCase()));

    if (riskFilter !== 'ALL' && cand.riskScore?.level !== riskFilter) {
      return false;
    }
    return matchesSearch;
  });

  const highRiskCount = candidates.filter(
    (c) => c.riskScore?.level === 'HIGH' || c.riskScore?.level === 'CRITICAL'
  ).length;
  const warnedCount = candidates.filter((c) => c.status === 'WARNED').length;
  const terminatedCount = candidates.filter((c) => c.status === 'TERMINATED').length;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center space-y-3 flex-col">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Loading active proctoring sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Session Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {selectedExam ? selectedExam.title : 'Live Exam Monitoring Dashboard'}
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
              LIVE SESSION
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedExam?.description || 'Real-time candidate risk evaluation & event stream.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/proctor/incidents">
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Incidents ({candidates.filter((c) => c.status === 'WARNED' || c.status === 'TERMINATED').length})
            </Button>
          </Link>
          <Link href="/proctor/reports">
            <Button variant="default" size="sm" className="h-9 text-xs">
              Generate Session Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-muted">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Candidates</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{candidates.length}</span>
            <span className="text-xs text-emerald-600 font-medium">In session</span>
          </div>
        </Card>

        <Card className="p-4 border-muted">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">High/Critical Risk</span>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-600">{highRiskCount}</span>
            <span className="text-xs text-muted-foreground">Require review</span>
          </div>
        </Card>

        <Card className="p-4 border-muted">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Warnings Issued</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">{warnedCount}</span>
            <span className="text-xs text-muted-foreground font-medium">Candidates</span>
          </div>
        </Card>

        <Card className="p-4 border-muted">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Terminated Sessions</span>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{terminatedCount}</span>
            <span className="text-xs text-muted-foreground">Disqualified</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Candidates List + Live Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates Grid (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate name or ID..."
                className="pl-8 h-9 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Risk Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Risk Levels</SelectItem>
                  <SelectItem value="CRITICAL" className="text-xs">Critical</SelectItem>
                  <SelectItem value="HIGH" className="text-xs">High</SelectItem>
                  <SelectItem value="MEDIUM" className="text-xs">Medium</SelectItem>
                  <SelectItem value="LOW" className="text-xs">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <Card className="p-12 text-center text-xs text-muted-foreground">
              No candidates found matching the selected filter criteria.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate._id} candidate={candidate} />
              ))}
            </div>
          )}
        </div>

        {/* Live Global Alerts Stream (1 Column) */}
        <div className="space-y-4">
          <Card className="border-muted">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                <CardTitle className="text-sm font-semibold">Live Event Stream</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px]">
                WebSocket Push
              </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No live alerts triggered yet. Monitoring active streams...
                </p>
              ) : (
                alerts.slice(0, 15).map((evt) => (
                  <div
                    key={evt.eventId}
                    className="p-3 rounded-lg border bg-accent/20 text-xs space-y-1.5 hover:border-accent-foreground/20 transition-all"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">{evt.candidateName || evt.candidateId}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">{evt.type.replace(/_/g, ' ')}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-bold ${
                          evt.severity === 'CRITICAL'
                            ? 'bg-red-500/15 text-red-600'
                            : evt.severity === 'HIGH'
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-blue-500/15 text-blue-600'
                        }`}
                      >
                        {evt.severity}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">{evt.description}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
