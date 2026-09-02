'use client';

import React, { useEffect, useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { proctorApi } from '@/services/proctorApi';
import { ProctoringReport } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, FileCode, ShieldCheck, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProctoringReportsPage() {
  const candidates = useProctorStore((state) => state.candidates);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(candidates[0]?._id || 'cand-2');
  const [report, setReport] = useState<ProctoringReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const candidate = candidates.find((c) => c._id === selectedCandidateId) || candidates[0];
    const sessionId = candidate?.sessionId || 'sess-882';

    proctorApi
      .getReport(sessionId)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedCandidateId, candidates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Session Proctoring Reports & Audit Exports
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download certified PDF/JSON proctoring summary reports and session transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Select candidate session..." />
            </SelectTrigger>
            <SelectContent>
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
          <p className="text-xs text-muted-foreground">Compiling proctoring report data...</p>
        </div>
      ) : !report ? (
        <Card className="p-12 text-center text-xs text-muted-foreground">
          No report data generated for the selected session.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Banner */}
          <Card className="border-muted bg-accent/10">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">{report.examTitle}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Candidate: <span className="font-semibold text-foreground">{report.candidateName}</span> (ID:{' '}
                  {report.candidateId})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a href={report.pdfUrl || proctorApi.getReportPdfUrl(report.sessionId)} target="_blank" rel="noreferrer">
                  <Button variant="default" size="sm" className="h-8 text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                </a>

                <a href={report.jsonUrl || proctorApi.getReportJsonUrl(report.sessionId)} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <FileCode className="h-3.5 w-3.5" />
                    Export JSON
                  </Button>
                </a>
              </div>
            </CardHeader>

            <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Total Events Flagged:</span>
                <p className="text-lg font-bold text-foreground">{report.summary.totalEvents}</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Average Risk Score:</span>
                <p className="text-lg font-bold text-amber-600">{report.summary.averageRiskScore}/100</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Peak Risk Index:</span>
                <p className="text-lg font-bold text-red-600">{report.summary.peakRiskScore}/100</p>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Final Status:</span>
                <Badge className="font-bold text-[10px] uppercase bg-amber-500">{report.summary.finalStatus}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Event Transcript */}
          <Card className="border-muted">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold">Session Violation Transcript</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              {report.events.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">No violations recorded during this exam session.</p>
              ) : (
                report.events.map((evt) => (
                  <div key={evt.eventId} className="p-3 rounded-lg border bg-accent/20 flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{evt.type.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[9px] font-bold">
                          {evt.severity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{evt.description}</p>
                    </div>

                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
