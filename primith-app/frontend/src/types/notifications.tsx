export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    link?: string;
    createdAt: string;
    metadata?: Record<string, any>;
  }
  
  export interface NotificationResponse {
    notifications: Notification[];
    unreadCount: number;
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }