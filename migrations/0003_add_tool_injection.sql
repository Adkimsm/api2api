-- Add tool injection support to providers table
-- This enables providers to inject additional tools into OpenAI API requests

ALTER TABLE providers ADD COLUMN inject_tools INTEGER NOT NULL DEFAULT 0;
ALTER TABLE providers ADD COLUMN injected_tools TEXT;

-- Field descriptions:
-- inject_tools: 0=disabled, 1=enabled
-- injected_tools: JSON array of OpenAI tools, e.g.:
--   '[{"type":"function","name":"get_weather","parameters":{...}}]'
--   '[{"type":"file_search","vector_store_ids":["vs_123"]}]'
--   NULL or empty string means no injection
