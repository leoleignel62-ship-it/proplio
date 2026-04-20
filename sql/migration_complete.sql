-- =============================================================================
-- migration_complete.sql — Schéma colonnes aligné sur l'app (app/ + lib/)
-- =============================================================================
-- Exécution unique, idempotente (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS).
--
-- Audit des requêtes Supabase (fév. 2026) :
--   • proprietaires     : lib/proprietaire-profile.ts (select/insert/update)
--   • logements         : app/logements/page.tsx, app/baux, app/locataires,
--                         app/quittances, app/api/baux/*, app/api/quittances/*
--   • locataires        : app/locataires/page.tsx, app/baux, app/quittances, API
--   • quittances        : app/quittances/page.tsx, app/page.tsx, API send
--   • baux              : app/baux/page.tsx, API pdf/send
--   • logement_locataires, etats_des_lieux, photos_etat_des_lieux :
--                         non référencés dans le code actuel ; colonnes prévues
--                         pour le module décrit dans CONTEXT.md (états des lieux).
--
-- Tables : squelette minimal si absentes, puis toutes les colonnes métier.
-- =============================================================================
-- Extension : hors transaction (recommandé PostgreSQL / Supabase).
create extension if not exists "pgcrypto";

begin;

-- ---------------------------------------------------------------------------
-- 1) Tables squelette (si la base est vide ou tables manquantes)
-- ---------------------------------------------------------------------------
create table if not exists public.proprietaires (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.logements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.locataires (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.baux (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.quittances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.logement_locataires (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.etats_des_lieux (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.photos_etat_des_lieux (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) public.proprietaires
--     Utilisé : user_id, email (ensure row), nom, prenom, telephone, adresse,
--     ville, code_postal, siret, signature_path (saveProprietaireProfile)
-- ---------------------------------------------------------------------------
alter table public.proprietaires
  add column if not exists user_id uuid,
  add column if not exists email text not null default '',
  add column if not exists nom text not null default '',
  add column if not exists prenom text not null default '',
  add column if not exists telephone text not null default '',
  add column if not exists adresse text not null default '',
  add column if not exists ville text not null default '',
  add column if not exists code_postal text not null default '',
  add column if not exists siret text,
  add column if not exists signature_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'proprietaires_user_id_unique'
      and conrelid = 'public.proprietaires'::regclass
  ) then
    alter table public.proprietaires
      add constraint proprietaires_user_id_unique unique (user_id);
  end if;
end
$$;

comment on table public.proprietaires is 'Profil bailleur ; lié à auth.users via user_id.';

-- ---------------------------------------------------------------------------
-- 3) public.logements
--     Utilisé : insert/update app/logements (proprietaire_id, nom, adresse,
--     ville, code_postal, type, surface, loyer, charges, est_colocation,
--     nombre_chambres, chambres_details), order by created_at
-- ---------------------------------------------------------------------------
alter table public.logements
  add column if not exists proprietaire_id uuid,
  add column if not exists nom text not null default '',
  add column if not exists adresse text not null default '',
  add column if not exists ville text not null default '',
  add column if not exists code_postal text not null default '',
  add column if not exists type text not null default '',
  add column if not exists surface numeric not null default 0,
  add column if not exists loyer numeric not null default 0,
  add column if not exists charges numeric not null default 0,
  add column if not exists est_colocation boolean not null default false,
  add column if not exists nombre_chambres integer not null default 0,
  add column if not exists chambres_details jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 4) public.locataires
--     Utilisé : insert/update app/locataires (proprietaire_id, nom, prenom,
--     email, telephone, logement_id, colocation_chambre_index), order created_at
-- ---------------------------------------------------------------------------
alter table public.locataires
  add column if not exists proprietaire_id uuid,
  add column if not exists nom text not null default '',
  add column if not exists prenom text not null default '',
  add column if not exists email text not null default '',
  add column if not exists telephone text not null default '',
  add column if not exists logement_id uuid references public.logements (id) on delete set null,
  add column if not exists colocation_chambre_index integer;

comment on column public.locataires.colocation_chambre_index is '1 = chambre 1, etc. si colocation.';

-- ---------------------------------------------------------------------------
-- 5) public.quittances
--     Utilisé : insert/update app/quittances + API send (envoyee, date_envoi),
--     filtre dashboard sur created_at + envoyee
-- ---------------------------------------------------------------------------
alter table public.quittances
  add column if not exists proprietaire_id uuid,
  add column if not exists logement_id uuid,
  add column if not exists locataire_id uuid,
  add column if not exists mois integer not null default 1,
  add column if not exists annee integer not null default extract(year from now())::integer,
  add column if not exists loyer numeric not null default 0,
  add column if not exists charges numeric not null default 0,
  add column if not exists total numeric not null default 0,
  add column if not exists envoyee boolean not null default false,
  add column if not exists date_envoi timestamptz;

-- ---------------------------------------------------------------------------
-- 6) public.baux
--     Utilisé : app/baux/page.tsx (payload complet), API pdf (select *),
--     API send (update email_envoye, date_envoi_email)
-- ---------------------------------------------------------------------------
alter table public.baux
  add column if not exists proprietaire_id uuid,
  add column if not exists logement_id uuid,
  add column if not exists locataire_id uuid,
  add column if not exists colocataires_ids uuid[] not null default '{}',
  add column if not exists colocation_chambre_index integer,
  add column if not exists colocation_parties_communes text not null default '',
  add column if not exists type_bail text not null default 'vide',
  add column if not exists date_debut date,
  add column if not exists date_fin date,
  add column if not exists duree_mois integer not null default 36,
  add column if not exists loyer numeric not null default 0,
  add column if not exists charges numeric not null default 0,
  add column if not exists depot_garantie numeric not null default 0,
  add column if not exists revision_loyer text not null default '',
  add column if not exists designation_logement text not null default '',
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
  add column if not exists email_envoye boolean not null default false,
  add column if not exists date_envoi_email timestamptz,
  add column if not exists clauses_particulieres text not null default '';

comment on column public.baux.colocation_chambre_index is 'Bail colocation individuel : numéro de chambre (1-based).';
comment on column public.baux.colocation_parties_communes is 'Parties communes décrites sur le PDF (colocation).';

-- ---------------------------------------------------------------------------
-- 7) public.logement_locataires
--     Prévu : liaison N-N / historique (non utilisé par l'app actuelle ;
--     locataires.logement_id couvre le besoin courant).
-- ---------------------------------------------------------------------------
alter table public.logement_locataires
  add column if not exists proprietaire_id uuid,
  add column if not exists logement_id uuid,
  add column if not exists locataire_id uuid,
  add column if not exists date_debut date,
  add column if not exists date_fin date,
  add column if not exists actif boolean not null default true,
  add column if not exists notes text not null default '';

comment on table public.logement_locataires is 'Lien optionnel logement-locataire (module futur ou exports).';

-- ---------------------------------------------------------------------------
-- 8) public.etats_des_lieux
--     Prévu : CONTEXT.md — entrée/sortie, pièces, comparaison, PDF.
-- ---------------------------------------------------------------------------
alter table public.etats_des_lieux
  add column if not exists proprietaire_id uuid,
  add column if not exists logement_id uuid,
  add column if not exists locataire_id uuid,
  add column if not exists bail_id uuid,
  add column if not exists type_etat text not null default 'entree',
  add column if not exists date_etat date,
  add column if not exists observations text not null default '',
  add column if not exists pieces jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

comment on table public.etats_des_lieux is 'État des lieux (module prévu ; non câblé dans app/ actuellement).';
comment on column public.etats_des_lieux.type_etat is 'ex. entree | sortie';

-- ---------------------------------------------------------------------------
-- 9) public.photos_etat_des_lieux
--     Prévu : photos stockage Supabase Storage, liées à un état des lieux.
-- ---------------------------------------------------------------------------
alter table public.photos_etat_des_lieux
  add column if not exists proprietaire_id uuid,
  add column if not exists etat_des_lieux_id uuid,
  add column if not exists storage_path text not null default '',
  add column if not exists piece text not null default '',
  add column if not exists ordre integer not null default 0,
  add column if not exists legende text not null default '';

comment on table public.photos_etat_des_lieux is 'Photos état des lieux (module prévu).';

commit;
