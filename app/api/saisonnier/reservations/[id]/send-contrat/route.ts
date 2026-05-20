import { Resend } from "resend";
import { NextResponse } from "next/server";
import { emailGreeting, emailParagraph, emailSignoff, wrapLocavioEmail } from "@/lib/email-templates";
import { generateContratSejourPdfBuffer } from "@/lib/pdf/generate-contrat-sejour-pdf";
import { canAccessSaisonnier } from "@/lib/plan-limits";
import { getEffectivePlan } from "@/lib/proprietaire-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
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

    const { data: proprietaire, error: pErr } = await supabase.from("proprietaires").select("*").eq("user_id", user.id).maybeSingle();
    if (pErr || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }
    if (!canAccessSaisonnier(getEffectivePlan(proprietaire as { plan?: string | null; override_plan?: string | null }))) {
      return NextResponse.json({ error: "Plan Pro ou supérieur requis." }, { status: 403 });
    }

    const { data: reservation, error: rErr } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();
    if (rErr || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }

    const [{ data: logement }, { data: voyageur }] = await Promise.all([
      supabase.from("logements").select("*").eq("id", reservation.logement_id).maybeSingle(),
      reservation.voyageur_id
        ? supabase.from("voyageurs").select("*").eq("id", reservation.voyageur_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (!logement) {
      return NextResponse.json({ error: "Logement introuvable." }, { status: 400 });
    }
    if (!voyageur?.email) {
      return NextResponse.json({ error: "Le voyageur doit avoir une adresse e-mail." }, { status: 400 });
    }

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprietaire.signature_path as string | undefined;
    if (sigPath) {
      const { data: blob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const isPng = blob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    const nbNuits = Number(reservation.nb_nuits ?? 0) ||
      Math.max(
        0,
        Math.round(
          (new Date(reservation.date_depart).getTime() - new Date(reservation.date_arrivee).getTime()) / 86400000,
        ),
      );

    const pdfBytes = await generateContratSejourPdfBuffer({
      proprietaire: proprietaire as Record<string, unknown>,
      voyageur: voyageur as Record<string, unknown>,
      logement: logement as Record<string, unknown>,
      reservation: {
        date_arrivee: String(reservation.date_arrivee),
        date_depart: String(reservation.date_depart),
        heure_arrivee: String((reservation as { heure_arrivee?: string }).heure_arrivee ?? "15:00"),
        heure_depart: String((reservation as { heure_depart?: string }).heure_depart ?? "11:00"),
        nb_voyageurs: Number(reservation.nb_voyageurs ?? 1),
        nb_nuits: nbNuits,
        tarif_nuit: Number(reservation.tarif_nuit ?? 0),
        tarif_total: Number(reservation.tarif_total ?? 0),
        tarif_menage: Number(reservation.tarif_menage ?? 0),
        menage_inclus: (reservation as { menage_inclus?: boolean }).menage_inclus !== false,
        tarif_caution: Number(reservation.tarif_caution ?? 0),
        taxe_sejour_total: Number(reservation.taxe_sejour_total ?? 0),
        montant_acompte: Number((reservation as { montant_acompte?: number }).montant_acompte ?? 0),
      },
      signatureImage,
      numeroEnregistrement: (logement.numero_enregistrement as string | undefined) ?? undefined,
      classementMeubleTourisme: (logement.classement_meuble_tourisme as string | undefined) ?? "non_classe",
      preneurNom: voyageur ? `${voyageur.prenom ?? ""} ${voyageur.nom ?? ""}`.trim() : undefined,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const to = voyageur.email as string;
    const logementNom = String(logement.nom ?? "votre logement");
    const bailleurNom = `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim();
    const emailHtml = wrapLocavioEmail(
      [
        emailGreeting(String(voyageur.prenom ?? "")),
        emailParagraph(
          `Veuillez trouver en pièce jointe votre contrat de location saisonnière pour votre séjour à <strong style="color:#1a0533;">${logementNom}</strong>.`,
        ),
        emailParagraph("Nous vous souhaitons un excellent séjour."),
        emailSignoff(bailleurNom),
      ].join(""),
    );

    const emailResult = await resend.emails.send({
      from: "Locavio <noreply@locavio.fr>",
      to: [to],
      subject: `Votre contrat de location saisonnière — ${logementNom}`,
      html: emailHtml,
      attachments: [{ filename: "contrat-sejour-locavio.pdf", content: pdfBase64 }],
    });
    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("reservations")
      .update({ contrat_envoye: true, date_contrat_envoye: nowIso })
      .eq("id", id)
      .eq("proprietaire_id", proprietaire.id);
    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, to });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
