import { LegalPageShell } from "@/components/legal-page-shell";

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPageShell title="Politique de confidentialite">
      <p className="text-sm" style={{ color: "#a1a1aa" }}>
        Derniere mise a jour : avril 2026
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          1. Responsable du traitement
        </h2>
        <p>
          [NOM SOCIETE] - [ADRESSE SIEGE]
          <br />
          Email : contact@[DOMAINE].fr
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          2. Donnees collectees
        </h2>
        <p>Dans le cadre de l&apos;utilisation de [NOM APPLICATION], nous collectons les donnees suivantes :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Donnees de compte : email, nom, prenom, telephone</li>
          <li>Donnees de gestion locative : informations sur vos logements, locataires, baux, quittances</li>
          <li>
            Donnees de paiement : traitees directement par Stripe, [NOM SOCIETE] ne stocke aucune donnee bancaire
          </li>
          <li>Donnees de connexion : logs d&apos;acces, adresse IP</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          3. Finalites du traitement
        </h2>
        <p>Vos donnees sont utilisees pour :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Fournir et ameliorer le service [NOM APPLICATION]</li>
          <li>Gerer votre abonnement et la facturation</li>
          <li>Vous envoyer les communications liees au service (quittances, baux, notifications)</li>
          <li>Assurer la securite de la plateforme</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          4. Base legale
        </h2>
        <p>Le traitement de vos donnees est fonde sur :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>L&apos;execution du contrat (CGU acceptees)</li>
          <li>Le respect d&apos;obligations legales</li>
          <li>Notre interet legitime a ameliorer le service</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          5. Duree de conservation
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Donnees de compte : duree de l&apos;abonnement + 3 ans apres resiliation</li>
          <li>Donnees de facturation : 10 ans (obligation legale)</li>
          <li>Logs de connexion : 12 mois</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          6. Partage des donnees
        </h2>
        <p>Vos donnees peuvent etre partagees avec :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase (hebergement base de donnees) - Union Europeenne</li>
          <li>Vercel (hebergement application) - Etats-Unis, couvert par les clauses contractuelles types</li>
          <li>Stripe (paiement) - Etats-Unis, couvert par les clauses contractuelles types</li>
          <li>Resend (envoi d&apos;emails) - Etats-Unis, couvert par les clauses contractuelles types</li>
        </ul>
        <p>Aucune donnee n&apos;est vendue a des tiers.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          7. Vos droits (RGPD)
        </h2>
        <p>Conformement au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Droit d&apos;acces a vos donnees</li>
          <li>Droit de rectification</li>
          <li>Droit a l&apos;effacement (&quot;droit a l&apos;oubli&quot;)</li>
          <li>Droit a la portabilite</li>
          <li>Droit d&apos;opposition au traitement</li>
        </ul>
        <p>
          Pour exercer ces droits : contact@[DOMAINE].fr
          <br />
          Vous pouvez egalement introduire une reclamation aupres de la CNIL (www.cnil.fr).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          8. Cookies
        </h2>
        <p>
          [NOM APPLICATION] utilise uniquement des cookies techniques necessaires au fonctionnement du service (session,
          authentification). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilise.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          9. Securite
        </h2>
        <p>Vos donnees sont protegees par :</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Chiffrement SSL/TLS en transit</li>
          <li>Authentification securisee via Supabase Auth</li>
          <li>Acces aux donnees restreint par Row Level Security</li>
        </ul>
      </section>
    </LegalPageShell>
  );
}
