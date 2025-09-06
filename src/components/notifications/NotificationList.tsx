import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, MessageCircle, AlertCircle, CheckCircle, Bell } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
  related_type?: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClose: () => void;
}

export function NotificationList({ notifications, onMarkAsRead, onClose }: NotificationListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'application':
        return <FileText className="h-4 w-4" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'status':
        return <CheckCircle className="h-4 w-4" />;
      case 'assignment':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'application':
        return 'bg-blue-500/10 text-blue-600';
      case 'comment':
        return 'bg-green-500/10 text-green-600';
      case 'status':
        return 'bg-purple-500/10 text-purple-600';
      case 'assignment':
        return 'bg-orange-500/10 text-orange-600';
      default:
        return 'bg-gray-500/10 text-gray-600';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onClose();
    // You could add navigation to related content here
  };

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <Button
          key={notification.id}
          variant="ghost"
          className={`w-full p-4 h-auto flex items-start gap-3 hover:bg-muted/50 ${
            !notification.is_read ? 'bg-muted/30' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
            {getIcon(notification.type)}
          </div>
          
          <div className="flex-1 text-left space-y-1">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-sm leading-tight">
                {notification.title}
              </h4>
              {!notification.is_read && (
                <div className="h-2 w-2 bg-primary rounded-full mt-1 ml-2 flex-shrink-0" />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed">
              {notification.message}
            </p>
            
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {notification.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}