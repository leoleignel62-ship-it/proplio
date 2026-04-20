-- Lien locataire ↔ logement (colocation) et chambre assignée
alter table public.locataires
  add column if not exists logement_id uuid references public.logements (id) on delete set null;

alter table public.locataires
  add column if not exists colocation_chambre_index integer;

comment on column public.locataires.colocation_chambre_index is '1 = Chambre 1, etc. Si logement en colocation.';
