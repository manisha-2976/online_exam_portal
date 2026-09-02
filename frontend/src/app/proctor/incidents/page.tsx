'use client';

import React, { useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, CheckCircle2, AlertOctagon, Clock, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TechnicalIncidentsPage() {
  const incidents = useProctorStore((state) => state.incidents);
  const resolveIncident = useProctorStore((state) => state.resolveIncidentOptimistic);
  const { toast } = useToast();

  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleResolve = async (incidentId: string) => {
    if (!resolutionNotes.trim()) {
      toast({
        title: 'Notes Required',
        description: 'Please specify resolution notes before resolving.',
        variant: 'destructive',
      });
      return;
    }
    await resolveIncident(incidentId, resolutionNotes);
    setActiveIncidentId(null);
    setResolutionNotes('');
    toast({ title: 'Incident Resolved', description: 'Technical incident status set to RESOLVED.' });
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" />
          Technical Incidents & Escalations
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage, review, and resolve escalated proctoring incidents and security violations.
        </p>
      </div>

      <div className="space-y-4">
        {incidents.length === 0 ? (
          <Card className="p-12 text-center text-xs text-muted-foreground">
            No technical incidents logged for this exam session.
          </Card>
        ) : (
          incidents.map((inc) => (
            <Card key={inc.incidentId} className="border-muted">
              <CardHeader className="p-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`font-bold text-[10px] uppercase ${
                      inc.status === 'OPEN'
                        ? 'bg-red-500/15 text-red-600 border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    }`}
                  >
                    {inc.status}
                  </Badge>
                  <span className="font-semibold text-sm text-foreground">{inc.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground font-mono">({inc.incidentId})</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(inc.createdAt).toLocaleString()}</span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Candidate:</span>{' '}
                    <span className="font-semibold text-foreground">{inc.candidateName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Severity:</span>{' '}
                    <Badge variant="outline" className="text-[10px] font-bold text-red-600 border-red-500/30">
                      {inc.severity}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-foreground bg-accent/30 p-3 rounded-lg border">{inc.description}</p>

                {inc.status === 'RESOLVED' ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Resolution Notes:</span>
                    </div>
                    <p className="text-emerald-700 dark:text-emerald-400">{inc.resolutionNotes}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Resolved at: {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                ) : (
                  <div className="pt-2 border-t space-y-3">
                    {activeIncidentId === inc.incidentId ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Enter resolution notes and action taken..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="text-xs min-h-[60px]"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setActiveIncidentId(null)}>
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleResolve(inc.incidentId)}
                          >
                            Submit Resolution
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => setActiveIncidentId(inc.incidentId)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Resolve Incident
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
