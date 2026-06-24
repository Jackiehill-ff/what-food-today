import { STORAGE_KEY, SYNC_STORAGE_KEY } from "../domain/constants";
import { createId, createTimestamp } from "../domain/ids";
import type { SyncMetadata } from "../domain/sync";

const DEFAULT_SYNC_METADATA: SyncMetadata = {
  deviceId: "",
  syncStatus: "local-only",
  syncQueue: [],
  syncConflicts: [],
  migrationStatus: "not-started",
};

const createDeviceId = () => `device-${createId()}`;

const normalizeSyncMetadata = (metadata: Partial<SyncMetadata>): SyncMetadata => ({
  userId: metadata.userId,
  deviceId: metadata.deviceId || createDeviceId(),
  syncStatus: metadata.syncStatus ?? "local-only",
  syncQueue: Array.isArray(metadata.syncQueue) ? metadata.syncQueue : [],
  syncConflicts: Array.isArray(metadata.syncConflicts) ? metadata.syncConflicts : [],
  lastPulledAt: metadata.lastPulledAt,
  lastPushedAt: metadata.lastPushedAt,
  migrationStatus: metadata.migrationStatus ?? "not-started",
});

export const loadSyncMetadata = (): SyncMetadata => {
  try {
    const stored = localStorage.getItem(SYNC_STORAGE_KEY);
    return normalizeSyncMetadata(stored ? (JSON.parse(stored) as Partial<SyncMetadata>) : DEFAULT_SYNC_METADATA);
  } catch {
    return normalizeSyncMetadata(DEFAULT_SYNC_METADATA);
  }
};

export const saveSyncMetadata = (metadata: SyncMetadata) => {
  localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(metadata));
};

export const createAppStateBackup = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  const backupKey = `${STORAGE_KEY}-backup-${createTimestamp().replace(/[:.]/g, "-")}`;
  localStorage.setItem(backupKey, stored);
  return backupKey;
};
