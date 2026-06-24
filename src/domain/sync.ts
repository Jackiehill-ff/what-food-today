export type SyncStatus = "local-only" | "synced" | "pending" | "failed";

export type MigrationStatus = "not-started" | "backup-created" | "needs-confirmation" | "completed";

export type SyncEntityType = "recipe" | "importRecord" | "mealPlanEntry" | "shoppingItem";

export type SyncQueueOperation = "upsert" | "delete";

export type SyncQueueItem = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  createdAt: string;
  attempts: number;
  error?: string;
};

export type SyncConflict = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  localUpdatedAt?: string;
  remoteUpdatedAt?: string;
  createdAt: string;
};

export type SyncMetadata = {
  userId?: string;
  deviceId: string;
  syncStatus: SyncStatus;
  syncQueue: SyncQueueItem[];
  syncConflicts: SyncConflict[];
  lastPulledAt?: string;
  lastPushedAt?: string;
  migrationStatus: MigrationStatus;
};
