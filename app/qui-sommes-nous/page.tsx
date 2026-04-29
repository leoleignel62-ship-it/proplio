import Link from "next/link";
import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";
import { getSiteUrl } from "@/lib/utils/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Qui sommes-nous ? — Locavio, logiciel de gestion locative",
  description:
    "Découvrez l'histoire de Locavio, créé par Tony et Léo pour simplifier la gestion locative des propriétaires français.",
  openGraph: {
    title: "Qui sommes-nous ? — Locavio, logiciel de gestion locative",
    description: "Découvrez l'histoire de Locavio.",
    url: `${siteUrl}/qui-sommes-nous`,
    siteName: "Locavio",
    locale: "fr_FR",
    type: "website",
  },
};

export default function QuiSommesNousPage() {
  return (
    <LegalPageShell title="Qui sommes-nous ?">
      <div className="space-y-6 text-base leading-relaxed">
        <p>Tout a commencé par une conversation.</p>

        <p>
          Avec Tony, un ami de promo, je passais mes journées à explorer des idées autour de la tech et de
          l&apos;entrepreneuriat. On voulait créer quelque chose, on cherchait le bon problème à résoudre.
        </p>

        <p>C&apos;est Enzo, le frère de Tony, qui m&apos;a mis sur la piste.</p>

        <p>
          Propriétaire de son premier bien immobilier, il gérait ses logements comme il pouvait - et il m&apos;a dit
          presque en passant :{" "}
          <em>&quot;Ce serait vraiment trop bien d&apos;avoir un truc qui automatise tout ça.&quot;</em>
        </p>

        <p>Cette phrase toute simple a tout changé.</p>

        <p>
          J&apos;ai commencé à creuser, à comprendre les vraies galères d&apos;un propriétaire bailleur. Des heures perdues
          chaque mois sur des quittances à imprimer, des baux à rédiger depuis zéro, des états des lieux bâclés faute
          d&apos;outil adapté. Du temps précieux qui aurait pu être investi ailleurs, à faire grandir son patrimoine.
        </p>

        <p>
          J&apos;ai décidé d&apos;y répondre sérieusement. Fraîchement sorti des études, j&apos;ai lancé Locavio avec
          une idée simple : construire la solution complète que tout propriétaire aurait voulu avoir dès le premier
          jour.
        </p>

        <p>
          D&apos;une phrase entendue par hasard, d&apos;un problème bien réel, et de l&apos;envie sincère de changer les
          choses.
        </p>

        <p>On n&apos;en est qu&apos;au début. Et j&apos;ai hâte de la suite.</p>

        <p className="mt-10 text-center italic">— Léo</p>

        <div className="pt-6 text-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-semibold"
            style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
          >
            Essayer Locavio gratuitement
          </Link>
        </div>
      </div>
    </LegalPageShell>
  );
}
