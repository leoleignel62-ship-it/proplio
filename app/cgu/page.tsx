import { LegalPageShell } from "@/components/legal-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Proplio",
  description: "Conditions générales d'utilisation de Proplio.",
};

export default function CguPage() {
  return (
    <LegalPageShell title="Conditions Générales d'Utilisation">
      <p className="text-sm" style={{ color: "#a1a1aa" }}>
        Dernière mise à jour : avril 2026.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 1 — Objet
        </h2>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation de la
          plateforme [NOM APPLICATION] éditée par [NOM SOCIÉTÉ]. En créant un compte, l&apos;utilisateur accepte sans
          réserve les présentes CGU.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 2 — Description du service
        </h2>
        <p>
          [NOM APPLICATION] est une plateforme SaaS de gestion locative permettant aux propriétaires bailleurs de gérer
          leurs logements, locataires, quittances, baux, états des lieux et locations saisonnières.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 3 — Accès au service
        </h2>
        <p>
          L&apos;accès au service nécessite la création d&apos;un compte avec une adresse email valide. L&apos;utilisateur
          est responsable de la confidentialité de ses identifiants. [NOM APPLICATION] propose plusieurs formules
          d&apos;abonnement (Découverte, Starter, Pro, Expert) dont les caractéristiques sont détaillées sur la page
          Tarifs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 4 — Obligations de l&apos;utilisateur
        </h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Fournir des informations exactes lors de son inscription.</li>
          <li>Utiliser le service conformément à sa destination.</li>
          <li>Ne pas tenter de porter atteinte au bon fonctionnement de la plateforme.</li>
          <li>Respecter la vie privée des tiers dont il renseigne les données (locataires, voyageurs).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 5 — Données personnelles
        </h2>
        <p>
          Le traitement des données personnelles est détaillé dans notre Politique de confidentialité disponible à
          l&apos;adresse /politique-de-confidentialite. Conformément au RGPD, l&apos;utilisateur dispose d&apos;un droit
          d&apos;accès, de rectification, de suppression et de portabilité de ses données.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 6 — Tarifs et paiement
        </h2>
        <p>
          Les abonnements payants sont facturés via Stripe. Les prix sont indiqués en euros TTC. Tout abonnement
          commencé est dû dans son intégralité. L&apos;utilisateur peut résilier à tout moment depuis son espace
          abonnement, sans frais ni préavis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 7 — Résiliation
        </h2>
        <p>
          L&apos;utilisateur peut supprimer son compte à tout moment. [NOM SOCIÉTÉ] se réserve le droit de suspendre ou
          supprimer un compte en cas de non-respect des présentes CGU.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 8 — Limitation de responsabilité
        </h2>
        <p>
          [NOM APPLICATION] est un outil d&apos;aide à la gestion locative. [NOM SOCIÉTÉ] ne saurait être tenu
          responsable des erreurs de saisie, des litiges entre propriétaires et locataires, ou de toute décision prise
          sur la base des informations générées par la plateforme.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 9 — Modification des CGU
        </h2>
        <p>
          [NOM SOCIÉTÉ] se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés
          par email de toute modification substantielle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Article 10 — Droit applicable
        </h2>
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls
          compétents.
        </p>
      </section>
    </LegalPageShell>
  );
}
