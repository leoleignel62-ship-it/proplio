alter table reservations
  add column if not exists nuitees_exonerees integer default 0,
  add column if not exists motif_exoneration text 
    check (motif_exoneration in (
      'mineurs', 'handicap', 'saisonnier', 'urgence', 'autre', null
    ));

alter table taxes_sejour
  add column if not exists nuitees_exonerees integer default 0,
  add column if not exists motif_exoneration text;
