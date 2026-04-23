import { Resend } from "resend";
import { NextResponse } from "next/server";
import { generateRecuAcomptePdfBuffer } from "@/lib/pdf/generate-recu-acompte-pdf";
import { normalizePlan } from "@/lib/plan-limits";
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
    if (normalizePlan((proprietaire as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
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
    if (!logement || !voyageur?.email) {
      return NextResponse.json({ error: "Données voyageur ou logement incomplètes." }, { status: 400 });
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

    const totalTtc =
      Number(reservation.tarif_total ?? 0) +
      Number(reservation.tarif_menage ?? 0) +
      Number(reservation.taxe_sejour_total ?? 0);
    const acompte = Number(reservation.montant_acompte ?? 0);
    const solde = Math.max(0, totalTtc - acompte);
    const arr = new Date(reservation.date_arrivee);
    arr.setDate(arr.getDate() - 7);
    const dateLimite = arr.toISOString().slice(0, 10);

    const pdfBytes = await generateRecuAcomptePdfBuffer({
      proprietaire: proprietaire as Record<string, unknown>,
      voyageur: voyageur as Record<string, unknown>,
      logement: logement as Record<string, unknown>,
      reservation: {
        date_arrivee: String(reservation.date_arrivee),
        date_depart: String(reservation.date_depart),
        montant_acompte: acompte,
        solde_restant: solde,
        date_limite_solde: dateLimite,
      },
      signatureImage,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const to = voyageur.email as string;
    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [to],
      subject: "Reçu d'acompte — séjour",
      html: `<p>Bonjour ${voyageur.prenom ?? ""},</p><p>Veuillez trouver votre reçu d'acompte en pièce jointe.</p>`,
      attachments: [{ filename: "recu-acompte-proplio.pdf", content: pdfBase64 }],
    });
    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const { error: uErr } = await supabase
      .from("reservations")
      .update({ acompte_recu_envoye: true })
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
