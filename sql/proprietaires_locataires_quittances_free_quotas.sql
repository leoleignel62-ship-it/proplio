ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS locataires_modifs_cumul INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS locataires_suppressions_cumul INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS quittances_modifs_cumul INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS quittances_suppressions_cumul INTEGER DEFAULT 0 NOT NULL;
