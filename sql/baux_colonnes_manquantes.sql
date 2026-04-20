-- Colonnes attendues par le formulaire « Baux » (app Next.js) et absentes de votre schéma.
-- Idempotent : chaque ADD COLUMN IF NOT EXISTS peut être ré-exécuté sans erreur.
-- À exécuter dans le SQL Editor Supabase (projet cible).

-- Colocation
alter table public.baux
  add column if not exists colocataires_ids uuid[] not null default '{}';

-- Bail meublé : inventaire Alur + détails (quantité / pièces)
alter table public.baux
  add column if not exists equipements text[] not null default '{}';

alter table public.baux
  add column if not exists equipements_details jsonb not null default '{}'::jsonb;

alter table public.baux
  add column if not exists autres_meubles text not null default '';

-- Informations complémentaires du logement (saisies sur le bail)
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

-- Diagnostics et DPE (formulaire)
alter table public.baux
  add column if not exists dpe_classe_energie text;

alter table public.baux
  add column if not exists dpe_valeur_kwh numeric not null default 0;

alter table public.baux
  add column if not exists dpe_classe_ges text;

alter table public.baux
  add column if not exists diagnostics jsonb not null default '{}'::jsonb;

-- Modalités de paiement et état du bail
alter table public.baux
  add column if not exists mode_paiement_loyer text not null default 'virement';

alter table public.baux
  add column if not exists jour_paiement integer not null default 5;

alter table public.baux
  add column if not exists travaux_realises text not null default '';

alter table public.baux
  add column if not exists dernier_loyer_precedent numeric not null default 0;

alter table public.baux
  add column if not exists statut text not null default 'actif';

-- Utilisé par le tri de la liste des baux dans l’app
alter table public.baux
  add column if not exists created_at timestamptz not null default now();
