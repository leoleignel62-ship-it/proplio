/** Ordre des locataires sur le PDF : bail colocation individuel = un seul signataire. */

export function getLocataireIdsOrderedForBailPdf(
  bail: {
    locataire_id: unknown;
    colocataires_ids: unknown;
    colocation_chambre_index?: unknown;
  },
  logement: { est_colocation?: unknown } | null,
): string[] {
  const estColocLogement = Boolean(logement?.est_colocation);
  const raw = bail.colocation_chambre_index;
  const chambre =
    raw != null && raw !== ""
      ? Number(raw)
      : NaN;
  const bailColocIndividuel = estColocLogement && Number.isFinite(chambre) && chambre >= 1;

  if (bailColocIndividuel) {
    const id = typeof bail.locataire_id === "string" ? bail.locataire_id : "";
    return id ? [id] : [];
  }

  const colocIdsRaw = bail.colocataires_ids;
  const colocIds = Array.isArray(colocIdsRaw)
    ? colocIdsRaw.filter((cid: unknown): cid is string => typeof cid === "string" && cid.length > 0)
    : [];
  const locataireIdsOrdered: string[] = [];
  const locSeen = new Set<string>();
  for (const lid of [bail.locataire_id, ...colocIds]) {
    if (typeof lid === "string" && lid.length > 0 && !locSeen.has(lid)) {
      locSeen.add(lid);
      locataireIdsOrdered.push(lid);
    }
  }
  return locataireIdsOrdered;
}
