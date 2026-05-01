"use client";

import Link from "next/link";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";

export function QuiSommesNousClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <article className="marketing-fade-section my-12 mb-0 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 px-8 py-8 backdrop-blur-sm sm:px-10">
          <h1 className="mb-8 text-4xl font-bold text-white">Qui sommes-nous ?</h1>

          <div className="space-y-6 text-lg leading-relaxed text-white/70">
            <p>Tout a commencé par une conversation.</p>

            <p>
              Avec Tony, un ami de promo, je passais mes journées à explorer des idées autour de la tech et de
              l&apos;entrepreneuriat. On voulait créer quelque chose, on cherchait le bon problème à résoudre.
            </p>

            <p>C&apos;est Enzo, le frère de Tony, qui m&apos;a mis sur la piste.</p>

            <p>
              Propriétaire de son premier bien immobilier, il gérait ses logements comme il pouvait - et il m&apos;a dit
              presque en passant :
            </p>

            <blockquote className="border-l-4 border-violet-500 pl-4 text-violet-300 italic">
              &quot;Ce serait vraiment trop bien d&apos;avoir un truc qui automatise tout ça.&quot;
            </blockquote>

            <p>Cette phrase toute simple a tout changé.</p>

            <p>
              J&apos;ai commencé à creuser, à comprendre les vraies galères d&apos;un propriétaire bailleur. Des heures
              perdues chaque mois sur des quittances à imprimer, des baux à rédiger depuis zéro, des états des lieux
              bâclés faute d&apos;outil adapté. Du temps précieux qui aurait pu être investi ailleurs, à faire grandir
              son patrimoine.
            </p>

            <p>
              J&apos;ai décidé d&apos;y répondre sérieusement. Fraîchement sorti des études, j&apos;ai lancé Locavio avec
              une idée simple : construire la solution complète que tout propriétaire aurait voulu avoir dès le premier
              jour.
            </p>

            <p>
              D&apos;une phrase entendue par hasard, d&apos;un problème bien réel, et de l&apos;envie sincère de changer
              les choses.
            </p>

            <p>On n&apos;en est qu&apos;au début. Et j&apos;ai hâte de la suite.</p>
          </div>

          <p className="mt-8 text-right text-base font-semibold text-white">— Léo</p>

          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Essayer Locavio gratuitement
            </Link>
          </div>
        </article>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
