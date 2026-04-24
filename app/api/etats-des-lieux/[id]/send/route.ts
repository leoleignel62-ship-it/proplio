import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildEdlPdfBufferFromDb } from "@/lib/etat-des-lieux/pdf-server";
import { getEdlTypeEtatFromRow } from "@/lib/etat-des-lieux/edl-type-etat";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
      .select("id, prenom, nom, email, signature_path")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const ownerEmail = String(proprietaire.email ?? "").trim();
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Renseignez votre e-mail dans Paramètres avant d'envoyer." },
        { status: 400 },
      );
    }

    const { data: edl, error: edlError } = await supabase
      .from("etats_des_lieux")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (edlError || !edl) {
      return NextResponse.json({ error: "État des lieux introuvable." }, { status: 404 });
    }

    if (edl.statut !== "termine") {
      return NextResponse.json(
        {
          error:
            "L'état des lieux doit être finalisé avant l'envoi par e-mail (document à valeur légale).",
        },
        { status: 403 },
      );
    }

    const locataireId = edl.locataire_id as string | undefined;
    const reservationId = (edl.bail_id as string | undefined) ?? null;
    const sigPath = proprietaire.signature_path as string | undefined;

    const [locRes, resaRes, sigDownload] = await Promise.all([
      locataireId
        ? supabase.from("locataires").select("email").eq("id", locataireId).maybeSingle()
        : Promise.resolve({ data: null as { email: string | null } | null }),
      reservationId
        ? supabase
            .from("reservations")
            .select("voyageur_id, voyageurs(email)")
            .eq("id", reservationId)
            .maybeSingle()
        : Promise.resolve({ data: null as Record<string, unknown> | null }),
      sigPath
        ? supabaseAdmin.storage.from("signatures").download(sigPath)
        : Promise.resolve({ data: null as Blob | null }),
    ]);

    const resaVoyageurs = Array.isArray((resaRes.data as Record<string, unknown> | null)?.voyageurs)
      ? ((resaRes.data as Record<string, unknown>).voyageurs as Array<Record<string, unknown>>)[0]
      : ((resaRes.data as Record<string, unknown> | null)?.voyageurs as Record<string, unknown> | null);
    const tenantEmail = String(locRes.data?.email ?? resaVoyageurs?.email ?? "").trim();
    if (!tenantEmail) {
      return NextResponse.json(
        { error: "E-mail du locataire manquant sur sa fiche." },
        { status: 400 },
      );
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    if (sigPath && sigDownload.data) {
      const signatureBlob = sigDownload.data;
      const bytes = new Uint8Array(await signatureBlob.arrayBuffer());
      const isPng =
        signatureBlob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
      signatureImage = { bytes, isPng };
    }

    const pdfBytes = await buildEdlPdfBufferFromDb(
      supabase,
      supabaseAdmin,
      edl as Record<string, unknown>,
      proprietaire as Record<string, unknown>,
      signatureImage,
    );

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const typeLabel = getEdlTypeEtatFromRow(edl as Record<string, unknown>) === "sortie" ? "sortie" : "entrée";
    const subject = `État des lieux (${typeLabel}) — Proplio`;
    const bailleurNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();

    const to = [...new Set([ownerEmail, tenantEmail])];

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject,
      html: `<p>Bonjour,</p>
<p>Veuillez trouver en pièce jointe l'état des lieux (${typeLabel}) établi via Proplio.</p>
<p>Ce message est adressé au bailleur et au locataire pour conservation.</p>
<p>Cordialement,<br/>${bailleurNom}</p>`,
      attachments: [
        {
          filename: `etat-des-lieux-${id.slice(0, 8)}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("etats_des_lieux")
      .update({
        email_envoye: true,
        date_envoi_email: nowIso,
      })
      .eq("id", edl.id)
      .eq("proprietaire_id", proprietaire.id);

    return NextResponse.json({ success: true, to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
