'use client';

import React, { useState } from 'react';
import { ProctoringEvent, EventSeverity, EventStatus } from '@/types';
import { useProctorStore } from '@/stores/proctorStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Eye, X, AlertOctagon, AlertTriangle, Info, Image as ImageIcon, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EventTimelineProps {
  events: ProctoringEvent[];
  onSelectEvidence?: (evidenceId: string) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, onSelectEvidence }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const acknowledgeEvent = useProctorStore((state) => state.acknowledgeEventOptimistic);
  const reviewEvent = useProctorStore((state) => state.reviewEventOptimistic);
  const dismissEvent = useProctorStore((state) => state.dismissEventOptimistic);

  const filteredEvents = events.filter((evt) => {
    if (severityFilter !== 'ALL' && evt.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && evt.status !== statusFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: EventSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge className="bg-red-500 text-white font-bold text-[10px] uppercase">CRITICAL</Badge>;
      case 'HIGH':
        return <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">HIGH</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-500 text-white font-bold text-[10px] uppercase">MEDIUM</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white font-bold text-[10px] uppercase">LOW</Badge>;
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'ACKNOWLEDGED':
        return <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10">ACKNOWLEDGED</Badge>;
      case 'REVIEWED':
        return <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">REVIEWED</Badge>;
      case 'DISMISSED':
        return <Badge variant="outline" className="text-[10px] border-muted text-muted-foreground bg-muted/20">DISMISSED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-600 bg-red-500/10 animate-pulse">PENDING</Badge>;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Proctoring Event Timeline</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {events.length} total
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[110px] h-7 text-[11px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Severities</SelectItem>
                <SelectItem value="CRITICAL" className="text-xs">Critical</SelectItem>
                <SelectItem value="HIGH" className="text-xs">High</SelectItem>
                <SelectItem value="MEDIUM" className="text-xs">Medium</SelectItem>
                <SelectItem value="LOW" className="text-xs">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-7 text-[11px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
              <SelectItem value="ACKNOWLEDGED" className="text-xs">Acknowledged</SelectItem>
              <SelectItem value="REVIEWED" className="text-xs">Reviewed</SelectItem>
              <SelectItem value="DISMISSED" className="text-xs">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No proctoring events match the current filter criteria.
        </div>
      ) : (
        <ScrollArea className="flex-1 pr-3 max-h-[450px]">
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {filteredEvents.map((evt) => (
              <div
                key={evt.eventId}
                className="relative pl-7 text-xs transition-all group"
              >
                {/* Timeline Dot */}
                <span
                  className={`absolute left-1.5 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-card ${
                    evt.severity === 'CRITICAL'
                      ? 'bg-red-500'
                      : evt.severity === 'HIGH'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                />

                <div className="rounded-lg border bg-background p-3 space-y-2 hover:border-accent-foreground/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{evt.type.replace(/_/g, ' ')}</span>
                      {getSeverityBadge(evt.severity)}
                      {getStatusBadge(evt.status)}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed">{evt.description}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-muted/60">
                    <div>
                      {evt.evidenceId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 flex items-center gap-1 text-primary border-primary/30"
                          onClick={() => onSelectEvidence && onSelectEvidence(evt.evidenceId!)}
                        >
                          <ImageIcon className="h-3 w-3" />
                          View Evidence
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {evt.status !== 'ACKNOWLEDGED' && evt.status !== 'REVIEWED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-amber-600 hover:bg-amber-500/10"
                          onClick={() => acknowledgeEvent(evt.eventId)}
                          title="Acknowledge event"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Ack
                        </Button>
                      )}

                      {evt.status !== 'REVIEWED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => reviewEvent(evt.eventId)}
                          title="Mark reviewed"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      )}

                      {evt.status !== 'DISMISSED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => dismissEvent(evt.eventId)}
                          title="Dismiss event"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
