-- =============================================================================
-- public.baux — colonnes attendues par app/baux/page.tsx (hors schéma initial)
-- =============================================================================
-- Exécuter une fois dans le SQL Editor Supabase (idempotent).
--
-- Schéma initial supposé déjà présent (création de table / migration de base) :
--   id, proprietaire_id, logement_id, locataire_id, type_bail,
--   date_debut, date_fin, duree_mois, loyer, charges, depot_garantie,
--   revision_loyer, designation_logement
--
-- Ce script ajoute en un seul ALTER toutes les autres colonnes utilisées par le
-- formulaire (insert/update + lecture + tri par created_at).
-- =============================================================================

alter table public.baux
  add column if not exists colocataires_ids uuid[] not null default '{}',
  add column if not exists equipements text[] not null default '{}',
  add column if not exists equipements_details jsonb not null default '{}'::jsonb,
  add column if not exists autres_meubles text not null default '',
  add column if not exists logement_etage text not null default '',
  add column if not exists interphone_digicode_oui boolean not null default false,
  add column if not exists interphone_digicode_code text not null default '',
  add column if not exists parking_inclus boolean not null default false,
  add column if not exists parking_numero text not null default '',
  add column if not exists cave_incluse boolean not null default false,
  add column if not exists cave_numero text not null default '',
  add column if not exists garage_inclus boolean not null default false,
  add column if not exists garage_numero text not null default '',
  add column if not exists dpe_classe_energie text,
  add column if not exists dpe_valeur_kwh numeric not null default 0,
  add column if not exists dpe_classe_ges text,
  add column if not exists diagnostics jsonb not null default '{}'::jsonb,
  add column if not exists mode_paiement_loyer text not null default 'virement',
  add column if not exists jour_paiement integer not null default 5,
  add column if not exists travaux_realises text not null default '',
  add column if not exists dernier_loyer_precedent numeric not null default 0,
  add column if not exists statut text not null default 'actif',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists email_envoye boolean not null default false,
  add column if not exists date_envoi_email timestamptz,
  add column if not exists clauses_particulieres text not null default '';
