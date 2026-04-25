import { LegalPageShell } from "@/components/legal-page-shell";

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales">
      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Editeur du site
        </h2>
        <p>
          <strong>Raison sociale :</strong> [NOM SOCIETE]
          <br />
          <strong>Forme juridique :</strong> [FORME JURIDIQUE]
          <br />
          <strong>SIRET :</strong> [SIRET]
          <br />
          <strong>Adresse :</strong> [ADRESSE SIEGE]
          <br />
          <strong>Email :</strong> contact@[DOMAINE].fr
          <br />
          <strong>Directeur de la publication :</strong> [NOM RESPONSABLE]
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Hebergeur
        </h2>
        <p>
          Vercel Inc.
          <br />
          440 N Barranca Ave #4133
          <br />
          Covina, CA 91723, Etats-Unis
          <br />
          <a href="https://vercel.com" target="_blank" rel="noreferrer" className="underline">
            https://vercel.com
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Propriete intellectuelle
        </h2>
        <p>
          L&apos;ensemble du contenu de ce site (textes, images, logos, icones) est la propriete exclusive de [NOM
          SOCIETE] et est protege par les lois francaises et internationales relatives a la propriete intellectuelle.
          Toute reproduction, meme partielle, est strictement interdite sans autorisation prealable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Limitation de responsabilite
        </h2>
        <p>
          [NOM SOCIETE] s&apos;efforce d&apos;assurer l&apos;exactitude et la mise a jour des informations diffusees sur
          ce site. Cependant, [NOM SOCIETE] ne peut garantir l&apos;exactitude, la precision ou l&apos;exhaustivite des
          informations mises a disposition. [NOM SOCIETE] decline toute responsabilite pour toute imprecision,
          inexactitude ou omission portant sur des informations disponibles sur ce site.
        </p>
      </section>
    </LegalPageShell>
  );
}
