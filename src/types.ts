export type Env = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  SERVICE_API_KEY: string;
  API_KEY_ENCRYPTION_SECRET: string;
  CORS_ORIGIN?: string;
};

export type AppSettingRow = {
  key: string;
  value: string;
  updated_at: string;
};

export type ProviderRow = {
  id: string;
  name: string;
  base_url: string;
  encrypted_api_key: string;
  enabled: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  inject_tools: number;
  injected_tools: string | null;
  inject_prompt: number;
  injected_prompt: string | null;
};

export type ModelRow = {
  id: string;
  provider_id: string;
  remote_model_id: string;
  public_model_id: string;
  selected: number;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type ModelWithProviderRow = ModelRow & {
  provider_name: string;
  provider_base_url: string;
  provider_enabled: number;
  encrypted_api_key: string;
  inject_tools: number;
  injected_tools: string | null;
  inject_prompt: number;
  injected_prompt: string | null;
};

export type TokenUsageRow = {
  id: string;
  model_id: string;
  public_model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
};

export type TokenStats = {
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
};

export type ModelTokenStats = {
  public_model_id: string;
  request_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
};

export type PeriodTokenStats = {
  period: string;
  request_count: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
};
