-- Révisions IRL : table historique + colonnes baux + RLS (idempotent).
-- Exécuter dans Supabase SQL Editor.

-- Colonnes baux requises pour la révision IRL (si absentes)
alter table public.baux
  add column if not exists loyer_initial numeric,
  add column if not exists irl_reference numeric,
  add column if not exists date_derniere_revision date;

comment on column public.baux.loyer_initial is 'Loyer HC de référence pour clause IRL (souvent égal au loyer à la signature).';
comment on column public.baux.irl_reference is 'Valeur IRL (indice) en vigueur à la date de référence du bail.';
comment on column public.baux.date_derniere_revision is 'Date de la dernière révision de loyer appliquée (IRL).';

update public.baux
set loyer_initial = coalesce(loyer_initial, loyer)
where loyer_initial is null;

create table if not exists public.revisions_irl (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  bail_id uuid references public.baux (id) on delete cascade,
  proprietaire_id uuid references public.proprietaires (id) on delete cascade,
  loyer_avant numeric not null,
  loyer_apres numeric not null,
  irl_ancien numeric not null,
  irl_nouveau numeric not null,
  date_revision date not null,
  statut text not null default 'proposee',
  date_validation timestamptz,
  lettre_envoyee boolean default false,
  date_envoi_lettre timestamptz
);

comment on column public.revisions_irl.statut is 'proposee | validee | refusee';

create index if not exists idx_revisions_irl_bail_id on public.revisions_irl (bail_id);
create index if not exists idx_revisions_irl_proprietaire_id on public.revisions_irl (proprietaire_id);

alter table public.revisions_irl enable row level security;

drop policy if exists "proprietaire_own_revisions" on public.revisions_irl;

create policy "proprietaire_own_revisions"
  on public.revisions_irl
  for all
  using (
    proprietaire_id = (
      select id
      from public.proprietaires
      where user_id = auth.uid()
    )
  )
  with check (
    proprietaire_id = (
      select id
      from public.proprietaires
      where user_id = auth.uid()
    )
  );
