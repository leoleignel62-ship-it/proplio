alter table proprietaires
  drop constraint if exists proprietaires_statut_bailleur_check;

alter table proprietaires
  add constraint proprietaires_statut_bailleur_check
  check (statut_bailleur in (
    'particulier_nu',
    'particulier_meuble',
    'lmnp_micro',
    'lmnp_reel',
    'lmp',
    'indivision',
    'usufruitier',
    'sci_ir',
    'sci_is',
    'sarl_famille',
    'sas_sasu',
    'sci_attribution',
    'mandataire'
  ));

alter table proprietaires
  alter column statut_bailleur set default 'particulier_nu';

alter table proprietaires
  add column if not exists nom_societe text,
  add column if not exists siren_societe text;
