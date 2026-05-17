import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const tokenValue = String(token ?? "").trim();

    if (!tokenValue) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: row, error: fetchError } = await supabaseAdmin
      .from("document_signatures")
      .select("signer_name, document_type, signed_at")
      .eq("token", tokenValue)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (row.signed_at) {
      return NextResponse.json({ error: "already_signed" }, { status: 400 });
    }

    return NextResponse.json({
      signer_name: row.signer_name,
      document_type: row.document_type,
      signed_at: row.signed_at,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
