export type ChambreDetail = {
  loyer: number;
  charges: number;
  surface: number;
  description: string;
  statut: "occupee" | "libre";
};

export function defaultChambre(): ChambreDetail {
  return { loyer: 0, charges: 0, surface: 0, description: "", statut: "libre" };
}

export function parseChambresDetails(raw: unknown): ChambreDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    const o = c as Record<string, unknown>;
    return {
      loyer: Number(o.loyer ?? 0),
      charges: Number(o.charges ?? 0),
      surface: Number(o.surface ?? 0),
      description: String(o.description ?? ""),
      statut: o.statut === "occupee" ? "occupee" : "libre",
    };
  });
}

/** index1Based : 1 = première chambre */
export function getChambreAt(chambres: ChambreDetail[], index1Based: number): ChambreDetail | null {
  if (index1Based < 1) return null;
  return chambres[index1Based - 1] ?? null;
}

export function totalLoyersChambres(chambres: ChambreDetail[]): number {
  return chambres.reduce((s, c) => s + Number(c.loyer ?? 0), 0);
}

export type LogementMontantsInput = {
  id: string;
  loyer: number;
  charges: number;
  est_colocation?: boolean | null;
  chambres_details?: unknown;
};

export type LocataireMontantsInput = {
  logement_id: string | null;
  colocation_chambre_index: number | null;
};

/** Montants affichés sur une quittance : chambre si colocataire lié à ce logement, sinon loyer global. */
export function montantsPourQuittanceLocataire(
  logement: LogementMontantsInput,
  locataire: LocataireMontantsInput | null | undefined,
): { loyer: number; charges: number } {
  const globalLoyer = Number(logement.loyer ?? 0);
  const globalCharges = Number(logement.charges ?? 0);
  if (
    !locataire?.logement_id ||
    locataire.logement_id !== logement.id ||
    locataire.colocation_chambre_index == null
  ) {
    return { loyer: globalLoyer, charges: globalCharges };
  }
  if (!logement.est_colocation) {
    return { loyer: globalLoyer, charges: globalCharges };
  }
  const ch = getChambreAt(parseChambresDetails(logement.chambres_details), locataire.colocation_chambre_index);
  if (!ch) {
    return { loyer: globalLoyer, charges: globalCharges };
  }
  return { loyer: Number(ch.loyer ?? 0), charges: Number(ch.charges ?? 0) };
}
