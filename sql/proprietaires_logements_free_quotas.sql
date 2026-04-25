ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS logements_modifs_cumul INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS logements_suppressions_cumul INTEGER DEFAULT 0 NOT NULL;
