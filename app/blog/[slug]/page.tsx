import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticlePublic } from "../blog-article-public";
import { fetchAllBlogSlugsPublic, fetchBlogArticleBySlug } from "@/lib/blog/fetch-articles";

const siteUrl = "https://locavio.fr";

function formatPublished(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await fetchAllBlogSlugsPublic();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchBlogArticleBySlug(slug);
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
  const article = await fetchBlogArticleBySlug(slug);
  if (!article) notFound();

  const dateLabel = formatPublished(article.publishedAt);

  return <BlogArticlePublic article={article} dateLabel={dateLabel} />;
}
