import { NextResponse } from "next/server";
import { articles } from "@/lib/blog/articles";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Migration one-shot : insère les 5 articles statiques dans blog_articles. */
export async function POST() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const rows = articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      description: a.description,
      category: a.category,
      read_time: a.readTime,
      content: a.content,
      published_at: a.publishedAt,
      published: true,
      beta_only: false,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseAdmin
      .from("blog_articles")
      .upsert(rows, { onConflict: "slug" })
      .select("slug");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      migrated: data?.length ?? rows.length,
      slugs: (data ?? []).map((r) => r.slug),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
