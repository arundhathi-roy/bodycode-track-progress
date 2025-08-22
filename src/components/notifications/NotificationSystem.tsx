import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Trophy, Target, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'achievement' | 'reminder' | 'milestone' | 'tip';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationSystemProps {
  userId: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export const NotificationSystem = ({ userId, notifications, onMarkAsRead }: NotificationSystemProps) => {
  const { toast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'achievement': return Trophy;
      case 'milestone': return Target;
      case 'reminder': return Calendar;
      default: return Bell;
    }
  };

  const markAsRead = (id: string) => {
    onMarkAsRead(id);
    toast({
      title: "Notification marked as read",
      description: "The notification has been removed from your list.",
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card className="p-3 sm:p-4 border-0 shadow-lg">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3 max-h-[60vh] sm:max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2 sm:mb-3" />
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <div
                key={notification.id}
                className={`p-2 sm:p-3 rounded-lg border ${
                  notification.isRead ? 'bg-muted/30' : 'bg-accent/20'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs sm:text-sm truncate">{notification.title}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      className="text-xs p-1 sm:p-2 h-auto min-w-0 flex-shrink-0"
                    >
                      <span className="hidden sm:inline">Mark read</span>
                      <span className="sm:hidden">✓</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};