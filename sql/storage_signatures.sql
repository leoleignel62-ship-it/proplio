-- Bucket + policies pour signatures propriétaires
-- A executer dans Supabase SQL Editor

insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', false)
on conflict (id) do nothing;

drop policy if exists signatures_select_own on storage.objects;
drop policy if exists signatures_insert_own on storage.objects;
drop policy if exists signatures_update_own on storage.objects;
drop policy if exists signatures_delete_own on storage.objects;

create policy signatures_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'signatures'
    and exists (
      select 1
      from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy signatures_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'signatures'
    and exists (
      select 1
      from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy signatures_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'signatures'
    and exists (
      select 1
      from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  )
  with check (
    bucket_id = 'signatures'
    and exists (
      select 1
      from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );

create policy signatures_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'signatures'
    and exists (
      select 1
      from public.proprietaires p
      where p.user_id = auth.uid()
        and split_part(storage.objects.name, '/', 1) = p.id::text
    )
  );
