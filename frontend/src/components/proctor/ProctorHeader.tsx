'use client';

import React from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { useAuth } from '@/contexts/AuthContext';
import { HealthIndicator } from './HealthIndicator';
import { NotificationCenter } from './NotificationCenter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, User as UserIcon, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const ProctorHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const activeExams = useProctorStore((state) => state.activeExams);
  const selectedExamId = useProctorStore((state) => state.selectedExamId);
  const setSelectedExamId = useProctorStore((state) => state.setSelectedExamId);
  const fetchCandidates = useProctorStore((state) => state.fetchCandidates);
  const resyncState = useProctorStore((state) => state.resyncState);
  const loading = useProctorStore((state) => state.loading);

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    fetchCandidates(examId);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <Link href="/proctor/dashboard" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline">AI Proctor Console</span>
        </Link>

        {activeExams.length > 0 && (
          <div className="flex items-center gap-2 border-l pl-4">
            <span className="text-xs text-muted-foreground font-medium hidden md:inline">Exam:</span>
            <Select value={selectedExamId || ''} onValueChange={handleExamChange}>
              <SelectTrigger className="w-[200px] lg:w-[280px] h-8 text-xs font-medium">
                <SelectValue placeholder="Select active exam..." />
              </SelectTrigger>
              <SelectContent>
                {activeExams.map((exam) => (
                  <SelectItem key={exam._id} value={exam._id} className="text-xs">
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => resyncState()}
          title="Manual Re-sync REST State"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <HealthIndicator />

        <NotificationCenter />

        <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-semibold text-foreground leading-none">{user?.name || 'Proctor Admin'}</span>
            <span className="text-[10px] text-muted-foreground capitalize mt-0.5">{user?.role || 'proctor'}</span>
          </div>

          <Badge variant="secondary" className="text-[10px] uppercase font-bold px-2 py-0.5">
            {user?.role || 'proctor'}
          </Badge>

          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={logout} title="Sign Out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
