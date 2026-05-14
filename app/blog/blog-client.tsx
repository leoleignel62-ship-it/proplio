"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { PublicFinalCta } from "@/components/landing/public-final-cta";
import { PublicPageHeader } from "@/components/landing/public-page-header";
import { RevealOnView } from "@/components/landing/reveal-on-view";
import { articles, type Article, type ArticleCategory } from "@/lib/blog/articles";

const categories = [
  "Tous",
  "Documents & modèles",
  "Calculs & chiffres",
  "Saisonnier",
  "Guide pratique",
  "Comparatifs",
] as const;

type Cat = (typeof categories)[number];

function formatPublished(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

export function BlogClient() {
  const [active, setActive] = useState<Cat>("Tous");

  const filtered = useMemo(() => {
    if (active === "Tous") return articles;
    return articles.filter((a) => a.category === active);
  }, [active]);

  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <RevealOnView>
          <PublicPageHeader>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1a0533] sm:text-5xl">Ressources pour les propriétaires</h1>
            <p className="mx-auto max-w-2xl text-lg text-[#6b7280]">
              Conseils pratiques, guides juridiques et actualités pour gérer vos locations en toute sérénité.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.map((cat) => {
                const isOn = active === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActive(cat)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                      isOn
                        ? "border-violet-500 bg-violet-600 text-white"
                        : "border-gray-200 bg-white text-[#6b7280] hover:border-violet-100 hover:shadow-md"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </PublicPageHeader>
        </RevealOnView>

        <RevealOnView className="my-12 mb-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {filtered.map((article: Article) => (
              <Link
                key={article.slug}
                href={`/blog/${article.slug}`}
                className={`group block rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-violet-100 hover:shadow-md cursor-pointer hover:bg-gray-50`}
              >
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryBadgeClass(article.category)}`}
                >
                  {article.category}
                </span>
                <h2 className="mt-3 text-lg font-bold text-[#1a0533] group-hover:text-violet-700">{article.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-[#6b7280]">{article.description}</p>
                <p className="mt-4 text-xs text-[#9ca3af]">
                  {article.readTime} min · {formatPublished(article.publishedAt)}
                </p>
              </Link>
            ))}
          </div>
        </RevealOnView>

        <RevealOnView>
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

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
