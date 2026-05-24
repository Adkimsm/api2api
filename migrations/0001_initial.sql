CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  remote_model_id TEXT NOT NULL,
  public_model_id TEXT NOT NULL UNIQUE,
  selected INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX models_provider_remote_unique
ON models(provider_id, remote_model_id);

CREATE INDEX models_selected_idx
ON models(selected);

CREATE INDEX models_provider_idx
ON models(provider_id);
