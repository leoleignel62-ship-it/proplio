import { LegalPageShell } from "@/components/legal-page-shell";

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageShell title="Politique de confidentialité">
      <p className="text-sm" style={{ color: "#a1a1aa" }}>
        Dernière mise à jour : avril 2026.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          1. Responsable du traitement
        </h2>
        <p>
          [NOM SOCIÉTÉ] — [ADRESSE SIÈGE]
          <br />
          Email : contact@[DOMAINE].fr.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          2. Données collectées
        </h2>
        <p>Dans le cadre de l&apos;utilisation de [NOM APPLICATION], nous collectons les données suivantes :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Données de compte : email, nom, prénom, téléphone.</li>
          <li>Données de gestion locative : informations sur vos logements, locataires, baux, quittances.</li>
          <li>
            Données de paiement : traitées directement par Stripe, [NOM SOCIÉTÉ] ne stocke aucune donnée bancaire.
          </li>
          <li>Données de connexion : logs d&apos;accès, adresse IP.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          3. Finalités du traitement
        </h2>
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Fournir et améliorer le service [NOM APPLICATION].</li>
          <li>Gérer votre abonnement et la facturation.</li>
          <li>Vous envoyer les communications liées au service (quittances, baux, notifications).</li>
          <li>Assurer la sécurité de la plateforme.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          4. Base légale
        </h2>
        <p>Le traitement de vos données est fondé sur :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>L&apos;exécution du contrat (CGU acceptées).</li>
          <li>Le respect d&apos;obligations légales.</li>
          <li>Notre intérêt légitime à améliorer le service.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          5. Durée de conservation
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Données de compte : durée de l&apos;abonnement + 3 ans après résiliation.</li>
          <li>Données de facturation : 10 ans (obligation légale).</li>
          <li>Logs de connexion : 12 mois.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          6. Partage des données
        </h2>
        <p>Vos données peuvent être partagées avec :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase (hébergement base de données) — Union Européenne.</li>
          <li>Vercel (hébergement application) — États-Unis, couvert par les clauses contractuelles types.</li>
          <li>Stripe (paiement) — États-Unis, couvert par les clauses contractuelles types.</li>
          <li>Resend (envoi d&apos;emails) — États-Unis, couvert par les clauses contractuelles types.</li>
        </ul>
        <p>Aucune donnée n&apos;est vendue à des tiers.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          7. Vos droits (RGPD)
        </h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Droit d&apos;accès à vos données.</li>
          <li>Droit de rectification.</li>
          <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;).</li>
          <li>Droit à la portabilité.</li>
          <li>Droit d&apos;opposition au traitement.</li>
        </ul>
        <p>
          Pour exercer ces droits : contact@[DOMAINE].fr.
          <br />
          Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          8. Cookies
        </h2>
        <p>
          [NOM APPLICATION] utilise uniquement des cookies techniques nécessaires au fonctionnement du service (session,
          authentification). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          9. Sécurité
        </h2>
        <p>Vos données sont protégées par :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Chiffrement SSL/TLS en transit.</li>
          <li>Authentification sécurisée via Supabase Auth.</li>
          <li>Accès aux données restreint par Row Level Security.</li>
        </ul>
      </section>
    </LegalPageShell>
  );
}
