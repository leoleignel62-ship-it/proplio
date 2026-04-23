import { Resend } from "resend";
import { NextResponse } from "next/server";
import { generateQuittancePdfBuffer } from "@/lib/pdf/generate-quittance-pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

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

    const { data: quittance, error: quittanceError } = await supabase
      .from("quittances")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();

    if (quittanceError || !quittance) {
      return NextResponse.json({ error: "Quittance introuvable." }, { status: 404 });
    }

    const [{ data: locataire, error: locataireError }, { data: logement, error: logementError }] =
      await Promise.all([
        supabase
          .from("locataires")
          .select("*")
          .eq("id", quittance.locataire_id)
          .eq("proprietaire_id", proprietaire.id)
          .maybeSingle(),
        supabase
          .from("logements")
          .select("*")
          .eq("id", quittance.logement_id)
          .eq("proprietaire_id", proprietaire.id)
          .maybeSingle(),
      ]);

    if (locataireError || !locataire || logementError || !logement) {
      return NextResponse.json(
        { error: "Impossible de charger les données locataire/logement." },
        { status: 400 },
      );
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprietaire.signature_path as string | undefined;
    if (sigPath) {
      const { data: signatureBlob, error: signatureError } = await supabaseAdmin.storage
        .from("signatures")
        .download(sigPath);
      if (!signatureError && signatureBlob) {
        const bytes = new Uint8Array(await signatureBlob.arrayBuffer());
        const isPng = signatureBlob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    const pdfBytes = await generateQuittancePdfBuffer({
      proprietaire: proprietaire as Record<string, unknown>,
      locataire: locataire as Record<string, unknown>,
      logement: logement as Record<string, unknown>,
      quittance: {
        id: quittance.id as string,
        mois: Number(quittance.mois),
        annee: Number(quittance.annee),
        loyer: Number(quittance.loyer),
        charges: Number(quittance.charges),
        total: Number(quittance.total),
      },
      signatureImage,
    });
    const monthLabel = MONTHS_FR[Number(quittance.mois) - 1] ?? String(quittance.mois);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [locataire.email],
      subject: `Quittance de loyer - ${monthLabel} ${quittance.annee}`,
      html: `<p>Bonjour ${locataire.prenom || ""},</p>
<p>Veuillez trouver en pièce jointe votre quittance de loyer pour ${monthLabel} ${quittance.annee}.</p>
<p>Cordialement,<br/>${proprietaire.prenom || ""} ${proprietaire.nom || ""}</p>`,
      attachments: [
        {
          filename: `quittance-${monthLabel}-${quittance.annee}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("quittances")
      .update({
        envoyee: true,
        date_envoi: nowIso,
      })
      .eq("id", quittance.id)
      .eq("proprietaire_id", proprietaire.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, to: locataire.email });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
