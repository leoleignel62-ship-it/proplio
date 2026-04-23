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
<p>Bonjour ${escapeHtml(prenomV)},</p>
<p>Votre réservation à ${escapeHtml(logementNom)} approche !</p>
<p>Nous vous rappelons qu'un acompte de ${escapeHtml(euro(montantAcompte))}€ est attendu pour confirmer votre séjour.</p>
<p>Séjour : du ${escapeHtml(dateCourtFr(r.date_arrivee))} à ${escapeHtml(heureLabel(r.heure_arrivee))} au ${escapeHtml(dateCourtFr(r.date_depart))} à ${escapeHtml(heureLabel(r.heure_depart))}<br/>
Nombre de personnes : ${escapeHtml(String(r.nb_voyageurs ?? 1))}<br/>
Montant total : ${escapeHtml(euro(totalFacture))}€<br/>
Acompte à régler : ${escapeHtml(euro(montantAcompte))}€<br/>
Solde restant : ${escapeHtml(euro(soldeRestant))}€</p>
<p>Pour tout renseignement, contactez-nous : ${escapeHtml(emailProp)}</p>
<p>Cordialement,<br/>${escapeHtml(nomProp)}</p>
`.trim();

  const { error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
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
<p>Bonjour ${escapeHtml(prenomV)},</p>
<p>Votre séjour à ${escapeHtml(logementNom)} approche !</p>
<p>Le solde de ${escapeHtml(euro(montantSolde))}€ est à régler ${escapeHtml(soldePhrase)}.</p>
<p>Séjour : du ${escapeHtml(dateCourtFr(r.date_arrivee))} à ${escapeHtml(heureLabel(r.heure_arrivee))} au ${escapeHtml(dateCourtFr(r.date_depart))} à ${escapeHtml(heureLabel(r.heure_depart))}<br/>
Montant total : ${escapeHtml(euro(totalFacture))}€<br/>
Acompte réglé : ${escapeHtml(euro(montantAcompte))}€<br/>
Solde à régler : ${escapeHtml(euro(montantSolde))}€</p>
<p>Pour tout renseignement : ${escapeHtml(emailProp)}</p>
<p>Cordialement,<br/>${escapeHtml(nomProp)}</p>
`.trim();

  const { error: sendErr } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
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
