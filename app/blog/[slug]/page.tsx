import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";
import { articles, getArticleBySlug, type ArticleCategory } from "@/lib/blog/articles";

const siteUrl = "https://locavio.fr";

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

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) {
    return { title: "Article introuvable — Locavio" };
  }
  const url = `${siteUrl}/blog/${article.slug}`;
  return {
    title: `${article.title} — Blog Locavio`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      url,
      siteName: "Locavio",
      type: "article",
      publishedTime: `${article.publishedAt}T12:00:00.000Z`,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const dateLabel = formatPublished(article.publishedAt);

  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <article className="marketing-fade-section">
          <header className="mx-auto max-w-3xl text-center">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${categoryBadgeClass(article.category)}`}
            >
              {article.category}
            </span>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">{article.title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">{article.description}</p>
            <p className="mt-4 text-sm text-white/40">
              {article.readTime} min de lecture · Publié le {dateLabel}
            </p>
          </header>

          <div
            className="blog-content mx-auto mt-12 max-w-3xl px-4 sm:px-0"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-white/10 bg-white/5 px-8 py-8 text-center backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white">Prêt à simplifier votre gestion locative ?</h2>
            <Link
              href="/register"
              className="mt-6 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
            >
              Commencer gratuitement →
            </Link>
            <p className="mt-4 text-sm text-white/55">Gratuit · Sans carte bancaire</p>
          </div>
        </article>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
