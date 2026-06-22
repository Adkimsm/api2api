-- Add prompt injection support to providers table
-- This enables providers to inject tool usage instructions into system prompt

ALTER TABLE providers ADD COLUMN inject_prompt INTEGER NOT NULL DEFAULT 0;
ALTER TABLE providers ADD COLUMN injected_prompt TEXT;

-- Field descriptions:
-- inject_prompt: 0=disabled, 1=enabled
-- injected_prompt: custom prompt text to append after auto-generated tool descriptions
--   NULL means no custom append text
