-- Coordonnées complètes des locataires (PDF bail, fiches, etc.)
alter table public.locataires
  add column if not exists adresse text,
  add column if not exists code_postal text,
  add column if not exists ville text,
  add column if not exists date_naissance date;
