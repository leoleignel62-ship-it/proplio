alter table etats_des_lieux
  add column if not exists heure_etat text,
  add column if not exists mode_chauffage text 
    check (mode_chauffage in (
      'individuel_gaz', 'individuel_electrique', 'individuel_fioul',
      'individuel_pompe_chaleur', 'individuel_bois', 
      'collectif_gaz', 'collectif_electrique', 'collectif_fioul',
      'collectif_pompe_chaleur', 'autre'
    )),
  add column if not exists cles_detail jsonb default '[]'::jsonb;
