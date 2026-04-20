-- Module États des lieux — colonnes complètes + RLS + bucket storage
-- À exécuter dans le SQL Editor Supabase (après migration_complete.sql).

begin;

-- ---------------------------------------------------------------------------
-- etats_des_lieux
-- ---------------------------------------------------------------------------
alter table public.etats_des_lieux
  add column if not exists created_at timestamptz not null default now();

alter table public.etats_des_lieux
  add column if not exists statut text not null default 'en_cours';

alter table public.etats_des_lieux
  add column if not exists type_logement text not null default 'vide';

alter table public.etats_des_lieux
  add column if not exists compteurs jsonb not null default '{}'::jsonb;

alter table public.etats_des_lieux
  add column if not exists cles_remises integer not null default 0;

alter table public.etats_des_lieux
  add column if not exists badges_remis integer not null default 0;

alter table public.etats_des_lieux
  add column if not exists etat_entree_id uuid references public.etats_des_lieux (id) on delete set null;

alter table public.etats_des_lieux
  add column if not exists email_envoye boolean not null default false;

alter table public.etats_des_lieux
  add column if not exists date_envoi_email timestamptz;

comment on column public.etats_des_lieux.statut is 'en_cours | termine';
comment on column public.etats_des_lieux.type_logement is 'meuble | vide';
comment on column public.etats_des_lieux.pieces is 'JSON : pièces, éléments, états, commentaires, chemins photos';
comment on column public.etats_des_lieux.compteurs is 'JSON : index compteurs + chemins photos';
comment on column public.etats_des_lieux.etat_entree_id is 'Pour un état de sortie : lien vers l''état d''entrée du même bail (comparaison).';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'etats_des_lieux_statut_check'
  ) then
    alter table public.etats_des_lieux
      add constraint etats_des_lieux_statut_check
      check (statut in ('en_cours', 'termine'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'etats_des_lieux_type_logement_check'
  ) then
    alter table public.etats_des_lieux
      add constraint etats_des_lieux_type_logement_check
      check (type_logement in ('meuble', 'vide'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'etats_des_lieux_type_etat_check'
  ) then
    alter table public.etats_des_lieux
      add constraint etats_des_lieux_type_etat_check
      check (type_etat in ('entree', 'sortie'));
  end if;
end $$;

-- Colonne `type` (entree | sortie) : certaines bases l'exigent en NOT NULL ; l'app envoie `type` et `type_etat` identiques.
alter table public.etats_des_lieux
  add column if not exists type text;

update public.etats_des_lieux edl
set type = edl.type_etat
where edl.type is null or trim(coalesce(edl.type, '')) = '';

comment on column public.etats_des_lieux.type is 'entree | sortie — aligné sur type_etat ; requis par certains schémas / intégrations.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'etats_des_lieux_type_check'
  ) then
    alter table public.etats_des_lieux
      add constraint etats_des_lieux_type_check
      check (type is null or type in ('entree', 'sortie'));
  end if;
end $$;

create index if not exists etats_des_lieux_proprietaire_id_idx on public.etats_des_lieux (proprietaire_id);
create index if not exists etats_des_lieux_bail_id_idx on public.etats_des_lieux (bail_id);
create index if not exists etats_des_lieux_etat_entree_id_idx on public.etats_des_lieux (etat_entree_id);

-- ---------------------------------------------------------------------------
-- photos_etat_des_lieux
-- ---------------------------------------------------------------------------
alter table public.photos_etat_des_lieux
  add column if not exists element_key text not null default '';

alter table public.photos_etat_des_lieux
  add column if not exists created_at timestamptz not null default now();

comment on column public.photos_etat_des_lieux.piece is 'Identifiant pièce (ex. salon, chambre_1)';
comment on column public.photos_etat_des_lieux.element_key is 'Clé élément (ex. murs, sol)';

create index if not exists photos_edl_etat_id_idx on public.photos_etat_des_lieux (etat_des_lieux_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.etats_des_lieux enable row level security;
alter table public.etats_des_lieux force row level security;
alter table public.photos_etat_des_lieux enable row level security;
alter table public.photos_etat_des_lieux force row level security;

drop policy if exists etats_des_lieux_select_own on public.etats_des_lieux;
drop policy if exists etats_des_lieux_insert_own on public.etats_des_lieux;
drop policy if exists etats_des_lieux_update_own on public.etats_des_lieux;
drop policy if exists etats_des_lieux_delete_own on public.etats_des_lieux;

create policy etats_des_lieux_select_own
  on public.etats_des_lieux for select to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = etats_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy etats_des_lieux_insert_own
  on public.etats_des_lieux for insert to authenticated
  with check (
    exists (
      select 1 from public.proprietaires p
      where p.id = etats_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy etats_des_lieux_update_own
  on public.etats_des_lieux for update to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = etats_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.proprietaires p
      where p.id = etats_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy etats_des_lieux_delete_own
  on public.etats_des_lieux for delete to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = etats_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

drop policy if exists photos_edl_select_own on public.photos_etat_des_lieux;
drop policy if exists photos_edl_insert_own on public.photos_etat_des_lieux;
drop policy if exists photos_edl_update_own on public.photos_etat_des_lieux;
drop policy if exists photos_edl_delete_own on public.photos_etat_des_lieux;

create policy photos_edl_select_own
  on public.photos_etat_des_lieux for select to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = photos_etat_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy photos_edl_insert_own
  on public.photos_etat_des_lieux for insert to authenticated
  with check (
    exists (
      select 1 from public.proprietaires p
      where p.id = photos_etat_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy photos_edl_update_own
  on public.photos_etat_des_lieux for update to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = photos_etat_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.proprietaires p
      where p.id = photos_etat_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

create policy photos_edl_delete_own
  on public.photos_etat_des_lieux for delete to authenticated
  using (
    exists (
      select 1 from public.proprietaires p
      where p.id = photos_etat_des_lieux.proprietaire_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket etats-des-lieux (chemins : {proprietaire_id}/{edl_id}/...)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('etats-des-lieux', 'etats-des-lieux', false)
on conflict (id) do nothing;

drop policy if exists edl_storage_select on storage.objects;
drop policy if exists edl_storage_insert on storage.objects;
drop policy if exists edl_storage_update on storage.objects;
drop policy if exists edl_storage_delete on storage.objects;

create policy edl_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'etats-des-lieux'
    and exists (
      select 1 from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy edl_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'etats-des-lieux'
    and exists (
      select 1 from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy edl_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'etats-des-lieux'
    and exists (
      select 1 from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  )
  with check (
    bucket_id = 'etats-des-lieux'
    and exists (
      select 1 from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy edl_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'etats-des-lieux'
    and exists (
      select 1 from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

commit;
