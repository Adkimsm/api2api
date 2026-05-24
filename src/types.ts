export type Env = {
  DB: D1Database;
  ADMIN_TOKEN: string;
  SERVICE_API_KEY: string;
  API_KEY_ENCRYPTION_SECRET: string;
  CORS_ORIGIN?: string;
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
};
