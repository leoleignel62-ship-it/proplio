CREATE TABLE IF NOT EXISTS locataires_cumul (
  proprietaire_id UUID PRIMARY KEY REFERENCES proprietaires(id) ON DELETE CASCADE,
  total_cree INTEGER DEFAULT 0
);
