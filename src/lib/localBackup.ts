/**
 * Local Backup Data Access
 * Provides fallback to local backup when Supabase is unavailable
 */

interface LocalBackupData {
  [tableName: string]: unknown[];
}

interface BackupMetadata {
  last_sync: string;
  supabase_url: string;
  tables_synced: number;
  total_records: number;
  errors: number;
}

interface BackupIndex {
  synced_at: string;
  tables: string[];
  counts: { [table: string]: number };
  errors: string[];
}

class LocalBackup {
  private backupDir = '/local-backup/data';
  private metadataPath = '/local-backup/metadata.json';
  private indexPath = '/local-backup/data/index.json';
  private cache: Map<string, unknown[]> = new Map();
  private metadata: BackupMetadata | null = null;
  private index: BackupIndex | null = null;

  /**
   * Check if local backup is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.metadataPath);
      if (response.ok) {
        this.metadata = await response.json();
        return true;
      }
    } catch (error) {
      console.debug('[LocalBackup] Backup not available:', error);
    }
    return false;
  }

  /**
   * Get metadata about the backup
   */
  getMetadata(): BackupMetadata | null {
    return this.metadata;
  }

  /**
   * Get index of available tables
   */
  async getIndex(): Promise<BackupIndex | null> {
    if (this.index) {
      return this.index;
    }

    try {
      const response = await fetch(this.indexPath);
      if (response.ok) {
        this.index = await response.json();
        return this.index;
      }
    } catch (error) {
      console.debug('[LocalBackup] Index not available:', error);
    }
    return null;
  }

  /**
   * Load data from local backup
   */
  async loadTable<T = unknown>(tableName: string): Promise<T[] | null> {
    // Check cache first
    if (this.cache.has(tableName)) {
      return this.cache.get(tableName) as T[];
    }

    try {
      const response = await fetch(`${this.backupDir}/${tableName}.json`);
      if (!response.ok) {
        return null;
      }

      const data = await response.json() as T[];
      this.cache.set(tableName, data);
      return data;
    } catch (error) {
      console.debug(`[LocalBackup] Failed to load ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Query data from local backup (simple filtering)
   */
  async queryTable<T = unknown>(
    tableName: string,
    filter?: (item: T) => boolean
  ): Promise<T[] | null> {
    const data = await this.loadTable<T>(tableName);
    if (!data) {
      return null;
    }

    if (filter) {
      return data.filter(filter);
    }

    return data;
  }

  /**
   * Get single record by ID
   */
  async getById<T = unknown>(tableName: string, id: string): Promise<T | null> {
    const data = await this.loadTable<T>(tableName);
    if (!data) {
      return null;
    }

    const record = data.find((item: unknown) => {
      if (typeof item === 'object' && item !== null && 'id' in item) {
        return (item as { id: string }).id === id;
      }
      return false;
    });

    return (record as T) || null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if backup is recent (within last 24 hours)
   */
  isRecent(): boolean {
    if (!this.metadata) {
      return false;
    }

    const lastSync = new Date(this.metadata.last_sync);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);

    return hoursSinceSync < 24;
  }
}

// Singleton instance
export const localBackup = new LocalBackup();

/**
 * Helper function to try Supabase first, fallback to local backup
 */
export async function withFallback<T>(
  supabaseCall: () => Promise<{ data: T | null; error: unknown }>,
  tableName: string,
  fallbackFilter?: (item: unknown) => boolean
): Promise<{ data: T | null; error: unknown; fromCache: boolean }> {
  try {
    // Try Supabase first
    const result = await supabaseCall();
    if (!result.error && result.data !== null) {
      return { ...result, fromCache: false };
    }

    // If Supabase fails, try local backup
    console.warn(`[withFallback] Supabase failed for ${tableName}, trying local backup...`);
    const backupData = await localBackup.queryTable(tableName, fallbackFilter);
    
    if (backupData) {
      console.info(`[withFallback] Using local backup for ${tableName} (${backupData.length} records)`);
      return {
        data: backupData as T,
        error: null,
        fromCache: true,
      };
    }

    // Both failed
    return {
      data: null,
      error: new Error(`Failed to fetch ${tableName} from Supabase and local backup`),
      fromCache: false,
    };
  } catch (error) {
    // Try local backup on error
    console.warn(`[withFallback] Error fetching ${tableName}, trying local backup...`, error);
    const backupData = await localBackup.queryTable(tableName, fallbackFilter);
    
    if (backupData) {
      console.info(`[withFallback] Using local backup for ${tableName} (${backupData.length} records)`);
      return {
        data: backupData as T,
        error: null,
        fromCache: true,
      };
    }

    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
      fromCache: false,
    };
  }
}

