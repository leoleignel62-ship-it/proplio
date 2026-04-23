import { Resend } from "resend";
import { NextResponse } from "next/server";
import { fetchLatestIrlFromInsee } from "@/lib/irl-insee";
import { formatDateIsoLocal, getDerniereDateAnniversaireBail } from "@/lib/irl-revision";
import { generateRevisionIrlLetterPdfBuffer } from "@/lib/pdf/generate-revision-irl-letter-pdf";
import { normalizePlan } from "@/lib/plan-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatFrDate(isoOrDate: string): string {
  const d = new Date(isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: revisionId } = await context.params;
    if (!revisionId) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { data: proprio, error: pErr } = await supabase
      .from("proprietaires")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr || !proprio?.id) {
      return NextResponse.json({ error: "Profil introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprio as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
    }

    const { data: revision, error: revErr } = await supabase
      .from("revisions_irl")
      .select("*")
      .eq("id", revisionId)
      .eq("proprietaire_id", proprio.id)
      .maybeSingle();

    if (revErr || !revision) {
      return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
    }
    if (String(revision.statut ?? "").toLowerCase() !== "validee") {
      return NextResponse.json({ error: "Seules les révisions validées peuvent faire l'objet d'un envoi." }, { status: 400 });
    }
    if (revision.lettre_envoyee) {
      return NextResponse.json({ error: "Lettre déjà envoyée." }, { status: 400 });
    }

    const bailId = revision.bail_id as string;
    const { data: bail, error: bailErr } = await supabase
      .from("baux")
      .select("*")
      .eq("id", bailId)
      .eq("proprietaire_id", proprio.id)
      .maybeSingle();
    if (bailErr || !bail) {
      return NextResponse.json({ error: "Bail introuvable." }, { status: 404 });
    }

    const locataireId = bail.locataire_id as string | null;
    if (!locataireId) {
      return NextResponse.json({ error: "Locataire manquant sur le bail." }, { status: 400 });
    }

    const { data: locataire } = await supabase
      .from("locataires")
      .select("nom, prenom, email")
      .eq("id", locataireId)
      .eq("proprietaire_id", proprio.id)
      .maybeSingle();

    const { data: logement } = await supabase
      .from("logements")
      .select("nom, adresse, code_postal, ville")
      .eq("id", bail.logement_id as string)
      .eq("proprietaire_id", proprio.id)
      .maybeSingle();

    const tenantEmail = String(locataire?.email ?? "").trim();
    if (!tenantEmail) {
      return NextResponse.json(
        { error: "Aucun e-mail locataire : complétez la fiche locataire." },
        { status: 400 },
      );
    }

    const irl = await fetchLatestIrlFromInsee();
    const anniv = getDerniereDateAnniversaireBail(String(bail.date_debut ?? ""));
    const dateEffet = anniv
      ? formatFrDate(formatDateIsoLocal(anniv))
      : formatFrDate(String(revision.date_revision));

    const proprioNom = `${proprio.prenom ?? ""} ${proprio.nom ?? ""}`.trim() || "Le bailleur";
    const adr: string[] = [];
    const a = String(proprio.adresse ?? "").trim();
    const cp = String(proprio.code_postal ?? "").trim();
    const v = String(proprio.ville ?? "").trim();
    if (a) adr.push(a);
    if (cp || v) adr.push([cp, v].filter(Boolean).join(" "));
    if (adr.length === 0) adr.push("(Adresse à compléter dans Paramètres)");

    const locNom = `${locataire?.prenom ?? ""} ${locataire?.nom ?? ""}`.trim() || "Locataire";

    let signatureImage: { bytes: Uint8Array; isPng: boolean } | null = null;
    const sigPath = proprio.signature_path as string | undefined;
    if (sigPath) {
      const { data: blob } = await supabaseAdmin.storage.from("signatures").download(sigPath);
      if (blob) {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const isPng = blob.type === "image/png" || sigPath.toLowerCase().endsWith(".png");
        signatureImage = { bytes, isPng };
      }
    }

    const locAdr: string[] = [];
    const logAddr = String((logement as { adresse?: string } | null)?.adresse ?? "").trim();
    const logCp = String((logement as { code_postal?: string } | null)?.code_postal ?? "").trim();
    const logVille = String((logement as { ville?: string } | null)?.ville ?? "").trim();
    const logNom = String((logement as { nom?: string } | null)?.nom ?? "").trim();
    if (logAddr) locAdr.push(logAddr);
    if (logCp || logVille) locAdr.push([logCp, logVille].filter(Boolean).join(" "));
    if (locAdr.length === 0) locAdr.push("Adresse du logement (à compléter)");
    if (logNom) locAdr.push(`Logement : ${logNom}`);

    const fmtEuro = (n: number) =>
      Number.isFinite(n)
        ? n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "0,00";
    const fmtIrl = (n: number) =>
      Number.isFinite(n)
        ? n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—";
    const loyerApresN = Number(revision.loyer_apres ?? 0);
    const chargesN = Number((bail as { charges?: number }).charges ?? 0);

    const pdfBytes = await generateRevisionIrlLetterPdfBuffer({
      villeSignature: v || "………………",
      dateLettre: formatFrDate(new Date().toISOString().slice(0, 10)),
      proprietaireNom: proprioNom,
      proprietaireAdresseLignes: adr,
      proprietaireEmail: String(proprio.email ?? "").trim() || undefined,
      proprietaireTelephone: String(proprio.telephone ?? "").trim() || undefined,
      locataireNom: locNom,
      locataireAdresseLignes: locAdr,
      dateDebutBail: formatFrDate(String(bail.date_debut ?? "")),
      trimestreIrl: irl.trimestre,
      trimestreIrlReference: "référence à la date du bail",
      valeurIrl: fmtIrl(Number(irl.valeur)),
      irlReferenceBail: fmtIrl(Number(revision.irl_ancien ?? 0)),
      loyerAvant: fmtEuro(Number(revision.loyer_avant ?? 0)),
      loyerApres: fmtEuro(loyerApresN),
      chargesMensuelles: fmtEuro(chargesN),
      totalMensuel: fmtEuro(loyerApresN + chargesN),
      dateEffetRevision: dateEffet,
      signatureImage,
    });

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const subject = "Révision annuelle du loyer (IRL)";

    const emailResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to: [tenantEmail],
      subject,
      html: `<p>Bonjour,</p>
<p>Veuillez trouver en pièce jointe la lettre de révision annuelle du loyer (IRL).</p>
<p>Cordialement,<br/>${proprioNom}</p>`,
      attachments: [{ filename: `revision-loyer-irl-${revisionId.slice(0, 8)}.pdf`, content: pdfBase64 }],
    });

    if (emailResult.error) {
      return NextResponse.json({ error: emailResult.error.message }, { status: 502 });
    }

    const nowIso = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("revisions_irl")
      .update({
        lettre_envoyee: true,
        date_envoi_lettre: nowIso,
      })
      .eq("id", revisionId)
      .eq("proprietaire_id", proprio.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, to: tenantEmail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
