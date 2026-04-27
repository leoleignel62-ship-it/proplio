-- Performance indexes for common Locavio filters.
-- Safe to run multiple times.

create index if not exists idx_proprietaires_user_id
  on public.proprietaires (user_id);

create index if not exists idx_logements_proprietaire_id
  on public.logements (proprietaire_id);

create index if not exists idx_locataires_proprietaire_id
  on public.locataires (proprietaire_id);

create index if not exists idx_quittances_proprietaire_mois_annee
  on public.quittances (proprietaire_id, mois, annee);

create index if not exists idx_baux_proprietaire_statut
  on public.baux (proprietaire_id, statut);

create index if not exists idx_etats_des_lieux_bail_id
  on public.etats_des_lieux (bail_id);
