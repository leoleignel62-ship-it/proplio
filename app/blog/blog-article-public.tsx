"use client";

import Link from "next/link";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PublicFinalCta } from "@/components/landing/public-final-cta";
import { PublicPageHeader } from "@/components/landing/public-page-header";
import { RevealOnView } from "@/components/landing/reveal-on-view";
import type { ArticleCategory, PublicArticle } from "@/lib/blog/types";

function categoryBadgeClass(cat: ArticleCategory): string {
  const map: Record<ArticleCategory, string> = {
    "Documents & modèles": "border-violet-500/40 bg-violet-500/15 text-violet-700",
    "Calculs & chiffres": "border-emerald-500/40 bg-emerald-500/15 text-emerald-600",
    Saisonnier: "border-sky-500/40 bg-sky-500/15 text-sky-700",
    "Guide pratique": "border-amber-500/40 bg-amber-500/15 text-amber-700",
    Comparatifs: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-700",
  };
  return map[cat];
}

export function BlogArticlePublic({ article, dateLabel }: { article: PublicArticle; dateLabel: string }) {
  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <article>
          <RevealOnView>
            <PublicPageHeader maxWidthClass="max-w-3xl">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${categoryBadgeClass(article.category)}`}
              >
                {article.category}
              </span>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#1a0533] sm:text-4xl">{article.title}</h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#4b5563]">{article.description}</p>
              <p className="mt-4 text-sm text-[#9ca3af]">
                {article.readTime} min de lecture · Publié le {dateLabel}
              </p>
            </PublicPageHeader>
          </RevealOnView>

          <RevealOnView className="mt-12">
            <div
              className="blog-content mx-auto max-w-3xl px-4 sm:px-0"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </RevealOnView>

          <RevealOnView className="mt-14">
            <PublicFinalCta title="Prêt à simplifier votre gestion locative ?">
              <Link
                href="/register"
                className="inline-flex cursor-pointer rounded-xl bg-white px-6 py-3 font-semibold text-[#7c3aed] transition hover:bg-gray-50"
              >
                Commencer gratuitement →
              </Link>
              <p className="text-sm text-white/90">Gratuit · Sans carte bancaire</p>
            </PublicFinalCta>
          </RevealOnView>
        </article>
      </main>
      <LandingFooter />
    </MarketingPublicShell>
  );
}
