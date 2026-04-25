import { LegalPageShell } from "@/components/legal-page-shell";

export default function CguPage() {
  return (
    <LegalPageShell title="Conditions Generales d'Utilisation">
      <p className="text-sm" style={{ color: "#a1a1aa" }}>
        Derniere mise a jour : avril 2026
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 1 - Objet
        </h2>
        <p>
          Les presentes Conditions Generales d&apos;Utilisation (CGU) regissent l&apos;acces et l&apos;utilisation de la
          plateforme [NOM APPLICATION] editee par [NOM SOCIETE]. En creant un compte, l&apos;utilisateur accepte sans
          reserve les presentes CGU.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 2 - Description du service
        </h2>
        <p>
          [NOM APPLICATION] est une plateforme SaaS de gestion locative permettant aux proprietaires bailleurs de gerer
          leurs logements, locataires, quittances, baux, etats des lieux et locations saisonnieres.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 3 - Acces au service
        </h2>
        <p>
          L&apos;acces au service necessite la creation d&apos;un compte avec une adresse email valide. L&apos;utilisateur
          est responsable de la confidentialite de ses identifiants. [NOM APPLICATION] propose plusieurs formules
          d&apos;abonnement (Decouverte, Starter, Pro, Expert) dont les caracteristiques sont detaillees sur la page
          Tarifs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 4 - Obligations de l&apos;utilisateur
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Fournir des informations exactes lors de son inscription</li>
          <li>Utiliser le service conformement a sa destination</li>
          <li>Ne pas tenter de porter atteinte au bon fonctionnement de la plateforme</li>
          <li>Respecter la vie privee des tiers dont il renseigne les donnees (locataires, voyageurs)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 5 - Donnees personnelles
        </h2>
        <p>
          Le traitement des donnees personnelles est detaille dans notre Politique de confidentialite disponible a
          l&apos;adresse /politique-de-confidentialite. Conformement au RGPD, l&apos;utilisateur dispose d&apos;un droit
          d&apos;acces, de rectification, de suppression et de portabilite de ses donnees.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 6 - Tarifs et paiement
        </h2>
        <p>
          Les abonnements payants sont factures via Stripe. Les prix sont indiques en euros TTC. Tout abonnement
          commence est du dans son integralite. L&apos;utilisateur peut resilier a tout moment depuis son espace
          abonnement, sans frais ni preavis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 7 - Resiliation
        </h2>
        <p>
          L&apos;utilisateur peut supprimer son compte a tout moment. [NOM SOCIETE] se reserve le droit de suspendre ou
          supprimer un compte en cas de non-respect des presentes CGU.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 8 - Limitation de responsabilite
        </h2>
        <p>
          [NOM APPLICATION] est un outil d&apos;aide a la gestion locative. [NOM SOCIETE] ne saurait etre tenu
          responsable des erreurs de saisie, des litiges entre proprietaires et locataires, ou de toute decision prise
          sur la base des informations generees par la plateforme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 9 - Modification des CGU
        </h2>
        <p>
          [NOM SOCIETE] se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs seront informes
          par email de toute modification substantielle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 10 - Droit applicable
        </h2>
        <p>
          Les presentes CGU sont soumises au droit francais. En cas de litige, les tribunaux francais seront seuls
          competents.
        </p>
      </section>
    </LegalPageShell>
  );
}
