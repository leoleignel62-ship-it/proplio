import { LegalPageShell } from "@/components/legal-page-shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Locavio",
  description: "Mentions légales de Locavio.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPageShell title="Mentions légales">
      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Éditeur du site
        </h2>
        <p>
          <strong>Raison sociale :</strong> Axio Tech
          <br />
          <strong>Forme juridique :</strong> Micro-entreprise
          <br />
          <strong>SIREN :</strong> 920276961
          <br />
          <strong>SIRET :</strong> 92027696100025
          <br />
          <strong>Directeur de la publication :</strong> Léo Leignel
          <br />
          <strong>Email :</strong> contact@locavio.fr
          <br />
          <strong>Site web :</strong>{" "}
          <a href="https://locavio.fr" target="_blank" rel="noreferrer" className="underline">
            https://locavio.fr
          </a>
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
          L&apos;ensemble du contenu de ce site (textes, images, logos, icônes) est la propriété exclusive de Axio Tech
          et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle. Toute
          reproduction, même partielle, est strictement interdite sans autorisation préalable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold" style={{ color: "#7c3aed" }}>
          Limitation de responsabilité
        </h2>
        <p>
          Axio Tech s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur ce
          site. Cependant, Axio Tech ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des
          informations mises à disposition. Axio Tech décline toute responsabilité pour toute imprécision, inexactitude
          ou omission portant sur des informations disponibles sur ce site.
        </p>
      </section>
    </LegalPageShell>
  );
}
