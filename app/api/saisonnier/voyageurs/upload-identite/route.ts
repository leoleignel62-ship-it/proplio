import { NextResponse } from "next/server";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "voyageurs-identite";
const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return (name.trim() || "document").replace(/[^a-zA-Z0-9._\- ()]+/g, "_").slice(0, 180);
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: pErr } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprietaire as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
    }

    const ownerId = proprietaire.id as string;
    const form = await request.formData();
    const file = form.get("file");
    const voyageurId = String(form.get("voyageur_id") ?? "").trim();
    if (!(file instanceof File) || !voyageurId) {
      return NextResponse.json({ error: "Fichier ou voyageur_id manquant." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max. 10 Mo)." }, { status: 400 });
    }

    const { data: voy, error: vErr } = await supabase
      .from("voyageurs")
      .select("id")
      .eq("id", voyageurId)
      .eq("proprietaire_id", ownerId)
      .maybeSingle();
    if (vErr || !voy) {
      return NextResponse.json({ error: "Voyageur introuvable." }, { status: 404 });
    }

    const safe = sanitizeFileName(file.name);
    const path = `${ownerId}/${voyageurId}/${Date.now()}_${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { error: uErr } = await supabase
      .from("voyageurs")
      .update({ document_identite_path: path })
      .eq("id", voyageurId)
      .eq("proprietaire_id", ownerId);
    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
