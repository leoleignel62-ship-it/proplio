export type ArticleCategory =
  | "Documents & modèles"
  | "Calculs & chiffres"
  | "Saisonnier"
  | "Guide pratique"
  | "Comparatifs";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "Documents & modèles",
  "Calculs & chiffres",
  "Saisonnier",
  "Guide pratique",
  "Comparatifs",
];

export type PublicArticle = {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  readTime: number;
  publishedAt: string;
  content: string;
};

export type BlogArticleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  read_time: number;
  content: string;
  published_at: string;
  published: boolean;
  beta_only: boolean;
  created_at?: string;
  updated_at?: string;
};

export function mapDbRowToPublicArticle(row: BlogArticleRow): PublicArticle {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category as ArticleCategory,
    readTime: row.read_time,
    publishedAt: row.published_at,
    content: row.content,
  };
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
