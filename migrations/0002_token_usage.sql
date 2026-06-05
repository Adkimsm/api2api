CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  public_model_id TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

CREATE INDEX token_usage_created_at_idx ON token_usage(created_at);
CREATE INDEX token_usage_model_created_idx ON token_usage(public_model_id, created_at);
