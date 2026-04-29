import { NextResponse } from "next/server";
import {
  CANDIDATURE_MAX_FILE_BYTES,
  extensionForMime,
  isAllowedFileType,
  sanitizeFileName,
} from "@/lib/candidature";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BUCKET = "candidature-documents";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("token") ?? "").trim();
    const typeDocument = String(form.get("type_document") ?? "autre").trim();
    const file = form.get("fichier");

    if (!token || !(file instanceof File)) {
      return NextResponse.json({ error: "Token ou fichier manquant." }, { status: 400 });
    }
    if (file.size > CANDIDATURE_MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Le fichier dépasse 10MB." }, { status: 400 });
    }
    if (!isAllowedFileType(file.type)) {
      return NextResponse.json({ error: "Format non accepté. Utilisez PDF, JPG ou PNG." }, { status: 400 });
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("candidature_tokens")
      .select("id, dossier_id, expire_at, soumis_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) return NextResponse.json({ error: tokenError.message }, { status: 500 });
    if (!tokenRow) return NextResponse.json({ error: "Token invalide." }, { status: 404 });
    if (tokenRow.soumis_at) return NextResponse.json({ error: "Ce dossier est déjà soumis." }, { status: 409 });
    if (new Date(String(tokenRow.expire_at)).getTime() < Date.now()) {
      return NextResponse.json({ error: "Ce lien a expiré." }, { status: 410 });
    }

    const originalName = sanitizeFileName(file.name);
    const ext = extensionForMime(file.type);
    const path = `${tokenRow.dossier_id}/${tokenRow.id}/${typeDocument}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: doc, error: insertError } = await supabaseAdmin
      .from("candidature_documents")
      .insert({
        token_id: tokenRow.id,
        dossier_id: tokenRow.dossier_id,
        nom_fichier: originalName,
        type_document: typeDocument,
        storage_path: path,
        taille_fichier: file.size,
      })
      .select("id")
      .single();

    if (insertError || !doc) {
      return NextResponse.json({ error: insertError?.message ?? "Document non enregistré." }, { status: 500 });
    }

    return NextResponse.json({ success: true, document_id: doc.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
