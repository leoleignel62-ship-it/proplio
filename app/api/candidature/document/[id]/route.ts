import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "candidature-documents";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });

    const { data: doc, error } = await supabaseAdmin
      .from("candidature_documents")
      .select("id, nom_fichier, storage_path, dossier_id, candidature_dossiers(proprietaire_id)")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });

    const dossier = (Array.isArray(doc.candidature_dossiers)
      ? doc.candidature_dossiers[0]
      : doc.candidature_dossiers) as { proprietaire_id?: string } | null;
    if (!dossier || dossier.proprietaire_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(BUCKET).download(doc.storage_path);
    if (downloadError || !blob) {
      return NextResponse.json({ error: downloadError?.message ?? "Téléchargement impossible." }, { status: 500 });
    }

    return new NextResponse(Buffer.from(await blob.arrayBuffer()), {
      status: 200,
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.nom_fichier ?? "document")}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
