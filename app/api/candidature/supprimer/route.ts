import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "candidature-documents";

type DeleteBody = { dossier_id?: string };

async function collectStoragePaths(prefix: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(path: string) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).list(path, { limit: 100 });
    if (error || !data) return;

    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      // Folder nodes in Supabase listing generally have id null.
      if ((item as { id?: string | null }).id == null) {
        await walk(itemPath);
      } else {
        results.push(itemPath);
      }
    }
  }

  await walk(prefix);
  return results;
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as DeleteBody | null;
    const dossierId = String(body?.dossier_id ?? "").trim();
    if (!dossierId) return NextResponse.json({ error: "dossier_id manquant." }, { status: 400 });

    const { data: dossier, error: dossierError } = await supabaseAdmin
      .from("candidature_dossiers")
      .select("id, proprietaire_id")
      .eq("id", dossierId)
      .maybeSingle();
    if (dossierError) return NextResponse.json({ error: dossierError.message }, { status: 500 });
    if (!dossier) return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 });
    if (dossier.proprietaire_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const storagePaths = await collectStoragePaths(dossierId);
    if (storagePaths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from(BUCKET).remove(storagePaths);
      if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 });
    }

    const { error: deleteError } = await supabaseAdmin.from("candidature_dossiers").delete().eq("id", dossierId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
