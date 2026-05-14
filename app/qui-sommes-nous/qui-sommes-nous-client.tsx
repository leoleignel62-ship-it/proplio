"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, MapPin, Zap } from "lucide-react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { MarketingCardIcon, publicWhiteCard } from "@/components/landing/marketing-card-icon";
import { RevealOnView } from "@/components/landing/reveal-on-view";

const values = [
  { Icon: MapPin, title: "Fait en France 🇫🇷" },
  { Icon: Zap, title: "Indépendant & bootstrappé" },
  { Icon: Home, title: "Pensé pour les propriétaires" },
] as const;

export function QuiSommesNousClient() {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <RevealOnView>
          <header className="mx-auto max-w-3xl pb-10 text-center">
            <Image
              src="/logos/logomark-couleur.svg"
              alt=""
              width={56}
              height={56}
              className="mx-auto h-14 w-14"
            />
            <h1 className="mt-6 text-3xl font-bold text-[#1a0533]">Notre histoire</h1>
            <p className="mt-3 text-center text-[#6b7280]">Locavio est né d&apos;une vraie conversation.</p>
          </header>
        </RevealOnView>

        <RevealOnView>
          <article className={`my-0 mb-0 mx-auto max-w-3xl p-6 sm:p-10 ${publicWhiteCard}`}>
            <h2 className="mb-8 text-4xl font-bold text-[#1a0533]">Qui sommes-nous ?</h2>

            <div className="space-y-6 text-lg leading-relaxed text-[#6b7280]">
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

              <blockquote className="border-l-4 border-[#7c3aed] pl-4 text-base font-medium italic text-[#7c3aed] sm:text-lg">
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

            <p className="mt-8 text-right text-base font-semibold text-[#1a0533]">— Léo</p>

            <div className="mt-10 text-center">
              <Link
                href="/register"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-violet-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Essayer Locavio gratuitement
              </Link>
            </div>
          </article>
        </RevealOnView>

        <RevealOnView className="mt-14">
          <div className="grid grid-cols-1 gap-6 pb-4 md:grid-cols-3">
            {values.map(({ Icon, title }) => (
              <div
                key={title}
                className="cursor-default rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:border-violet-100 hover:shadow-md"
              >
                <div className="flex justify-center">
                  <MarketingCardIcon Icon={Icon} />
                </div>
                <p className="mt-4 text-sm font-semibold text-[#1a0533]">{title}</p>
              </div>
            ))}
          </div>
        </RevealOnView>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
