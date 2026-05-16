import { supabaseAdmin } from "@/lib/supabase/admin";
import { mapDbRowToPublicArticle, type BlogArticleRow, type PublicArticle } from "@/lib/blog/types";

export async function fetchPublishedBlogArticles(includeBetaOnly = false): Promise<PublicArticle[]> {
  let query = supabaseAdmin
    .from("blog_articles")
    .select("*")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (!includeBetaOnly) {
    query = query.eq("beta_only", false);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as BlogArticleRow[]).map(mapDbRowToPublicArticle);
}

export async function fetchBlogArticleBySlug(
  slug: string,
  includeBetaOnly = false,
): Promise<PublicArticle | null> {
  let query = supabaseAdmin.from("blog_articles").select("*").eq("slug", slug).eq("published", true);

  if (!includeBetaOnly) {
    query = query.eq("beta_only", false);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapDbRowToPublicArticle(data as BlogArticleRow);
}

export async function fetchAllBlogSlugsPublic(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_articles")
    .select("slug")
    .eq("published", true)
    .eq("beta_only", false);

  if (error || !data) return [];
  return data.map((row) => String((row as { slug: string }).slug));
}
