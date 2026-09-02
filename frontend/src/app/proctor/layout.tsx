'use client';

import React, { useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { SocketProvider } from '@/contexts/SocketContext';
import { ProctorHeader } from '@/components/proctor/ProctorHeader';
import { useProctorStore } from '@/stores/proctorStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, AlertOctagon, Camera, FileText, History, ShieldAlert } from 'lucide-react';

export default function ProctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fetchInitialData = useProctorStore((state) => state.fetchInitialData);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const navItems = [
    { href: '/proctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/proctor/incidents', label: 'Incidents', icon: ShieldAlert },
    { href: '/proctor/room-scans', label: 'Room Scans', icon: Camera },
    { href: '/proctor/reports', label: 'Reports', icon: FileText },
    { href: '/proctor/audit', label: 'Audit Logs', icon: History },
  ];

  return (
    <ProtectedRoute allowedRoles={['proctor', 'admin', 'faculty']}>
      <SocketProvider>
        <div className="min-h-screen bg-background flex flex-col font-sans">
          <ProctorHeader />

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-64 border-r bg-card/50 hidden md:flex flex-col justify-between p-4 space-y-4">
              <div className="space-y-1">
                <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Proctor Navigation
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Sidebar Footer info */}
              <div className="rounded-xl border bg-accent/30 p-3 text-xs space-y-1">
                <div className="font-semibold text-foreground">Peak-Hard AI Proctor</div>
                <p className="text-[11px] text-muted-foreground">
                  Real-time multi-modal candidate monitoring system.
                </p>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </SocketProvider>
    </ProtectedRoute>
  );
}
