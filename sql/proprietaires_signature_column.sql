-- Ajout colonne signature dans proprietaires
alter table public.proprietaires
  add column if not exists signature_path text;
