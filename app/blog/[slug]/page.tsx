import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articles, getArticleBySlug, type ArticleCategory } from "@/lib/blog/articles";
import { BlogArticlePublic } from "../blog-article-public";

const siteUrl = "https://locavio.fr";

function formatPublished(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

  return <BlogArticlePublic article={article} dateLabel={dateLabel} />;
}
