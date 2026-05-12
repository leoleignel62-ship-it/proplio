-- Champs garant (décret 2015-1437 / formulaire candidature étendu)
alter table public.candidature_formulaires add column if not exists nom_prenom_garant text;
alter table public.candidature_formulaires add column if not exists employeur_garant text;
alter table public.candidature_formulaires add column if not exists type_contrat_garant text;
