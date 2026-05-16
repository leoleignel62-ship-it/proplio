import type { Metadata } from "next";
import { BlogClient } from "./blog-client";
import { fetchPublishedBlogArticles } from "@/lib/blog/fetch-articles";

export const metadata: Metadata = {
  title: "Blog — Locavio",
  description:
    "Ressources et conseils pour les propriétaires bailleurs. Gestion locative, juridique, fiscalité et saisonnier.",
};

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const articles = await fetchPublishedBlogArticles();
  return <BlogClient articles={articles} />;
}
