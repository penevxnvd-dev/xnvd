/**
 * Sync Service
 * Automatically syncs Supabase data to local backup
 */

import { localBackup } from './localBackup';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

class SyncService {
  private status: SyncStatus = {
    isSyncing: false,
    lastSync: null,
    error: null,
  };

  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Check if sync is needed
   */
  async shouldSync(): Promise<boolean> {
    const metadata = localBackup.getMetadata();
    if (!metadata) {
      return true; // No backup exists, need to sync
    }

    const lastSync = new Date(metadata.last_sync);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    // Sync if backup is older than 24 hours
    return hoursSinceSync > 24;
  }

  /**
   * Trigger sync (called from backend script)
   * This is a placeholder - actual sync happens via sync-supabase-to-backup.js
   */
  async triggerSync(): Promise<void> {
    if (this.status.isSyncing) {
      console.log('[SyncService] Sync already in progress');
      return;
    }

    this.status.isSyncing = true;
    this.status.error = null;

    try {
      // In a real implementation, this would call an API endpoint
      // For now, we just check if backup is available
      const isAvailable = await localBackup.isAvailable();
      if (isAvailable) {
        this.status.lastSync = new Date();
        console.log('[SyncService] Backup is available');
      } else {
        console.warn('[SyncService] Backup not available');
      }
    } catch (error) {
      this.status.error = error instanceof Error ? error.message : String(error);
      console.error('[SyncService] Sync error:', error);
    } finally {
      this.status.isSyncing = false;
    }
  }

  /**
   * Start automatic syncing
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      return; // Already started
    }

    // Check on startup
    this.checkAndSync();

    // Then check periodically
    this.syncInterval = setInterval(() => {
      this.checkAndSync();
    }, this.SYNC_INTERVAL);

    console.log('[SyncService] Auto-sync started');
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncService] Auto-sync stopped');
    }
  }

  /**
   * Check if sync is needed and trigger it
   */
  private async checkAndSync(): Promise<void> {
    const shouldSync = await this.shouldSync();
    if (shouldSync) {
      console.log('[SyncService] Sync needed, triggering...');
      await this.triggerSync();
    }
  }

  /**
   * Get sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }
}

// Singleton instance
export const syncService = new SyncService();

