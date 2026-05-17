import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  emailButton,
  emailGreeting,
  emailMutedNote,
  emailParagraph,
  wrapLocavioEmail,
} from "@/lib/email-templates";
import { canAccessDocuments } from "@/lib/plan-limits";
import { getEffectivePlan } from "@/lib/proprietaire-profile";
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

    const { data: proprietaire, error: proprietaireError } = await supabaseAdmin
      .from("proprietaires")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (proprietaireError || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }
    if (!canAccessDocuments(getEffectivePlan(proprietaire as { plan?: string | null; override_plan?: string | null }))) {
      return NextResponse.json({ error: "Plan Pro ou supérieur requis." }, { status: 403 });
    }

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

    const emailHtml = wrapLocavioEmail(
      [
        emailGreeting(prenomCandidat),
        emailParagraph(
          `Un propriétaire vous invite à compléter votre dossier de candidature pour le logement suivant : <strong style="color:#1a0533;">${logementAdresseEmail}</strong>.`,
        ),
        emailParagraph(
          "Cliquez sur le bouton ci-dessous pour accéder à votre espace candidat et déposer vos documents.",
        ),
        emailButton("Compléter mon dossier →", candidateUrl),
        emailMutedNote(
          "Ce lien est valable 14 jours. Passé ce délai, contactez directement le propriétaire.",
        ),
      ].join(""),
    );

    const emailResult = await resend.emails.send({
      from: "Locavio <noreply@locavio.fr>",
      to: [emailCandidat],
      subject: `Votre dossier de candidature — ${logementAdresseEmail}`,
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
