-- Signature papier (retour manuel par le propriétaire)
ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS signed_manually boolean NOT NULL DEFAULT false;

ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS signed_manually_at timestamptz;
