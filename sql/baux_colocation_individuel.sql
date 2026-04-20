-- Baux en colocation : une chambre par bail + texte parties communes (PDF)
alter table public.baux
  add column if not exists colocation_chambre_index integer;

alter table public.baux
  add column if not exists colocation_parties_communes text not null default '';

comment on column public.baux.colocation_chambre_index is '1 = chambre 1, etc. Si logement en colocation et bail individuel.';
comment on column public.baux.colocation_parties_communes is 'Description des parties communes pour le PDF (colocation).';
