-- Colocation : détail des chambres par logement
alter table public.logements
  add column if not exists nombre_chambres integer not null default 0;

alter table public.logements
  add column if not exists chambres_details jsonb not null default '[]'::jsonb;
