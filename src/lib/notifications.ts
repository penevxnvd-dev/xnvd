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
  private channel: { unsubscribe: () => void } | null = null;
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

    // Realtime is disabled, so we'll use polling instead
    // Check for new messages every 30 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (messages && messages.length > 0) {
          messages.forEach((message) => {
            const notification: Notification = {
              id: message.id,
              title: 'Ново съобщение',
              message: message.content,
              type: 'info',
              read: false,
              createdAt: message.created_at,
            };

            this.notifyListeners(notification);
            this.showBrowserNotification(notification.title, {
              body: notification.message,
            });
          });
        }
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 30000); // Poll every 30 seconds

    // Store interval ID for cleanup
    this.channel = {
      unsubscribe: () => {
        clearInterval(pollInterval);
      },
    } as { unsubscribe: () => void };

    return () => this.unsubscribe();
  }

  unsubscribe() {
    if (this.channel) {
      // If it's a polling interval, just call unsubscribe
      if (typeof this.channel.unsubscribe === 'function') {
        this.channel.unsubscribe();
      } else {
        // If it's a realtime channel, remove it
        try {
          supabase.removeChannel(this.channel);
        } catch (e) {
          // Ignore errors if channel doesn't exist
        }
      }
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

