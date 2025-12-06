// Notifications system using Supabase Realtime and Browser Notifications

import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

class NotificationService {
  private channel: any = null;
  private listeners: Array<(notification: Notification) => void> = [];

  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  showBrowserNotification(title: string, options?: NotificationOptions) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        ...options,
      });
    }
  }

  subscribe(userId: string) {
    if (this.channel) {
      this.unsubscribe();
    }

    // Subscribe to Supabase Realtime for messages
    this.channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const notification: Notification = {
            id: payload.new.id,
            title: 'Ново съобщение',
            message: payload.new.content,
            type: 'info',
            read: false,
            createdAt: payload.new.created_at,
          };

          this.notifyListeners(notification);
          this.showBrowserNotification(notification.title, {
            body: notification.message,
          });
        }
      )
      .subscribe();

    return () => this.unsubscribe();
  }

  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  onNotification(callback: (notification: Notification) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(notification: Notification) {
    this.listeners.forEach((callback) => callback(notification));
  }
}

export const notificationService = new NotificationService();

