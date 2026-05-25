export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  modelCount: number;
  lastSyncedAt: string | null;
}

export interface Model {
  id: string;
  providerName: string;
  providerEnabled: boolean;
  remoteModelId: string;
  publicModelId: string;
  selected: boolean;
  lastSeenAt: string;
}

export interface Config {
  serviceApiKey: string;
}

export type StatusKind = "info" | "ok" | "error";
