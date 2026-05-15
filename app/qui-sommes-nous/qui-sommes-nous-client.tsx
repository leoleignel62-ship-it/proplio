"use client";

import Link from "next/link";
import { Home, MapPin, Zap } from "lucide-react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PublicFinalCta } from "@/components/landing/public-final-cta";
import { PublicPageHeader } from "@/components/landing/public-page-header";
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
          <PublicPageHeader maxWidthClass="max-w-3xl">
            <h1 className="text-3xl font-bold text-[#1a0533]">Notre histoire</h1>
            <p className="mt-3 text-center text-[#4b5563]">Locavio est né d&apos;une conversation toute simple.</p>
          </PublicPageHeader>
        </RevealOnView>

        <RevealOnView>
          <article className={`my-0 mb-0 mx-auto max-w-3xl p-6 sm:p-10 ${publicWhiteCard}`}>
            <h2 className="mb-8 text-4xl font-bold text-[#1a0533]">Notre histoire</h2>

            <div className="space-y-6 text-lg leading-relaxed text-[#6b7280]">
              <p>
                Avant Locavio, j&apos;avais une conviction : je voulais créer mon entreprise. Pas à n&apos;importe quel
                prix, pas sur n&apos;importe quel sujet — mais construire quelque chose d&apos;utile, de concret, qui
                rende vraiment service.
              </p>

              <p>
                Avec Tony, un très bon ami, on passait beaucoup de temps à en parler. On s&apos;intéressait à
                l&apos;intelligence artificielle, à l&apos;automatisation, aux solutions qui pourraient simplifier la
                vie des gens et des entreprises dans des secteurs du quotidien. On cherchait le bon problème à résoudre.
              </p>

              <p>
                La réponse est venue d&apos;Enzo — un ami, et le frère de Tony. Propriétaire de plusieurs logements, il
                gère ses locations à côté de sa vie — entre les tableurs, les relances, les documents à produire à
                chaque nouveau locataire.
              </p>

              <p>
                Un jour, lors d&apos;une entrevue banale, il me confie sa frustration. Des outils existent, certes — mais
                ils sont peu connus, souvent complexes, et finalement on y perd autant de temps qu&apos;à tout faire
                soi-même. Pas d&apos;automatisation réelle. Pas de fluidité. Juste une nouvelle interface pour les mêmes
                tâches fastidieuses.
              </p>

              <blockquote className="border-l-4 border-[#7c3aed] pl-4 text-base font-medium italic text-[#7c3aed] sm:text-lg">
                &quot;Ce serait vraiment trop bien d&apos;avoir un truc qui automatise tout ça.&quot;
              </blockquote>

              <p>Cette phrase a tout déclenché.</p>

              <p>
                Plutôt que de me lancer tête baissée, j&apos;ai voulu comprendre. J&apos;ai rencontré d&apos;autres
                propriétaires — des amis, des connaissances, des mises en relation — et je leur ai posé une seule question
                : c&apos;est quoi, votre quotidien de bailleur ?
              </p>

              <p>
                Les réponses se ressemblaient toutes. Des quittances générées à la main. Des baux téléchargés sur des
                forums. Des états des lieux faits sur papier, mal conservés. Des loyers suivis dans des fichiers Excel
                bricolés. Pas par négligence — par manque d&apos;un outil vraiment accessible et pensé pour eux.
              </p>

              <p>
                Je m&apos;appelle Léo. Je ne suis pas développeur de formation — mais j&apos;ai appris, construit,
                itéré, jusqu&apos;à ce que Locavio existe vraiment. Pas de fonds levés. Pas d&apos;équipe de 40
                personnes. Juste moi, la conviction qu&apos;on pouvait faire mieux, et l&apos;obsession de livrer
                quelque chose qui fonctionne vraiment pour de vrais propriétaires.
              </p>

              <p>On n&apos;en est qu&apos;au début. Et j&apos;ai hâte de la suite.</p>
            </div>

            <p className="mt-8 text-right text-base font-semibold text-[#1a0533]">— Léo</p>
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

        <RevealOnView>
          <PublicFinalCta title="Prêt à simplifier votre gestion locative ?">
            <Link
              href="/register"
              className="inline-flex cursor-pointer rounded-xl bg-white px-8 py-3 text-sm font-semibold text-[#7c3aed] transition hover:bg-gray-50"
            >
              Essayer Locavio gratuitement
            </Link>
            <p className="text-sm text-white/90">Gratuit pour commencer · Sans carte bancaire</p>
          </PublicFinalCta>
        </RevealOnView>
      </main>
      <LandingFooter />
    </MarketingPublicShell>
  );
}
