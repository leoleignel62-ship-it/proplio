-- Policies RLS manquantes pour baux et contrats
-- Exécuter dans Supabase SQL Editor.

begin;

-- ============================================================================
-- TABLE BAUX
-- ============================================================================

-- Activer RLS
alter table public.baux
enable row level security;

-- SELECT : uniquement ses propres baux
drop policy if exists "baux_select_own" on public.baux;
create policy "baux_select_own" on public.baux
for select using (
  proprietaire_id = (
    select id from public.proprietaires
    where user_id = auth.uid()
  )
);

-- INSERT : uniquement pour soi-même
drop policy if exists "baux_insert_own" on public.baux;
create policy "baux_insert_own" on public.baux
for insert with check (
  proprietaire_id = (
    select id from public.proprietaires
    where user_id = auth.uid()
  )
);

-- UPDATE : uniquement ses propres baux
drop policy if exists "baux_update_own" on public.baux;
create policy "baux_update_own" on public.baux
for update using (
  proprietaire_id = (
    select id from public.proprietaires
    where user_id = auth.uid()
  )
);

-- DELETE : uniquement ses propres baux
drop policy if exists "baux_delete_own" on public.baux;
create policy "baux_delete_own" on public.baux
for delete using (
  proprietaire_id = (
    select id from public.proprietaires
    where user_id = auth.uid()
  )
);

-- ============================================================================
-- TABLE CONTRATS
-- ============================================================================

-- Vérifier d'abord si la table contrats existe dans Supabase, si oui appliquer :
do $$
begin
  if to_regclass('public.contrats') is not null then
    -- Activer RLS
    alter table public.contrats
    enable row level security;

    -- Policy ALL via proprietaire_id
    execute 'drop policy if exists "contrats_all_own" on public.contrats';
    execute $policy$
      create policy "contrats_all_own" on public.contrats
      for all using (
        proprietaire_id = (
          select id from public.proprietaires
          where user_id = auth.uid()
        )
      ) with check (
        proprietaire_id = (
          select id from public.proprietaires
          where user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end $$;

commit;
