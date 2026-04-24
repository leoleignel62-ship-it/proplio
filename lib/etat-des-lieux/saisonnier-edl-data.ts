/**
 * Données JSON des EDL saisonniers (colonne `pieces` quand `_proplio_saisonnier` est true).
 * Les EDL classiques utilisent un autre schéma — ne pas mélanger.
 */

export const SAISONNIER_EDL_MARK = "_proplio_saisonnier" as const;
export const SAISONNIER_EDL_VERSION = 2 as const;

export type SaisonnierRoomId =
  | "salon"
  | "cuisine"
  | "chambre_1"
  | "chambre_2"
  | "salle_de_bain"
  | "wc"
  | "exterieur";

export type SaisonnierEtatPiece = "bon" | "moyen" | "mauvais";

export type SaisonnierRoomState = {
  enabled: boolean;
  etat: SaisonnierEtatPiece;
  observations: string;
  photoPaths: string[];
};

export type InventaireStatut = "present" | "absent" | "endommage";

export type SaisonnierInventaireLigne = {
  id: string;
  zone: string;
  label: string;
  status: InventaireStatut;
};

export type SaisonnierEdlPayload = {
  [SAISONNIER_EDL_MARK]: true;
  version: typeof SAISONNIER_EDL_VERSION;
  general: {
    nb_cles: number;
    compteur_eau: string;
    compteur_elec: string;
  };
  rooms: Record<SaisonnierRoomId, SaisonnierRoomState>;
  inventory: SaisonnierInventaireLigne[];
  voyageur_lu_et_approuve: boolean;
};

export const SAISONNIER_ROOM_META: { id: SaisonnierRoomId; label: string; optional: boolean }[] = [
  { id: "salon", label: "Salon / Séjour", optional: false },
  { id: "cuisine", label: "Cuisine", optional: false },
  { id: "chambre_1", label: "Chambre 1", optional: false },
  { id: "chambre_2", label: "Chambre 2", optional: true },
  { id: "salle_de_bain", label: "Salle de bain", optional: false },
  { id: "wc", label: "WC", optional: false },
  { id: "exterieur", label: "Extérieur / Terrasse", optional: true },
];

export function defaultInventoryLines(): SaisonnierInventaireLigne[] {
  const rows: Array<{ zone: string; label: string }> = [
    { zone: "Salon", label: "Canapé" },
    { zone: "Salon", label: "TV" },
    { zone: "Salon", label: "Table basse" },
    { zone: "Cuisine", label: "Réfrigérateur" },
    { zone: "Cuisine", label: "Micro-ondes" },
    { zone: "Cuisine", label: "Plaques de cuisson" },
    { zone: "Cuisine", label: "Four" },
    { zone: "Cuisine", label: "Vaisselle" },
    { zone: "Cuisine", label: "Couverts" },
    { zone: "Cuisine", label: "Verres" },
    { zone: "Chambre", label: "Lit" },
    { zone: "Chambre", label: "Matelas" },
    { zone: "Chambre", label: "Oreillers" },
    { zone: "Chambre", label: "Couvertures" },
    { zone: "Chambre", label: "Armoire" },
    { zone: "Salle de bain", label: "Serviettes" },
    { zone: "Salle de bain", label: "Sèche-cheveux" },
    { zone: "Général", label: "Aspirateur" },
    { zone: "Général", label: "Fer à repasser" },
    { zone: "Général", label: "Wifi (fonctionnel)" },
  ];
  return rows.map((r) => ({
    id: `${r.zone}-${r.label}`.replace(/\s+/g, "_").toLowerCase(),
    zone: r.zone,
    label: r.label,
    status: "present" as InventaireStatut,
  }));
}

function emptyRoom(enabled: boolean): SaisonnierRoomState {
  return {
    enabled,
    etat: "bon",
    observations: "",
    photoPaths: [],
  };
}

export function createDefaultSaisonnierPayload(): SaisonnierEdlPayload {
  const rooms = {
    salon: emptyRoom(true),
    cuisine: emptyRoom(true),
    chambre_1: emptyRoom(true),
    chambre_2: emptyRoom(false),
    salle_de_bain: emptyRoom(true),
    wc: emptyRoom(true),
    exterieur: emptyRoom(false),
  } satisfies Record<SaisonnierRoomId, SaisonnierRoomState>;

  return {
    [SAISONNIER_EDL_MARK]: true,
    version: SAISONNIER_EDL_VERSION,
    general: { nb_cles: 0, compteur_eau: "", compteur_elec: "" },
    rooms,
    inventory: defaultInventoryLines(),
    voyageur_lu_et_approuve: false,
  };
}

export function isSaisonnierEdlPayload(raw: unknown): raw is SaisonnierEdlPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return o[SAISONNIER_EDL_MARK] === true && o.version === SAISONNIER_EDL_VERSION;
}

export function parseSaisonnierPayload(raw: unknown): SaisonnierEdlPayload {
  if (isSaisonnierEdlPayload(raw)) {
    const def = createDefaultSaisonnierPayload();
    const r = raw.rooms;
    const mergedRooms = { ...def.rooms };
    for (const id of Object.keys(mergedRooms) as SaisonnierRoomId[]) {
      const cur = r[id];
      if (cur && typeof cur === "object") {
        const c = cur as SaisonnierRoomState;
        mergedRooms[id] = {
          enabled: typeof c.enabled === "boolean" ? c.enabled : mergedRooms[id].enabled,
          etat: c.etat === "moyen" || c.etat === "mauvais" ? c.etat : "bon",
          observations: typeof c.observations === "string" ? c.observations : "",
          photoPaths: Array.isArray(c.photoPaths)
            ? c.photoPaths.filter((p): p is string => typeof p === "string")
            : [],
        };
      }
    }
    const g = raw.general;
    const general =
      g && typeof g === "object"
        ? {
            nb_cles: Number((g as { nb_cles?: unknown }).nb_cles ?? def.general.nb_cles) || 0,
            compteur_eau: String((g as { compteur_eau?: unknown }).compteur_eau ?? ""),
            compteur_elec: String((g as { compteur_elec?: unknown }).compteur_elec ?? ""),
          }
        : def.general;
    let inventory = Array.isArray(raw.inventory)
      ? raw.inventory
          .map((line): SaisonnierInventaireLigne | null => {
            if (!line || typeof line !== "object") return null;
            const l = line as Record<string, unknown>;
            const status = l.status === "absent" || l.status === "endommage" ? l.status : "present";
            return {
              id: String(l.id ?? ""),
              zone: String(l.zone ?? ""),
              label: String(l.label ?? ""),
              status,
            };
          })
          .filter((x): x is SaisonnierInventaireLigne => x != null && x.id.length > 0)
      : [];
    if (inventory.length === 0) inventory = defaultInventoryLines();
    return {
      [SAISONNIER_EDL_MARK]: true,
      version: SAISONNIER_EDL_VERSION,
      general,
      rooms: mergedRooms,
      inventory,
      voyageur_lu_et_approuve: raw.voyageur_lu_et_approuve === true,
    };
  }
  return createDefaultSaisonnierPayload();
}
