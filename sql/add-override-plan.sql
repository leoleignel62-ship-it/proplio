ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS override_plan text;
