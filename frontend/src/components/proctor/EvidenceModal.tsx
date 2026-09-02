'use client';

import React, { useEffect, useState } from 'react';
import { Evidence } from '@/types';
import { proctorApi } from '@/services/proctorApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Download, Trash2, Clock, ShieldCheck, FileImage } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface EvidenceModalProps {
  evidenceId: string | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ evidenceId, onClose }) => {
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!evidenceId) return;
    setLoading(true);
    proctorApi
      .getEvidenceById(evidenceId)
      .then((data) => {
        setEvidence(data);
        setLoading(false);
      })
      .catch((err) => {
        toast({ title: 'Error', description: 'Failed to fetch evidence URL', variant: 'destructive' });
        setLoading(false);
      });
  }, [evidenceId, toast]);

  if (!evidenceId) return null;

  const handleDelete = async () => {
    if (!evidence) return;
    if (!confirm('Are you sure you want to delete this evidence record?')) return;
    try {
      await proctorApi.deleteEvidence(evidence.evidenceId);
      toast({ title: 'Evidence Deleted', description: 'Evidence file removed successfully.' });
      onClose();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete evidence', variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <FileImage className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-base text-foreground">Secure Evidence Viewer</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Content */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Fetching secure signed URL from backend...</p>
          </div>
        ) : !evidence ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Evidence record not found.</div>
        ) : (
          <div className="space-y-4">
            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent/40 p-3 text-xs border">
              <div>
                <span className="font-semibold text-foreground">Evidence ID:</span>{' '}
                <span className="font-mono text-muted-foreground">{evidence.evidenceId}</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {evidence.type}
              </Badge>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Expires: {new Date(evidence.expiresAt).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Media Rendering */}
            <div className="overflow-hidden rounded-xl border bg-black/90 flex items-center justify-center max-h-[360px] p-2">
              {evidence.type === 'AUDIO_CLIP' ? (
                <audio controls src={evidence.accessUrl} className="w-full" />
              ) : (
                /* Secure URL returned by backend API - never constructed client-side */
                /* eslint-disable-next-html-element-suppression */
                <img
                  src={evidence.accessUrl}
                  alt="Proctoring Evidence"
                  className="max-h-[340px] w-auto object-contain rounded-lg shadow-md"
                />
              )}
            </div>

            {/* Additional Metadata JSON */}
            {evidence.metadata && (
              <div className="rounded-lg bg-muted/40 p-3 text-xs font-mono border space-y-1">
                <p className="font-sans font-semibold text-foreground text-[11px]">Backend Detection Metadata:</p>
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(evidence.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t pt-3">
              <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete Record
              </Button>

              <div className="flex items-center gap-2">
                <a href={evidence.accessUrl} target="_blank" rel="noopener noreferrer" download>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </a>
                <Button variant="default" size="sm" className="h-8 text-xs" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
