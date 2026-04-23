import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCUMENT_LOGEMENT_BUCKET } from "@/lib/documents-logement";
import { normalizePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SEC = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const plan = normalizePlan((proprietaire as { plan?: string | null }).plan);
    if (plan === "free") {
      return NextResponse.json({ error: "Fonction réservée aux plans Starter et plus." }, { status: 403 });
    }

    const { data: doc, error: docError } = await supabase
      .from("documents_logement")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    const storagePath = String((doc as { storage_path?: string }).storage_path ?? "");
    if (!storagePath) {
      return NextResponse.json({ error: "Chemin de stockage invalide." }, { status: 500 });
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(DOCUMENT_LOGEMENT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

    if (signError || !signed?.signedUrl) {
      return NextResponse.json({ error: signError?.message ?? "Impossible de générer le lien." }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const plan = normalizePlan((proprietaire as { plan?: string | null }).plan);
    if (plan === "free") {
      return NextResponse.json({ error: "Fonction réservée aux plans Starter et plus." }, { status: 403 });
    }

    const { data: doc, error: docError } = await supabase
      .from("documents_logement")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    const storagePath = String((doc as { storage_path?: string }).storage_path ?? "");

    if (storagePath) {
      const { error: rmErr } = await supabaseAdmin.storage.from(DOCUMENT_LOGEMENT_BUCKET).remove([storagePath]);
      if (rmErr) {
        return NextResponse.json({ error: rmErr.message }, { status: 500 });
      }
    }

    const { error: delErr } = await supabase.from("documents_logement").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
