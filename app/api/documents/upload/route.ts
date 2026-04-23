import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  DOCUMENT_LOGEMENT_BUCKET,
  isDocumentLogementCategory,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "@/lib/documents-logement";
import { normalizePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || "document";
  return trimmed.replace(/[^a-zA-Z0-9._\- ()]+/g, "_").slice(0, 180);
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

    const { data: proprietaire, error: proprietaireError } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const proprietaireId = proprietaire.id as string;
    const plan = normalizePlan((proprietaire as { plan?: string | null }).plan);
    if (plan === "free") {
      return NextResponse.json({ error: "Fonction réservée aux plans Starter et plus." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const logementId = String(form.get("logement_id") ?? "").trim();
    const categorie = String(form.get("categorie") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (!logementId || !isDocumentLogementCategory(categorie)) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max. 10 Mo)." }, { status: 400 });
    }

    const { data: logement, error: logementError } = await supabase
      .from("logements")
      .select("id")
      .eq("id", logementId)
      .eq("proprietaire_id", proprietaireId)
      .maybeSingle();

    if (logementError || !logement) {
      return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
    }

    const safeName = sanitizeFileName(file.name);
    const storageFileName = `${Date.now()}_${safeName}`;
    const storagePath = `${proprietaireId}/${logementId}/${categorie}/${storageFileName}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(DOCUMENT_LOGEMENT_BUCKET)
      .upload(storagePath, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: row, error: insErr } = await supabase
      .from("documents_logement")
      .insert({
        proprietaire_id: proprietaireId,
        logement_id: logementId,
        nom: file.name,
        categorie,
        taille_bytes: file.size,
        type_mime: file.type || null,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (insErr || !row) {
      await supabaseAdmin.storage.from(DOCUMENT_LOGEMENT_BUCKET).remove([storagePath]);
      return NextResponse.json({ error: insErr?.message ?? "Erreur enregistrement." }, { status: 500 });
    }

    return NextResponse.json({ document: row });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
