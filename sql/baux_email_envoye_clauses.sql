-- Envoi e-mail du bail + clauses particulières (formulaire)
alter table public.baux
  add column if not exists email_envoye boolean not null default false;

alter table public.baux
  add column if not exists date_envoi_email timestamptz;

alter table public.baux
  add column if not exists clauses_particulieres text not null default '';
