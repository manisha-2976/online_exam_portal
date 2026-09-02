'use client';

import React, { useState } from 'react';
import { useProctorStore } from '@/stores/proctorStore';
import { Bell, Check, Trash2, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useProctorStore((state) => state.notifications);
  const acknowledgeNotification = useProctorStore((state) => state.acknowledgeNotificationOptimistic);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-accent"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-xl border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">Notification Center</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No active notifications.
              </div>
            ) : (
              <ScrollArea className="h-72 pr-3">
                <div className="space-y-2.5">
                  {notifications.map((notif) => (
                    <div
                      key={notif.notificationId}
                      className={`p-3 rounded-lg border text-xs transition-colors ${
                        notif.read ? 'bg-background/50 border-muted' : 'bg-accent/40 border-accent-foreground/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          {getSeverityIcon(notif.severity)}
                          <span className="truncate max-w-[200px]">{notif.title}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-muted-foreground text-[11px] mb-2 leading-snug">{notif.message}</p>

                      <div className="flex items-center justify-end gap-1">
                        {!notif.read && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 flex items-center gap-1"
                            onClick={() => acknowledgeNotification(notif.notificationId)}
                          >
                            <Check className="h-3 w-3" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      )}
    </div>
  );
};
