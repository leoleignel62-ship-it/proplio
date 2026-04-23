/** Champs réservation utilisés pour rappels acompte/solde (saisonnier, source direct). */

export type SaisonnierRappelReservationRow = {
  id: string;
  proprietaire_id: string;
  source: string | null;
  statut: string | null;
  voyageur_id: string | null;
  date_arrivee: string;
  date_depart: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  nb_voyageurs: number | null;
  tarif_total: number | null;
  tarif_menage: number | null;
  taxe_sejour_total: number | null;
  montant_acompte: number | null;
  delai_solde_jours: number | null;
  acompte_recu: boolean | null;
  solde_recu: boolean | null;
  rappel_acompte_envoye: boolean | null;
  rappel_solde_envoye: boolean | null;
};

export function daysUntilArrival(dateArrivee: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const arr = new Date(`${dateArrivee}T12:00:00`);
  arr.setHours(0, 0, 0, 0);
  return Math.round((arr.getTime() - today.getTime()) / 86400000);
}

export function totalSejourHorsCaution(r: SaisonnierRappelReservationRow): number {
  return (
    Number(r.tarif_total ?? 0) +
    Number(r.tarif_menage ?? 0) +
    Number(r.taxe_sejour_total ?? 0)
  );
}

export function montantSoldeRestant(r: SaisonnierRappelReservationRow): number {
  return Math.max(0, totalSejourHorsCaution(r) - Number(r.montant_acompte ?? 0));
}

export function bellAlertAcompte(r: SaisonnierRappelReservationRow): boolean {
  if (String(r.source) !== "direct") return false;
  if (String(r.statut) !== "confirmee") return false;
  if (!r.voyageur_id) return false;
  if (Number(r.montant_acompte ?? 0) <= 0) return false;
  if (r.acompte_recu === true) return false;
  const d = daysUntilArrival(r.date_arrivee);
  return d >= 0 && d <= 30;
}

export function bellAlertSolde(r: SaisonnierRappelReservationRow): boolean {
  if (String(r.source) !== "direct") return false;
  if (String(r.statut) !== "confirmee") return false;
  if (!r.voyageur_id) return false;
  if (montantSoldeRestant(r) <= 0) return false;
  if (r.solde_recu === true) return false;
  const delai = Number(r.delai_solde_jours ?? 30);
  const d = daysUntilArrival(r.date_arrivee);
  if (d < 0) return false;
  if (delai > 0) return d <= delai;
  return d <= 7;
}

export function cronShouldSendAcompte(r: SaisonnierRappelReservationRow): boolean {
  if (r.rappel_acompte_envoye === true) return false;
  return bellAlertAcompte(r);
}

export function cronShouldSendSolde(r: SaisonnierRappelReservationRow): boolean {
  if (r.rappel_solde_envoye === true) return false;
  return bellAlertSolde(r);
}
