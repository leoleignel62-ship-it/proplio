alter table baux
  add column if not exists surface_loi_boutin numeric,
  add column if not exists zone_tendue boolean default false,
  add column if not exists loyer_reference numeric,
  add column if not exists loyer_reference_majore numeric,
  add column if not exists complement_loyer numeric;
