'use client';

import React from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { Badge } from '@/components/ui/badge';
import { Activity, Server, Database, Cpu, HardDrive, Radio } from 'lucide-react';

export const HealthIndicator: React.FC = () => {
  const healthStatus = useProctorStore((state) => state.healthStatus);
  const isReconnecting = useProctorStore((state) => state.isReconnecting);

  if (!healthStatus) {
    return (
      <Badge variant="outline" className="flex items-center gap-1.5 text-xs py-1 px-2.5">
        <Activity className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
        Checking Health...
      </Badge>
    );
  }

  const isAllOperational =
    healthStatus.ai === 'OPERATIONAL' &&
    healthStatus.websocket === 'OPERATIONAL' &&
    healthStatus.redis === 'OPERATIONAL' &&
    healthStatus.database === 'OPERATIONAL' &&
    healthStatus.storage === 'OPERATIONAL';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'DEGRADED':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      default:
        return 'bg-destructive/15 text-destructive border-destructive/30';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="group relative">
        <Badge
          variant="outline"
          className={`flex items-center gap-1.5 text-xs py-1 px-2.5 cursor-pointer font-medium transition-all ${
            isReconnecting
              ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
              : getStatusColor(isAllOperational ? 'OPERATIONAL' : 'DEGRADED')
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isReconnecting
                ? 'bg-amber-500 animate-ping'
                : isAllOperational
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
          />
          {isReconnecting ? 'WS Reconnecting' : isAllOperational ? 'System Operational' : 'System Degraded'}
        </Badge>

        {/* Hover / Focus Dropdown Card */}
        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50 w-72 rounded-lg border bg-card p-3 shadow-lg transition-all text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b font-semibold text-foreground">
            <span>System Component Health</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(healthStatus.lastChecked).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                <span>AI Detection Engine</span>
              </div>
              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getStatusColor(healthStatus.ai)}`}>
                {healthStatus.ai}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                <span>WebSocket Stream</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 ${
                  isReconnecting ? 'bg-amber-500/15 text-amber-600' : getStatusColor(healthStatus.websocket)
                }`}
              >
                {isReconnecting ? 'RECONNECTING' : healthStatus.websocket}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Redis Pub/Sub</span>
              </div>
              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getStatusColor(healthStatus.redis)}`}>
                {healthStatus.redis}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Database Cluster</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 ${getStatusColor(healthStatus.database)}`}
              >
                {healthStatus.database}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Storage / Evidence S3</span>
              </div>
              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${getStatusColor(healthStatus.storage)}`}>
                {healthStatus.storage}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
