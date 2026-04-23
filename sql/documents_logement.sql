-- Documents par logement : table + RLS + index + bucket Storage (idempotent).
-- Exécuter dans Supabase SQL Editor.

-- Table documents
create table if not exists public.documents_logement (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  proprietaire_id uuid references public.proprietaires (id) on delete cascade,
  logement_id uuid references public.logements (id) on delete cascade,
  nom text not null,
  categorie text not null,
  -- 'diagnostics' | 'assurances' | 'contrats' | 'travaux' | 'photos' | 'autres'
  taille_bytes bigint,
  type_mime text,
  storage_path text not null
);

comment on table public.documents_logement is 'Fichiers liés à un logement (Storage bucket documents-logements).';

alter table public.documents_logement enable row level security;

drop policy if exists "proprietaire_own_documents" on public.documents_logement;

create policy "proprietaire_own_documents"
  on public.documents_logement
  for all
  using (
    proprietaire_id = (
      select id from public.proprietaires
      where user_id = auth.uid()
    )
  )
  with check (
    proprietaire_id = (
      select id from public.proprietaires
      where user_id = auth.uid()
    )
  );

create index if not exists idx_documents_logement_id
  on public.documents_logement (logement_id);

create index if not exists idx_documents_logement_proprietaire_id
  on public.documents_logement (proprietaire_id);

-- Bucket Supabase Storage (privé)
insert into storage.buckets (id, name, public)
values ('documents-logements', 'documents-logements', false)
on conflict (id) do nothing;

-- Policies Storage (noms demandés ; ajuster si besoin selon votre politique de sécurité)
drop policy if exists "upload_own_documents" on storage.objects;
drop policy if exists "read_own_documents" on storage.objects;
drop policy if exists "delete_own_documents" on storage.objects;

create policy "upload_own_documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents-logements'
    and auth.uid() is not null
  );

create policy "read_own_documents"
  on storage.objects for select
  using (
    bucket_id = 'documents-logements'
    and auth.uid() is not null
  );

create policy "delete_own_documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents-logements'
    and auth.uid() is not null
  );
