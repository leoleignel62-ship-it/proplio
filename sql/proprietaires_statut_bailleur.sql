alter table proprietaires
  add column if not exists statut_bailleur text default 'particulier'
  check (statut_bailleur in ('particulier', 'lmnp', 'lmp'));
