-- =========================================================
-- RLS + policies auth.uid() pour Gestion Locative
-- A executer dans Supabase SQL Editor
-- =========================================================

begin;

-- ---------------------------------------------------------
-- 1) Contraintes d'integrite minimales
-- ---------------------------------------------------------

-- Un seul profil proprietaire par utilisateur auth
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

-- ---------------------------------------------------------
-- 2) Activation RLS
-- ---------------------------------------------------------

alter table public.proprietaires enable row level security;
alter table public.logements enable row level security;
alter table public.locataires enable row level security;
alter table public.quittances enable row level security;

-- Optionnel mais recommande: forcer RLS meme pour table owner
alter table public.proprietaires force row level security;
alter table public.logements force row level security;
alter table public.locataires force row level security;
alter table public.quittances force row level security;

-- ---------------------------------------------------------
-- 3) Nettoyage policies existantes (idempotent)
-- ---------------------------------------------------------

drop policy if exists proprietaires_select_own on public.proprietaires;
drop policy if exists proprietaires_insert_own on public.proprietaires;
drop policy if exists proprietaires_update_own on public.proprietaires;
drop policy if exists proprietaires_delete_own on public.proprietaires;

drop policy if exists logements_select_own on public.logements;
drop policy if exists logements_insert_own on public.logements;
drop policy if exists logements_update_own on public.logements;
drop policy if exists logements_delete_own on public.logements;

drop policy if exists locataires_select_own on public.locataires;
drop policy if exists locataires_insert_own on public.locataires;
drop policy if exists locataires_update_own on public.locataires;
drop policy if exists locataires_delete_own on public.locataires;

drop policy if exists quittances_select_own on public.quittances;
drop policy if exists quittances_insert_own on public.quittances;
drop policy if exists quittances_update_own on public.quittances;
drop policy if exists quittances_delete_own on public.quittances;

-- ---------------------------------------------------------
-- 4) Policies table proprietaires
-- ---------------------------------------------------------

create policy proprietaires_select_own
  on public.proprietaires
  for select
  to authenticated
  using (user_id = auth.uid());

create policy proprietaires_insert_own
  on public.proprietaires
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy proprietaires_update_own
  on public.proprietaires
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy proprietaires_delete_own
  on public.proprietaires
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------
-- 5) Policies tables metier (proprietaire_id = auth.uid())
-- ---------------------------------------------------------

create policy logements_select_own
  on public.logements
  for select
  to authenticated
  using (proprietaire_id = auth.uid());

create policy logements_insert_own
  on public.logements
  for insert
  to authenticated
  with check (proprietaire_id = auth.uid());

create policy logements_update_own
  on public.logements
  for update
  to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create policy logements_delete_own
  on public.logements
  for delete
  to authenticated
  using (proprietaire_id = auth.uid());

create policy locataires_select_own
  on public.locataires
  for select
  to authenticated
  using (proprietaire_id = auth.uid());

create policy locataires_insert_own
  on public.locataires
  for insert
  to authenticated
  with check (proprietaire_id = auth.uid());

create policy locataires_update_own
  on public.locataires
  for update
  to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create policy locataires_delete_own
  on public.locataires
  for delete
  to authenticated
  using (proprietaire_id = auth.uid());

create policy quittances_select_own
  on public.quittances
  for select
  to authenticated
  using (proprietaire_id = auth.uid());

create policy quittances_insert_own
  on public.quittances
  for insert
  to authenticated
  with check (proprietaire_id = auth.uid());

create policy quittances_update_own
  on public.quittances
  for update
  to authenticated
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create policy quittances_delete_own
  on public.quittances
  for delete
  to authenticated
  using (proprietaire_id = auth.uid());

-- ---------------------------------------------------------
-- 6) Creation auto d'une ligne proprietaire a l'inscription
-- ---------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.proprietaires (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;
