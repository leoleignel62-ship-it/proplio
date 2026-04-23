-- Mode location saisonnière Proplio
-- Exécuter dans Supabase SQL Editor après déploiement.
-- Storage : créer un bucket privé `voyageurs-identite` (upload pièces d’identité voyageurs).

-- Champ type sur logements
ALTER TABLE public.logements
ADD COLUMN IF NOT EXISTS type_location text
  DEFAULT 'classique';
-- 'classique' | 'saisonnier' | 'les_deux'

-- Champs supplémentaires logements saisonniers
ALTER TABLE public.logements
ADD COLUMN IF NOT EXISTS capacite_max integer,
ADD COLUMN IF NOT EXISTS tarif_nuit_basse numeric,
ADD COLUMN IF NOT EXISTS tarif_nuit_moyenne numeric,
ADD COLUMN IF NOT EXISTS tarif_nuit_haute numeric,
ADD COLUMN IF NOT EXISTS tarif_menage numeric,
ADD COLUMN IF NOT EXISTS tarif_caution numeric,
ADD COLUMN IF NOT EXISTS taxe_sejour_nuit numeric,
ADD COLUMN IF NOT EXISTS equipements_saisonnier
  text[],
ADD COLUMN IF NOT EXISTS reglement_interieur text,
ADD COLUMN IF NOT EXISTS instructions_acces text,
ADD COLUMN IF NOT EXISTS ical_airbnb_url text,
ADD COLUMN IF NOT EXISTS ical_booking_url text;

-- Table voyageurs
CREATE TABLE IF NOT EXISTS public.voyageurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  proprietaire_id uuid REFERENCES
    public.proprietaires(id) ON DELETE CASCADE,
  prenom text NOT NULL,
  nom text NOT NULL,
  email text,
  telephone text,
  nationalite text,
  numero_identite text,
  document_identite_path text
);

ALTER TABLE public.voyageurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proprietaire_own_voyageurs" ON public.voyageurs;
CREATE POLICY "proprietaire_own_voyageurs"
  ON public.voyageurs FOR ALL
  USING (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ));

-- Table réservations
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  proprietaire_id uuid REFERENCES
    public.proprietaires(id) ON DELETE CASCADE,
  logement_id uuid REFERENCES
    public.logements(id) ON DELETE CASCADE,
  voyageur_id uuid REFERENCES
    public.voyageurs(id) ON DELETE SET NULL,
  date_arrivee date NOT NULL,
  date_depart date NOT NULL,
  nb_voyageurs integer NOT NULL DEFAULT 1,
  nb_nuits integer GENERATED ALWAYS AS
    (date_depart - date_arrivee) STORED,
  tarif_nuit numeric NOT NULL,
  tarif_total numeric NOT NULL,
  tarif_menage numeric DEFAULT 0,
  tarif_caution numeric DEFAULT 0,
  montant_acompte numeric DEFAULT 0,
  acompte_paye boolean DEFAULT false,
  solde_paye boolean DEFAULT false,
  caution_restituee boolean DEFAULT false,
  montant_caution_retenu numeric DEFAULT 0,
  taxe_sejour_total numeric DEFAULT 0,
  statut text DEFAULT 'en_attente',
  source text DEFAULT 'direct',
  notes text,
  contrat_envoye boolean DEFAULT false,
  date_contrat_envoye timestamptz,
  acompte_recu_envoye boolean DEFAULT false,
  solde_recu_envoye boolean DEFAULT false
);

-- Signature contrat (statut affiché sur la page Contrats)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS contrat_signe boolean DEFAULT false;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proprietaire_own_reservations" ON public.reservations;
CREATE POLICY "proprietaire_own_reservations"
  ON public.reservations FOR ALL
  USING (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ));

-- Table taxe de séjour
CREATE TABLE IF NOT EXISTS public.taxes_sejour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  proprietaire_id uuid REFERENCES
    public.proprietaires(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES
    public.reservations(id) ON DELETE CASCADE,
  logement_id uuid REFERENCES
    public.logements(id) ON DELETE CASCADE,
  montant numeric NOT NULL,
  nb_personnes integer NOT NULL,
  nb_nuits integer NOT NULL,
  tarif_par_personne_nuit numeric NOT NULL,
  mois integer NOT NULL,
  annee integer NOT NULL,
  reversee boolean DEFAULT false,
  date_reversement date
);

ALTER TABLE public.taxes_sejour ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proprietaire_own_taxes" ON public.taxes_sejour;
CREATE POLICY "proprietaire_own_taxes"
  ON public.taxes_sejour FOR ALL
  USING (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ));

-- Table checklist ménage
CREATE TABLE IF NOT EXISTS public.menages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  proprietaire_id uuid REFERENCES
    public.proprietaires(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES
    public.reservations(id) ON DELETE CASCADE,
  logement_id uuid REFERENCES
    public.logements(id) ON DELETE CASCADE,
  statut text DEFAULT 'a_faire',
  prestataire text,
  notes text,
  checklist jsonb DEFAULT '[]'
);

ALTER TABLE public.menages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proprietaire_own_menages" ON public.menages;
CREATE POLICY "proprietaire_own_menages"
  ON public.menages FOR ALL
  USING (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (proprietaire_id = (
    SELECT id FROM public.proprietaires
    WHERE user_id = auth.uid()
  ));

-- Index
CREATE INDEX IF NOT EXISTS
  idx_reservations_logement_id
  ON public.reservations(logement_id);
CREATE INDEX IF NOT EXISTS
  idx_reservations_proprietaire_id
  ON public.reservations(proprietaire_id);
CREATE INDEX IF NOT EXISTS
  idx_reservations_dates
  ON public.reservations(date_arrivee, date_depart);
CREATE INDEX IF NOT EXISTS
  idx_voyageurs_proprietaire_id
  ON public.voyageurs(proprietaire_id);

-- Créneaux tarifs récurrents (MM-DD) + tarif nuit hors créneau
ALTER TABLE public.logements
ADD COLUMN IF NOT EXISTS tarifs_creneaux jsonb DEFAULT '[]';
ALTER TABLE public.logements
ADD COLUMN IF NOT EXISTS tarif_nuit_defaut numeric;

-- Heures arrivée / départ (contrat et affichage)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS heure_arrivee text DEFAULT '15:00';
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS heure_depart text DEFAULT '11:00';

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS menage_inclus boolean DEFAULT true;

-- Rappels acompte / solde (réservations directes)
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS acompte_recu boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS solde_recu boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS delai_solde_jours integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS rappel_acompte_envoye boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rappel_solde_envoye boolean DEFAULT false;
