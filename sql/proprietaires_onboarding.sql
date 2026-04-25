ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS onboarding_free_done BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS onboarding_paid_done BOOLEAN DEFAULT false NOT NULL;
