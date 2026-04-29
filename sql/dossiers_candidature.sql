create extension if not exists pgcrypto;

create table if not exists public.candidature_dossiers (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references auth.users(id) on delete cascade,
  logement_concerne text,
  loyer_reference numeric not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'recu', 'analyse')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.candidature_tokens (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.candidature_dossiers(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  email_candidat text not null,
  prenom_candidat text not null,
  nom_candidat text not null,
  expire_at timestamptz not null default now() + interval '14 days',
  soumis_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.candidature_formulaires (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.candidature_tokens(id) on delete cascade,
  dossier_id uuid not null references public.candidature_dossiers(id) on delete cascade,
  type_contrat text,
  employeur text,
  anciennete_mois integer,
  revenus_nets_mensuels numeric,
  a_garant boolean not null default false,
  type_garant text,
  revenus_garant numeric,
  situation text,
  nb_personnes_foyer integer,
  score integer,
  note text,
  details_score jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.candidature_documents (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.candidature_tokens(id) on delete cascade,
  dossier_id uuid not null references public.candidature_dossiers(id) on delete cascade,
  nom_fichier text not null,
  type_document text,
  storage_path text not null,
  taille_fichier integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_candidature_dossiers_proprietaire_id on public.candidature_dossiers(proprietaire_id);
create index if not exists idx_candidature_tokens_dossier_id on public.candidature_tokens(dossier_id);
create index if not exists idx_candidature_tokens_token on public.candidature_tokens(token);
create index if not exists idx_candidature_formulaires_dossier_id on public.candidature_formulaires(dossier_id);
create index if not exists idx_candidature_documents_dossier_id on public.candidature_documents(dossier_id);

create or replace function public.set_updated_at_candidature_dossiers()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidature_dossiers_set_updated_at on public.candidature_dossiers;
create trigger candidature_dossiers_set_updated_at
before update on public.candidature_dossiers
for each row
execute function public.set_updated_at_candidature_dossiers();

alter table public.candidature_dossiers enable row level security;
alter table public.candidature_tokens enable row level security;
alter table public.candidature_formulaires enable row level security;
alter table public.candidature_documents enable row level security;

drop policy if exists candidature_dossiers_select_own on public.candidature_dossiers;
drop policy if exists candidature_dossiers_insert_own on public.candidature_dossiers;
drop policy if exists candidature_dossiers_update_own on public.candidature_dossiers;
drop policy if exists candidature_dossiers_delete_own on public.candidature_dossiers;

create policy candidature_dossiers_select_own
on public.candidature_dossiers
for select
to authenticated
using (auth.uid() = proprietaire_id);

create policy candidature_dossiers_insert_own
on public.candidature_dossiers
for insert
to authenticated
with check (auth.uid() = proprietaire_id);

create policy candidature_dossiers_update_own
on public.candidature_dossiers
for update
to authenticated
using (auth.uid() = proprietaire_id)
with check (auth.uid() = proprietaire_id);

create policy candidature_dossiers_delete_own
on public.candidature_dossiers
for delete
to authenticated
using (auth.uid() = proprietaire_id);

drop policy if exists candidature_tokens_public_select on public.candidature_tokens;
drop policy if exists candidature_tokens_select_own on public.candidature_tokens;
drop policy if exists candidature_tokens_insert_own on public.candidature_tokens;
drop policy if exists candidature_tokens_update_own on public.candidature_tokens;
drop policy if exists candidature_tokens_delete_own on public.candidature_tokens;

create policy candidature_tokens_public_select
on public.candidature_tokens
for select
to anon, authenticated
using (true);

create policy candidature_tokens_select_own
on public.candidature_tokens
for select
to authenticated
using (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_tokens.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);

create policy candidature_tokens_insert_own
on public.candidature_tokens
for insert
to authenticated
with check (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_tokens.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);

create policy candidature_tokens_update_own
on public.candidature_tokens
for update
to authenticated
using (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_tokens.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);

create policy candidature_tokens_delete_own
on public.candidature_tokens
for delete
to authenticated
using (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_tokens.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);

drop policy if exists candidature_formulaires_insert_public_by_token on public.candidature_formulaires;
drop policy if exists candidature_formulaires_select_own on public.candidature_formulaires;

create policy candidature_formulaires_insert_public_by_token
on public.candidature_formulaires
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.candidature_tokens t
    where t.id = candidature_formulaires.token_id
      and t.dossier_id = candidature_formulaires.dossier_id
      and t.expire_at > now()
      and t.soumis_at is null
  )
);

create policy candidature_formulaires_select_own
on public.candidature_formulaires
for select
to authenticated
using (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_formulaires.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);

drop policy if exists candidature_documents_insert_public_by_token on public.candidature_documents;
drop policy if exists candidature_documents_select_own on public.candidature_documents;

create policy candidature_documents_insert_public_by_token
on public.candidature_documents
for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.candidature_tokens t
    where t.id = candidature_documents.token_id
      and t.dossier_id = candidature_documents.dossier_id
      and t.expire_at > now()
      and t.soumis_at is null
  )
);

create policy candidature_documents_select_own
on public.candidature_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.candidature_dossiers d
    where d.id = candidature_documents.dossier_id
      and d.proprietaire_id = auth.uid()
  )
);
