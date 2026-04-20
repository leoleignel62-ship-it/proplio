-- Colocation et informations complémentaires du logement sur les baux
-- À exécuter sur le projet Supabase (SQL editor).

alter table public.baux
  add column if not exists colocataires_ids uuid[] not null default '{}';

alter table public.baux
  add column if not exists logement_etage text not null default '';

alter table public.baux
  add column if not exists interphone_digicode_oui boolean not null default false;

alter table public.baux
  add column if not exists interphone_digicode_code text not null default '';

alter table public.baux
  add column if not exists parking_inclus boolean not null default false;

alter table public.baux
  add column if not exists parking_numero text not null default '';

alter table public.baux
  add column if not exists cave_incluse boolean not null default false;

alter table public.baux
  add column if not exists cave_numero text not null default '';

alter table public.baux
  add column if not exists garage_inclus boolean not null default false;

alter table public.baux
  add column if not exists garage_numero text not null default '';
