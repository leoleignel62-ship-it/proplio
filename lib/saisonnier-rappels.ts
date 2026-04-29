import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  montantSoldeRestant,
  totalSejourHorsCaution,
  type SaisonnierRappelReservationRow,
} from "@/lib/saisonnier-rappel-conditions";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function euro(n: number): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function dateCourtFr(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function heureLabel(h: string | null | undefined): string {
  const s = String(h ?? "15:00").trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type RappelExecResult = { ok: true } | { ok: false; error: string };

export async function executeRappelAcompte(
  admin: SupabaseClient,
  reservationId: string,
): Promise<RappelExecResult> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY manquant." };
  }

  const { data: reservation, error: rErr } = await admin
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  if (rErr || !reservation) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const r = reservation as SaisonnierRappelReservationRow & Record<string, unknown>;
  const montantAcompte = Number(r.montant_acompte ?? 0);
  if (montantAcompte <= 0) {
    return { ok: false, error: "Acompte nul — envoi inutile." };
  }

  const [{ data: logement }, { data: voyageur }, { data: proprietaire }] = await Promise.all([
    admin.from("logements").select("nom").eq("id", r.logement_id as string).maybeSingle(),
    r.voyageur_id
      ? admin.from("voyageurs").select("prenom, nom, email").eq("id", r.voyageur_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("proprietaires").select("prenom, nom, email").eq("id", r.proprietaire_id).maybeSingle(),
  ]);

  const to = String(voyageur?.email ?? "").trim();
  if (!logement || !to) {
    return { ok: false, error: "Données voyageur ou logement incomplètes." };
  }

  const logementNom = String(logement.nom ?? "votre logement");
  const prenomV = String(voyageur?.prenom ?? "").trim();
  const totalFacture = totalSejourHorsCaution(r);
  const soldeRestant = montantSoldeRestant(r);
  const nomProp = `${String(proprietaire?.prenom ?? "").trim()} ${String(proprietaire?.nom ?? "").trim()}`.trim() || "L'équipe";
  const emailProp = String(proprietaire?.email ?? "").trim() || "—";

  const subject = `Rappel - Acompte pour votre séjour à ${logementNom}`;
  const html = `
<div style="background:#0f0f1a;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f3ff;">
  <div style="max-width:600px;margin:0 auto;background:#141428;border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://locavio.fr/logos/lockup-horizontal-sombre.svg" alt="Locavio" height="36" style="height:36px;width:auto;display:inline-block;" />
    </div>
    <p style="margin:0 0 14px 0;color:#f5f3ff;">Bonjour ${escapeHtml(prenomV)},</p>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Votre réservation à <strong style="color:#f5f3ff;">${escapeHtml(logementNom)}</strong> approche !</p>
    <p style="margin:0 0 16px 0;color:#c4b5fd;line-height:1.6;">Nous vous rappelons qu'un acompte de <strong style="color:#7c3aed;">${escapeHtml(euro(montantAcompte))}€</strong> est attendu pour confirmer votre séjour.</p>
    <div style="margin:0 0 16px 0;padding:14px 16px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.35);border-radius:10px;">
      <table style="width:100%;border-collapse:collapse;color:#c4b5fd;font-size:14px;">
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);vertical-align:top;">Séjour</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">du ${escapeHtml(dateCourtFr(r.date_arrivee))} à ${escapeHtml(heureLabel(r.heure_arrivee))}<br/>au ${escapeHtml(dateCourtFr(r.date_depart))} à ${escapeHtml(heureLabel(r.heure_depart))}</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);">Nombre de personnes</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">${escapeHtml(String(r.nb_voyageurs ?? 1))}</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);">Montant total</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">${escapeHtml(euro(totalFacture))}€</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);">Acompte à régler</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">${escapeHtml(euro(montantAcompte))}€</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 0 0;">Solde restant</td>
          <td style="padding:8px 0 0 0;text-align:right;color:#f5f3ff;">${escapeHtml(euro(soldeRestant))}€</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Pour tout renseignement, contactez-nous : ${escapeHtml(emailProp)}</p>
    <p style="margin:0;color:#f5f3ff;">Cordialement,<br/><span style="color:#c4b5fd;">${escapeHtml(nomProp)}</span></p>
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;" />
    <p style="margin:0;text-align:center;color:rgba(245,243,255,0.45);font-size:12px;">© 2026 Locavio · Axio Tech</p>
  </div>
</div>
`.trim();

  const { error: sendErr } = await resend.emails.send({
    from: "Locavio <noreply@locavio.fr>",
    to: [to],
    subject,
    html,
  });
  if (sendErr) {
    return { ok: false, error: sendErr.message ?? "Erreur envoi e-mail." };
  }

  const { error: uErr } = await admin
    .from("reservations")
    .update({ rappel_acompte_envoye: true })
    .eq("id", reservationId);
  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  return { ok: true };
}

export async function executeRappelSolde(
  admin: SupabaseClient,
  reservationId: string,
): Promise<RappelExecResult> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY manquant." };
  }

  const { data: reservation, error: rErr } = await admin
    .from("reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();
  if (rErr || !reservation) {
    return { ok: false, error: "Réservation introuvable." };
  }

  const r = reservation as SaisonnierRappelReservationRow & Record<string, unknown>;
  const montantSolde = montantSoldeRestant(r);
  if (montantSolde <= 0) {
    return { ok: false, error: "Solde nul — envoi inutile." };
  }

  const [{ data: logement }, { data: voyageur }, { data: proprietaire }] = await Promise.all([
    admin.from("logements").select("nom").eq("id", r.logement_id as string).maybeSingle(),
    r.voyageur_id
      ? admin.from("voyageurs").select("prenom, nom, email").eq("id", r.voyageur_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("proprietaires").select("prenom, nom, email").eq("id", r.proprietaire_id).maybeSingle(),
  ]);

  const to = String(voyageur?.email ?? "").trim();
  if (!logement || !to) {
    return { ok: false, error: "Données voyageur ou logement incomplètes." };
  }

  const logementNom = String(logement.nom ?? "votre logement");
  const prenomV = String(voyageur?.prenom ?? "").trim();
  const delai = Number(r.delai_solde_jours ?? 30);
  let soldePhrase: string;
  if (delai > 0) {
    const lim = new Date(`${r.date_arrivee}T12:00:00`);
    lim.setDate(lim.getDate() - delai);
    const dateLim = lim.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    soldePhrase = `avant le ${dateLim}`;
  } else {
    soldePhrase = `à votre arrivée le ${dateCourtFr(r.date_arrivee)}`;
  }

  const montantAcompte = Number(r.montant_acompte ?? 0);
  const totalFacture = totalSejourHorsCaution(r);
  const nomProp = `${String(proprietaire?.prenom ?? "").trim()} ${String(proprietaire?.nom ?? "").trim()}`.trim() || "L'équipe";
  const emailProp = String(proprietaire?.email ?? "").trim() || "—";

  const subject = `Rappel - Solde pour votre séjour à ${logementNom}`;
  const html = `
<div style="background:#0f0f1a;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#f5f3ff;">
  <div style="max-width:600px;margin:0 auto;background:#141428;border:1px solid rgba(124,58,237,0.35);border-radius:14px;padding:28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="https://locavio.fr/logos/lockup-horizontal-sombre.svg" alt="Locavio" height="36" style="height:36px;width:auto;display:inline-block;" />
    </div>
    <p style="margin:0 0 14px 0;color:#f5f3ff;">Bonjour ${escapeHtml(prenomV)},</p>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Votre séjour à <strong style="color:#f5f3ff;">${escapeHtml(logementNom)}</strong> approche !</p>
    <p style="margin:0 0 16px 0;color:#c4b5fd;line-height:1.6;">Le solde de <strong style="color:#7c3aed;">${escapeHtml(euro(montantSolde))}€</strong> est à régler ${escapeHtml(soldePhrase)}.</p>
    <div style="margin:0 0 16px 0;padding:14px 16px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.35);border-radius:10px;">
      <table style="width:100%;border-collapse:collapse;color:#c4b5fd;font-size:14px;">
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);vertical-align:top;">Séjour</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">du ${escapeHtml(dateCourtFr(r.date_arrivee))} à ${escapeHtml(heureLabel(r.heure_arrivee))}<br/>au ${escapeHtml(dateCourtFr(r.date_depart))} à ${escapeHtml(heureLabel(r.heure_depart))}</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);">Montant total</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">${escapeHtml(euro(totalFacture))}€</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 8px 0;border-bottom:1px solid rgba(124,58,237,0.2);">Acompte réglé</td>
          <td style="padding:8px 0;border-bottom:1px solid rgba(124,58,237,0.2);text-align:right;color:#f5f3ff;">${escapeHtml(euro(montantAcompte))}€</td>
        </tr>
        <tr>
          <td style="padding:8px 8px 0 0;">Solde à régler</td>
          <td style="padding:8px 0 0 0;text-align:right;color:#f5f3ff;">${escapeHtml(euro(montantSolde))}€</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 14px 0;color:#c4b5fd;line-height:1.6;">Pour tout renseignement : ${escapeHtml(emailProp)}</p>
    <p style="margin:0;color:#f5f3ff;">Cordialement,<br/><span style="color:#c4b5fd;">${escapeHtml(nomProp)}</span></p>
    <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;" />
    <p style="margin:0;text-align:center;color:rgba(245,243,255,0.45);font-size:12px;">© 2026 Locavio · Axio Tech</p>
  </div>
</div>
`.trim();

  const { error: sendErr } = await resend.emails.send({
    from: "Locavio <noreply@locavio.fr>",
    to: [to],
    subject,
    html,
  });
  if (sendErr) {
    return { ok: false, error: sendErr.message ?? "Erreur envoi e-mail." };
  }

  const { error: uErr } = await admin
    .from("reservations")
    .update({ rappel_solde_envoye: true })
    .eq("id", reservationId);
  if (uErr) {
    return { ok: false, error: uErr.message };
  }

  return { ok: true };
}
