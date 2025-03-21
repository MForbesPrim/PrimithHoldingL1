import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '@/types/notifications';
import AuthService from '@/services/auth';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) {
        throw new Error('No authentication tokens');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/notifications`, {
        headers: {
          'Authorization': `Bearer ${rdmAuth.tokens.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) {
        throw new Error('No authentication tokens');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/rdm/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${rdmAuth.tokens.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) {
        throw new Error('No authentication tokens');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/rdm/notifications/mark-all-read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${rdmAuth.tokens.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for new notifications
    const pollInterval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        fetchNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};