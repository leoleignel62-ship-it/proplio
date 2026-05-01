"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
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
    "Documents & modèles": "border-violet-500/40 bg-violet-500/15 text-violet-300",
    "Calculs & chiffres": "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    Saisonnier: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    "Guide pratique": "border-amber-500/40 bg-amber-500/15 text-amber-300",
    Comparatifs: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
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
        <header className="marketing-fade-section space-y-6 pb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Ressources pour les propriétaires</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
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
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isOn
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-white/10 bg-white/5 text-white/70 backdrop-blur-sm hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </header>

        <div className="marketing-fade-section my-12 mb-0 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((article: Article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-violet-500/30 hover:bg-white/[0.08]"
            >
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryBadgeClass(article.category)}`}
              >
                {article.category}
              </span>
              <h2 className="mt-3 text-lg font-bold text-white group-hover:text-violet-200">{article.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-white/60">{article.description}</p>
              <p className="mt-4 text-xs text-white/40">
                {article.readTime} min · {formatPublished(article.publishedAt)}
              </p>
            </Link>
          ))}
        </div>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
