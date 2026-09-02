'use client';

import React from 'react';
import { RiskScore } from '@/types';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
  riskScore: RiskScore;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ riskScore }) => {
  const score = riskScore?.score ?? 0;
  const level = riskScore?.level ?? 'LOW';
  const trend = riskScore?.trend ?? 'STABLE';
  const history = riskScore?.history || [];

  const chartData = history.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    score: item.score,
  }));

  const getLevelColor = () => {
    switch (level) {
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'HIGH':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  const getStrokeColor = () => {
    switch (level) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'MEDIUM':
        return '#eab308';
      default:
        return '#10b981';
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Real-Time Risk Index</h3>
        </div>
        <Badge variant="outline" className={`font-bold text-xs uppercase px-2 py-0.5 ${getLevelColor()}`}>
          {level} RISK
        </Badge>
      </div>

      <div className="flex items-end justify-between border-b pb-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">{score}</span>
            <span className="text-sm font-medium text-muted-foreground">/100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Updated {new Date(riskScore.lastUpdated).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          {trend === 'RISING' ? (
            <>
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-red-500">Rising Trend</span>
            </>
          ) : trend === 'FALLING' ? (
            <>
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">Decreasing</span>
            </>
          ) : (
            <>
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Stable</span>
            </>
          )}
        </div>
      </div>

      {/* Recharts Historical Trend Line Chart */}
      <div className="h-32 w-full pt-1">
        <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Risk Score History</p>
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No history points yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fontSize: 9 }} stroke="#888888" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} stroke="#888888" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={getStrokeColor()}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
