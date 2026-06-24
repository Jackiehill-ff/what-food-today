import { loadAppState, saveAppState } from "./appStorage";
import type { AppState } from "../domain/types";

export type AppStateRepository = {
  load: () => AppState;
  save: (state: AppState) => void;
};

export type CloudSyncResult = {
  status: "not-implemented";
};

export type CloudAppStateRepository = {
  pull: (userId: string) => Promise<CloudSyncResult>;
  push: (userId: string, state: AppState) => Promise<CloudSyncResult>;
};

export const localAppStateRepository: AppStateRepository = {
  load: loadAppState,
  save: saveAppState,
};

export const cloudAppStateRepository: CloudAppStateRepository = {
  pull: async () => ({ status: "not-implemented" }),
  push: async () => ({ status: "not-implemented" }),
};
