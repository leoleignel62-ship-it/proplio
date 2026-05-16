-- Support client : tickets et messages
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietaire_id uuid NOT NULL REFERENCES proprietaires(id) ON DELETE CASCADE,
  sujet text NOT NULL,
  description text NOT NULL,
  priorite text NOT NULL DEFAULT 'normale' CHECK (priorite IN ('normale', 'urgente')),
  statut text NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'resolu')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  auteur text NOT NULL CHECK (auteur IN ('proprietaire', 'admin')),
  contenu text NOT NULL,
  lu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_proprietaire_id_idx ON support_tickets(proprietaire_id);
CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON support_messages(ticket_id);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_owner ON support_tickets;
CREATE POLICY support_tickets_owner ON support_tickets
  FOR ALL
  USING (
    proprietaire_id IN (SELECT id FROM proprietaires WHERE user_id = auth.uid())
  )
  WITH CHECK (
    proprietaire_id IN (SELECT id FROM proprietaires WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS support_messages_owner ON support_messages;
CREATE POLICY support_messages_owner ON support_messages
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE proprietaire_id IN (SELECT id FROM proprietaires WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets
      WHERE proprietaire_id IN (SELECT id FROM proprietaires WHERE user_id = auth.uid())
    )
  );
