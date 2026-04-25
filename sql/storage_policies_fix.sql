-- Fix des policies Storage
-- - documents-logements : remplace les policies permissives par un contrôle d'ownership via chemin
-- - voyageurs-identite : ajoute des policies d'ownership via chemin
-- - signatures : inchangé (déjà correct)

begin;

-- ============================================================================
-- BUCKET documents-logements
-- ============================================================================

-- Supprimer les anciennes policies
drop policy if exists "upload_own_documents" on storage.objects;
drop policy if exists "read_own_documents" on storage.objects;
drop policy if exists "delete_own_documents" on storage.objects;

-- (au cas où le script est rejoué)
drop policy if exists "documents_select_own" on storage.objects;
drop policy if exists "documents_insert_own" on storage.objects;
drop policy if exists "documents_delete_own" on storage.objects;

-- Nouvelle policy SELECT
create policy "documents_select_own"
on storage.objects for select
using (
  bucket_id = 'documents-logements'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

-- Nouvelle policy INSERT
create policy "documents_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'documents-logements'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

-- Nouvelle policy DELETE
create policy "documents_delete_own"
on storage.objects for delete
using (
  bucket_id = 'documents-logements'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

-- ============================================================================
-- BUCKET voyageurs-identite
-- ============================================================================

-- (au cas où le script est rejoué)
drop policy if exists "identite_select_own" on storage.objects;
drop policy if exists "identite_insert_own" on storage.objects;
drop policy if exists "identite_delete_own" on storage.objects;

-- Policy SELECT
create policy "identite_select_own"
on storage.objects for select
using (
  bucket_id = 'voyageurs-identite'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

-- Policy INSERT
create policy "identite_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'voyageurs-identite'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

-- Policy DELETE
create policy "identite_delete_own"
on storage.objects for delete
using (
  bucket_id = 'voyageurs-identite'
  and split_part(name, '/', 1) = (
    select id::text
    from public.proprietaires
    where user_id = auth.uid()
  )
);

commit;
