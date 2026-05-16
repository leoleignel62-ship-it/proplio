import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("cle, description, actif, beta_only")
      .order("cle", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flags: data ?? [] });
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

    const body = (await request.json()) as { cle?: string; description?: string; beta_only?: boolean };
    const cle = String(body.cle ?? "").trim();
    if (!cle) {
      return NextResponse.json({ error: "cle requise." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .insert({
        cle,
        description: String(body.description ?? "").trim() || null,
        actif: false,
        beta_only: Boolean(body.beta_only),
        updated_at: new Date().toISOString(),
      })
      .select("cle, description, actif, beta_only")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flag: data });
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

    const body = (await request.json()) as {
      cle?: string;
      actif?: boolean;
      beta_only?: boolean;
      description?: string;
    };
    const cle = String(body.cle ?? "").trim();
    if (!cle) {
      return NextResponse.json({ error: "cle requise." }, { status: 400 });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.actif !== undefined) patch.actif = Boolean(body.actif);
    if (body.beta_only !== undefined) patch.beta_only = Boolean(body.beta_only);
    if (body.description !== undefined) patch.description = String(body.description).trim() || null;

    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .update(patch)
      .eq("cle", cle)
      .select("cle, description, actif, beta_only")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flag: data });
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
    const cle = searchParams.get("cle")?.trim();
    if (!cle) {
      return NextResponse.json({ error: "cle requise." }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("feature_flags").delete().eq("cle", cle);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
