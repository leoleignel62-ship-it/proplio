import { LegalPageShell } from "@/components/legal-page-shell";

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales">
      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Éditeur du site
        </h2>
        <p>
          <strong>Raison sociale :</strong> [NOM SOCIÉTÉ]
          <br />
          <strong>Forme juridique :</strong> [FORME JURIDIQUE]
          <br />
          <strong>SIRET :</strong> [SIRET]
          <br />
          <strong>Adresse :</strong> [ADRESSE SIÈGE]
          <br />
          <strong>Email :</strong> contact@[DOMAINE].fr
          <br />
          <strong>Directeur de la publication :</strong> [NOM RESPONSABLE]
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Hébergeur
        </h2>
        <p>
          Vercel Inc.
          <br />
          440 N Barranca Ave #4133
          <br />
          Covina, CA 91723, États-Unis
          <br />
          <a href="https://vercel.com" target="_blank" rel="noreferrer" className="underline">
            https://vercel.com
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Propriété intellectuelle
        </h2>
        <p>
          L&apos;ensemble du contenu de ce site (textes, images, logos, icônes) est la propriété exclusive de [NOM
          SOCIÉTÉ] et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
          Toute reproduction, même partielle, est strictement interdite sans autorisation préalable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Limitation de responsabilité
        </h2>
        <p>
          [NOM SOCIÉTÉ] s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur
          ce site. Cependant, [NOM SOCIÉTÉ] ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des
          informations mises à disposition. [NOM SOCIÉTÉ] décline toute responsabilité pour toute imprécision,
          inexactitude ou omission portant sur des informations disponibles sur ce site.
        </p>
      </section>
    </LegalPageShell>
  );
}
