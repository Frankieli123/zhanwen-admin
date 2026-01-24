-- AlterTable
ALTER TABLE "ai_models" ALTER COLUMN "context_window" SET DEFAULT 2000000;
ALTER TABLE "ai_models" ALTER COLUMN "parameters" SET DEFAULT '{"temperature": 0.7, "max_tokens": 0, "top_p": 1.0, "frequency_penalty": 0.0, "presence_penalty": 0.0}';

-- Data migration (legacy defaults)
UPDATE "ai_models"
SET "parameters" = jsonb_set(COALESCE("parameters", '{}'::jsonb), '{max_tokens}', '0'::jsonb, true)
WHERE COALESCE(("parameters" ->> 'max_tokens')::int, 0) = 3000;

