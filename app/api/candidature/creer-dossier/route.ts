import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

type CreateDossierBody = {
  logement_id?: string;
  logement_concerne?: string;
  loyer_reference?: number;
  email_candidat?: string;
  prenom_candidat?: string;
  nom_candidat?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as CreateDossierBody | null;
    const logementId = String(body?.logement_id ?? "").trim();
    const logementConcerne = String(body?.logement_concerne ?? "").trim();
    const loyerReference = Number(body?.loyer_reference ?? 0);
    const emailCandidat = String(body?.email_candidat ?? "").trim().toLowerCase();
    const prenomCandidat = String(body?.prenom_candidat ?? "").trim();
    const nomCandidat = String(body?.nom_candidat ?? "").trim();

    if (!logementConcerne || !Number.isFinite(loyerReference) || loyerReference <= 0) {
      return NextResponse.json({ error: "Logement et loyer de référence sont obligatoires." }, { status: 400 });
    }
    if (!emailCandidat || !prenomCandidat || !nomCandidat) {
      return NextResponse.json({ error: "Informations candidat incomplètes." }, { status: 400 });
    }

    const { data: dossier, error: dossierError } = await supabaseAdmin
      .from("candidature_dossiers")
      .insert({
        proprietaire_id: user.id,
        logement_concerne: logementConcerne,
        loyer_reference: loyerReference,
      })
      .select("id")
      .single();

    if (dossierError || !dossier) {
      return NextResponse.json({ error: dossierError?.message ?? "Création dossier impossible." }, { status: 500 });
    }

    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from("candidature_tokens")
      .insert({
        dossier_id: dossier.id,
        email_candidat: emailCandidat,
        prenom_candidat: prenomCandidat,
        nom_candidat: nomCandidat,
      })
      .select("id, token, expire_at")
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ error: tokenError?.message ?? "Création du lien impossible." }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const candidateUrl = `${baseUrl.replace(/\/+$/, "")}/candidature/${tokenRow.token}`;
    let logementAdresseEmail = logementConcerne;
    if (logementId) {
      const { data: owner } = await supabaseAdmin
        .from("proprietaires")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const ownerId = String(owner?.id ?? "");
      if (ownerId) {
        const { data: logement } = await supabaseAdmin
          .from("logements")
          .select("adresse")
          .eq("id", logementId)
          .eq("proprietaire_id", ownerId)
          .maybeSingle();
        const adresse = String(logement?.adresse ?? "").trim();
        if (adresse) logementAdresseEmail = adresse;
      }
    }

    const emailHtml = `
<div style="background:#0f0f1a;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f3ff;">
  <div style="max-width:600px;margin:0 auto;background:#141428;border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://locavio.fr/logos/lockup-horizontal-sombre.svg" alt="Locavio" height="36" style="height:36px;width:auto;display:inline-block;" />
    </div>
    <p style="margin:0 0 14px 0;color:#f5f3ff;">Bonjour ${prenomCandidat},</p>
    <p style="margin:0 0 18px 0;color:#c4b5fd;line-height:1.6;">
      Le propriétaire vous invite à compléter votre dossier de candidature pour le logement : <strong style="color:#f5f3ff;">${logementAdresseEmail}</strong>.
    </p>
    <div style="text-align:center;margin:20px 0 0 0;">
      <a href="${candidateUrl}" style="background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 24px;font-weight:600;display:inline-block;">Compléter mon dossier</a>
    </div>
    <p style="margin:18px 0 0 0;color:#c4b5fd;font-size:13px;">Ce lien est valable 14 jours.</p>
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;" />
    <p style="margin:0;text-align:center;color:rgba(245,243,255,0.45);font-size:12px;">© 2026 Locavio · Axio Tech</p>
  </div>
</div>
    `;

    const emailResult = await resend.emails.send({
      from: "Locavio <noreply@locavio.fr>",
      to: [emailCandidat],
      subject: `Votre dossier de candidature — ${logementConcerne}`,
      html: emailHtml,
    });
    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    return NextResponse.json({ dossier_id: dossier.id, token: tokenRow.token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
