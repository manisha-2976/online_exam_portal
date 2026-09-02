'use client';

import React, { useEffect, useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { proctorApi } from '@/services/proctorApi';
import { AuditEntry } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Download, ShieldCheck, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AuditHistoryPage() {
  const candidates = useProctorStore((state) => state.candidates);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const targetSessionId = candidates[0]?.sessionId || 'sess-882';
    proctorApi
      .getSessionAudit(targetSessionId)
      .then((logs) => {
        setAuditLogs(logs);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [candidates]);

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Audit & Compliance Log History
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable log trail of all proctor actions, risk state transitions, and session events.
          </p>
        </div>

        <a href={proctorApi.getAuditExportUrl('sess-882')} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export Audit Trail (CSV)
          </Button>
        </a>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter audit actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 text-xs"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center space-y-3 flex-col">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Fetching compliance audit records...</p>
        </div>
      ) : (
        <Card className="border-muted">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-sm font-semibold">Session Audit Trail ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border text-xs">
              {filteredLogs.map((log) => (
                <div key={log.auditId} className="p-4 hover:bg-muted/30 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold text-[10px] uppercase font-mono">
                        {log.action}
                      </Badge>
                      <span className="font-semibold text-foreground">{log.performedBy}</span>
                      <Badge variant="secondary" className="text-[9px] capitalize">
                        {log.role}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-xs">{log.details}</p>

                  <div className="text-[10px] text-muted-foreground/80 font-mono pt-1">
                    Session ID: {log.sessionId} {log.candidateId ? `| Candidate: ${log.candidateId}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
