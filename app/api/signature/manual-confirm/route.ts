import { NextResponse } from "next/server";
import { emailSignatureManualConfirmOwner } from "@/lib/signature-email";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendSupportEmail } from "@/lib/support/mail";

export const runtime = "nodejs";

type ManualConfirmBody = {
  document_type?: string;
  document_id?: string;
  proprietaire_id?: string;
};

async function loadSignerForDocument(
  document_type: string,
  document_id: string,
  proprietaire_id: string,
): Promise<{ signer_name: string; signer_email: string } | null> {
  if (document_type === "bail") {
    const { data: bail } = await supabaseAdmin
      .from("baux")
      .select("locataire_id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    if (!bail?.locataire_id) return null;
    const { data: loc } = await supabaseAdmin
      .from("locataires")
      .select("nom, prenom, email")
      .eq("id", bail.locataire_id)
      .maybeSingle();
    if (!loc) return null;
    const signer_name = `${String(loc.prenom ?? "").trim()} ${String(loc.nom ?? "").trim()}`.trim() || "Locataire";
    return { signer_name, signer_email: String(loc.email ?? "").trim() };
  }

  if (document_type === "contrat_sejour") {
    const { data: resa } = await supabaseAdmin
      .from("reservations")
      .select("voyageur_id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    if (!resa?.voyageur_id) return null;
    const { data: voy } = await supabaseAdmin
      .from("voyageurs")
      .select("nom, prenom, email")
      .eq("id", resa.voyageur_id)
      .maybeSingle();
    if (!voy) return null;
    const signer_name = `${String(voy.prenom ?? "").trim()} ${String(voy.nom ?? "").trim()}`.trim() || "Voyageur";
    return { signer_name, signer_email: String(voy.email ?? "").trim() };
  }

  if (document_type === "edl") {
    const { data: edl } = await supabaseAdmin
      .from("etats_des_lieux")
      .select("locataire_id, voyageur_id, reservation_id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    if (!edl) return null;

    if (edl.locataire_id) {
      const { data: loc } = await supabaseAdmin
        .from("locataires")
        .select("nom, prenom, email")
        .eq("id", edl.locataire_id)
        .maybeSingle();
      if (loc) {
        const signer_name = `${String(loc.prenom ?? "").trim()} ${String(loc.nom ?? "").trim()}`.trim() || "Locataire";
        return { signer_name, signer_email: String(loc.email ?? "").trim() };
      }
    }

    if (edl.voyageur_id) {
      const { data: voy } = await supabaseAdmin
        .from("voyageurs")
        .select("nom, prenom, email")
        .eq("id", edl.voyageur_id)
        .maybeSingle();
      if (voy) {
        const signer_name = `${String(voy.prenom ?? "").trim()} ${String(voy.nom ?? "").trim()}`.trim() || "Voyageur";
        return { signer_name, signer_email: String(voy.email ?? "").trim() };
      }
    }

    if (edl.reservation_id) {
      const { data: resa } = await supabaseAdmin
        .from("reservations")
        .select("voyageur_id")
        .eq("id", edl.reservation_id)
        .maybeSingle();
      if (resa?.voyageur_id) {
        const { data: voy } = await supabaseAdmin
          .from("voyageurs")
          .select("nom, prenom, email")
          .eq("id", resa.voyageur_id)
          .maybeSingle();
        if (voy) {
          const signer_name = `${String(voy.prenom ?? "").trim()} ${String(voy.nom ?? "").trim()}`.trim() || "Voyageur";
          return { signer_name, signer_email: String(voy.email ?? "").trim() };
        }
      }
    }
  }

  return null;
}

async function assertDocumentOwned(
  document_type: string,
  document_id: string,
  proprietaire_id: string,
): Promise<boolean> {
  if (document_type === "bail") {
    const { data } = await supabaseAdmin
      .from("baux")
      .select("id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    return Boolean(data);
  }
  if (document_type === "contrat_sejour") {
    const { data } = await supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    return Boolean(data);
  }
  if (document_type === "edl") {
    const { data } = await supabaseAdmin
      .from("etats_des_lieux")
      .select("id")
      .eq("id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();
    return Boolean(data);
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManualConfirmBody;
    const document_type = String(body.document_type ?? "").trim();
    const document_id = String(body.document_id ?? "").trim();
    const proprietaire_id = String(body.proprietaire_id ?? "").trim();

    if (!document_type || !document_id || !proprietaire_id) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

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
      .select("id, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    if (String(proprietaire.id) !== proprietaire_id) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const owned = await assertDocumentOwned(document_type, document_id, proprietaire_id);
    if (!owned) {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from("document_signatures")
      .select("id, signer_name, signer_email")
      .eq("document_type", document_type)
      .eq("document_id", document_id)
      .eq("proprietaire_id", proprietaire_id)
      .maybeSingle();

    let signer_name = String(existing?.signer_name ?? "").trim();

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("document_signatures")
        .update({
          signed_manually: true,
          signed_manually_at: now,
          signed_at: now,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      const signer = await loadSignerForDocument(document_type, document_id, proprietaire_id);
      if (!signer) {
        return NextResponse.json({ error: "Signataire introuvable pour ce document." }, { status: 400 });
      }
      signer_name = signer.signer_name;
      const token = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin.from("document_signatures").insert({
        document_type,
        document_id,
        proprietaire_id,
        signer_name: signer.signer_name,
        signer_email: signer.signer_email,
        token,
        signed_manually: true,
        signed_manually_at: now,
        signed_at: now,
      });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    const ownerEmail = String(proprietaire.email ?? "").trim();
    if (ownerEmail) {
      void sendSupportEmail({
        to: ownerEmail,
        subject: "Document marqué comme signé — Locavio",
        html: emailSignatureManualConfirmOwner({ signerName: signer_name }),
      }).catch(() => {
        /* fire-and-forget */
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
