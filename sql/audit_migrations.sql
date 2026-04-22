-- =============================================================================
-- audit_migrations.sql — À exécuter sur Supabase (SQL Editor), ordre idempotent
-- Regroupe les migrations nécessaires au plan Free / cumuls / soft-lock.
-- =============================================================================

-- Propriétaires : plan d'abonnement + identité (défauts alignés app)
ALTER TABLE public.proprietaires ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.proprietaires ADD COLUMN IF NOT EXISTS nom TEXT NOT NULL DEFAULT '';
ALTER TABLE public.proprietaires ADD COLUMN IF NOT EXISTS prenom TEXT NOT NULL DEFAULT '';

UPDATE public.proprietaires SET plan = 'free' WHERE plan IS NULL;

-- Compteurs cumulatifs (créations logements / locataires, même après suppression)
CREATE TABLE IF NOT EXISTS public.logements_cumul (
  proprietaire_id UUID PRIMARY KEY REFERENCES public.proprietaires(id) ON DELETE CASCADE,
  total_cree INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.locataires_cumul (
  proprietaire_id UUID PRIMARY KEY REFERENCES public.proprietaires(id) ON DELETE CASCADE,
  total_cree INTEGER DEFAULT 0 NOT NULL
);

-- Droit à l'erreur (plan Gratuit) : une modification comptée par entité
ALTER TABLE public.logements ADD COLUMN IF NOT EXISTS nb_modifications INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.locataires ADD COLUMN IF NOT EXISTS nb_modifications INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.quittances ADD COLUMN IF NOT EXISTS nb_modifications INTEGER DEFAULT 0 NOT NULL;

-- Soft-lock après downgrade de plan
ALTER TABLE public.logements ADD COLUMN IF NOT EXISTS verrouille BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.locataires ADD COLUMN IF NOT EXISTS verrouille BOOLEAN DEFAULT FALSE NOT NULL;

-- Fin — vérifier dans l'UI Table Editor que les colonnes / tables sont présentes.
