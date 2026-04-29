import { Resend } from "resend";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLocataireIdsOrderedForBailPdf } from "@/lib/bail-pdf-locataires";
import { generateBailPdfBuffer, type BailPdfLocataire } from "@/lib/pdf/generate-bail-pdf";

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
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }

    const ownerEmail = String(proprietaire.email ?? "").trim();
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Renseignez votre adresse e-mail dans Paramètres avant d'envoyer le bail." },
        { status: 400 },
      );
    }

    const { data: bail, error: bailError } = await supabase
      .from("baux")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (bailError || !bail) {
      return NextResponse.json({ error: "Bail introuvable." }, { status: 404 });
    }

    const { data: logement } = await supabase
      .from("logements")
      .select("*")
      .eq("id", bail.logement_id)
      .maybeSingle();

    const locataireIdsOrdered = getLocataireIdsOrderedForBailPdf(
      bail as { locataire_id: unknown; colocataires_ids: unknown; colocation_chambre_index?: unknown },
      (logement ?? null) as { est_colocation?: unknown } | null,
    );

    const { data: locatairesList } =
      locataireIdsOrdered.length > 0
        ? await supabase.from("locataires").select("*").in("id", locataireIdsOrdered)
        : { data: null };

    const locatairesById = new Map(
      (locatairesList ?? []).map((row) => [row.id as string, row as Record<string, unknown>]),
    );
    const locatairesOrdered: BailPdfLocataire[] = locataireIdsOrdered
      .map((lid) => locatairesById.get(lid))
      .filter((row): row is Record<string, unknown> => row != null)
      .map((row) => ({
        prenom: row.prenom as string | undefined,
        nom: row.nom as string | undefined,
        email: row.email as string | undefined,
        telephone: row.telephone as string | undefined,
        adresse: row.adresse as string | undefined,
        code_postal: row.code_postal as string | undefined,
        ville: row.ville as string | undefined,
        date_naissance: row.date_naissance as string | undefined,
      }));

    const tenantEmails = locatairesOrdered
      .map((l) => String(l.email ?? "").trim())
      .filter(Boolean);
    const uniqueTenantEmails = [...new Set(tenantEmails)];
    if (uniqueTenantEmails.length === 0) {
      return NextResponse.json(
        { error: "Aucun e-mail locataire renseigné : complétez la fiche locataire." },
        { status: 400 },
      );
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprietaire.signature_path as string | undefined;
    if (sigPath) {
      const { data: signatureBlob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
      if (signatureBlob) {
        const bytes = new Uint8Array(await signatureBlob.arrayBuffer());
        const isPng =
          signatureBlob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    const pdfBytes = await generateBailPdfBuffer({
      bail: bail as Record<string, unknown>,
      proprietaire: proprietaire as Record<string, unknown>,
      logement: (logement ?? null) as Record<string, unknown> | null,
      locatairesOrdered,
      signatureImage,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const logementRecord = logement as Record<string, unknown> | null;
    const adresseSujet = [logementRecord?.adresse, logementRecord?.code_postal, logementRecord?.ville]
      .filter(Boolean)
      .join(" ")
      .trim() || "votre logement";

    const subject = `Votre bail de location - ${adresseSujet}`;
    const bailleurNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();

    const to = [...new Set([ownerEmail, ...uniqueTenantEmails])];

    const emailResult = await resend.emails.send({
      from: "Locavio <noreply@locavio.fr>",
      to,
      subject,
      html: `<div style="background:#0f0f1a;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f3ff;">
  <div style="max-width:600px;margin:0 auto;background:#141428;border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://locavio.fr/logos/lockup-horizontal-sombre.svg" alt="Locavio" height="36" style="height:36px;width:auto;display:inline-block;" />
    </div>
    <p style="margin:0 0 14px 0;color:#f5f3ff;">Bonjour,</p>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Veuillez trouver en pièce jointe le contrat de bail d'habitation concernant : <strong style="color:#f5f3ff;">${adresseSujet}</strong>.</p>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Ce message est adressé au bailleur et au(x) locataire(s) pour conservation.</p>
    <p style="margin:0;color:#f5f3ff;">Cordialement,<br/><span style="color:#c4b5fd;">${bailleurNom}</span></p>
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;" />
    <p style="margin:0;text-align:center;color:rgba(245,243,255,0.45);font-size:12px;">© 2026 Locavio · Axio Tech</p>
  </div>
</div>`,
      attachments: [
        {
          filename: `bail-${id.slice(0, 8)}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("baux")
      .update({
        email_envoye: true,
        date_envoi_email: nowIso,
      })
      .eq("id", bail.id)
      .eq("proprietaire_id", proprietaire.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
