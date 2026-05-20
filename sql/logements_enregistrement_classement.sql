alter table logements
  add column if not exists numero_enregistrement text,
  add column if not exists classement_meuble_tourisme text default 'non_classe'
  check (classement_meuble_tourisme in
    ('non_classe', '1_etoile', '2_etoiles', '3_etoiles', '4_etoiles', '5_etoiles'));
