import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ARTICLE_CATEGORIES, slugifyTitle } from "@/lib/blog/types";

export const dynamic = "force-dynamic";

type BlogPayload = {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  read_time?: number;
  content?: string;
  published_at?: string;
  published?: boolean;
  beta_only?: boolean;
};

export async function GET() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from("blog_articles")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const body = (await request.json()) as BlogPayload;
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    }

    const slug = String(body.slug ?? "").trim() || slugifyTitle(title);
    const category = String(body.category ?? "");
    if (!ARTICLE_CATEGORIES.includes(category as (typeof ARTICLE_CATEGORIES)[number])) {
      return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    }

    const row = {
      slug,
      title,
      description: String(body.description ?? "").trim(),
      category,
      read_time: Math.max(1, Number(body.read_time ?? 5)),
      content: String(body.content ?? ""),
      published_at: String(body.published_at ?? new Date().toISOString().slice(0, 10)),
      published: Boolean(body.published),
      beta_only: Boolean(body.beta_only),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("blog_articles").insert(row).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ article: data });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const body = (await request.json()) as BlogPayload;
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.slug !== undefined) patch.slug = String(body.slug).trim();
    if (body.description !== undefined) patch.description = String(body.description).trim();
    if (body.category !== undefined) {
      const category = String(body.category);
      if (!ARTICLE_CATEGORIES.includes(category as (typeof ARTICLE_CATEGORIES)[number])) {
        return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
      }
      patch.category = category;
    }
    if (body.read_time !== undefined) patch.read_time = Math.max(1, Number(body.read_time));
    if (body.content !== undefined) patch.content = String(body.content);
    if (body.published_at !== undefined) patch.published_at = String(body.published_at);
    if (body.published !== undefined) patch.published = Boolean(body.published);
    if (body.beta_only !== undefined) patch.beta_only = Boolean(body.beta_only);

    const { data, error } = await supabaseAdmin
      .from("blog_articles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ article: data });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id requis." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("blog_articles").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
