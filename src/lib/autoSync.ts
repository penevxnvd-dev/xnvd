/**
 * Auto Sync Service
 * Automatically syncs Supabase data and updates hardcoded data
 * Runs in the background to keep data fresh
 */

import { syncService } from './syncService';

class AutoSyncService {
  private syncCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private lastSyncAttempt = 0;
  private readonly MIN_SYNC_INTERVAL = 15 * 60 * 1000; // Minimum 15 minutes between syncs

  async init() {
    console.log('[AutoSync] Initializing auto-sync service...');
    
    // Initial sync check
    await this.checkAndSync();

    // Set up periodic check
    this.syncCheckInterval = setInterval(() => {
      this.checkAndSync().catch(error => {
        console.error('[AutoSync] Sync check error:', error);
      });
    }, this.CHECK_INTERVAL);

    console.log(`[AutoSync] Auto-sync initialized. Checking every ${this.CHECK_INTERVAL / 1000 / 60} minutes`);
  }

  private async checkAndSync() {
    const now = Date.now();
    
    // Don't sync too frequently
    if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL) {
      return;
    }

    this.lastSyncAttempt = now;

    try {
      // Check if we're online
      if (!navigator.onLine) {
        console.log('[AutoSync] Offline, skipping sync');
        return;
      }

      // Try to sync
      await syncService.sync();
    } catch (error) {
      console.warn('[AutoSync] Sync check failed (non-critical):', error);
      // Don't throw - this is a background service
    }
  }

  destroy() {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }
  }
}

export const autoSyncService = new AutoSyncService();

