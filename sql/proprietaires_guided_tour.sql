ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS guided_tour_free_done BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE proprietaires
ADD COLUMN IF NOT EXISTS guided_tour_paid_done BOOLEAN DEFAULT false NOT NULL;
