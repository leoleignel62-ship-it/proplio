ALTER TABLE public.proprietaires
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_proprietaires_stripe_customer_id
ON public.proprietaires(stripe_customer_id);
