begin;

alter table public.etats_des_lieux
add column if not exists reservation_id uuid
  references public.reservations(id)
  on delete set null;

create index if not exists etats_des_lieux_reservation_id_idx
  on public.etats_des_lieux (reservation_id);

commit;
