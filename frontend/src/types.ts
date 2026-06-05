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

export interface TokenStats {
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ModelTokenStats {
  public_model_id: string;
  request_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface PeriodTokenStats {
  period: string;
  request_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface TokenStatsResponse {
  overall: TokenStats;
  byModel: ModelTokenStats[];
}

export interface TokenTrendResponse {
  data: PeriodTokenStats[];
  range: string;
}
