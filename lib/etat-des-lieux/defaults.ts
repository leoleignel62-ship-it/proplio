import {
  type CompteursEdl,
  type ElementEdl,
  emptyElement,
  normalizeEtatNiveau,
  type PiecesEdlData,
  type RoomEdl,
} from "./types";

const SOL_TYPES = ["parquet", "carrelage", "moquette", "autre"] as const;

function structElementSol(): ElementEdl {
  const e = emptyElement();
  e.extra = { sousType: "parquet" };
  return e;
}

function addCommonStructural(elements: Record<string, ElementEdl>) {
  elements.murs = emptyElement();
  elements.plafond = emptyElement();
  elements.sol = structElementSol();
  elements.fenetres = emptyElement();
  elements.portes = emptyElement();
  elements.prises = emptyElement();
  elements.eclairage = emptyElement();
  elements.radiateur = emptyElement();
  elements.placards = emptyElement();
}

function mergeElements(
  base: Record<string, ElementEdl>,
  extra: Record<string, ElementEdl | (() => ElementEdl)>,
) {
  for (const [k, v] of Object.entries(extra)) {
    base[k] = typeof v === "function" ? v() : v;
  }
}

export function emptyCompteurs(): CompteursEdl {
  return {
    electricite: { index: "", photoPath: null },
    eauFroide: { index: "", photoPath: null },
    eauChaude: { index: "", photoPath: null },
    gaz: { index: "", photoPath: null },
  };
}

function roomEntree(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    sonnette_interphone: emptyElement(),
    boite_aux_lettres: emptyElement(),
    digicode: () => {
      const e = emptyElement();
      e.extra = { code: "" };
      return e;
    },
    miroir_entree: emptyElement(),
    patere: emptyElement(),
  });
  return { id: "entree", label: "Entrée / Couloir", elements };
}

function roomSalon(meuble: boolean): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  if (meuble) {
    mergeElements(elements, {
      canape: () => {
        const e = emptyElement();
        e.extra = { nombre: 1 };
        return e;
      },
      table_basse: emptyElement(),
      table_manger: emptyElement(),
      chaises: () => {
        const e = emptyElement();
        e.extra = { nombre: 4 };
        return e;
      },
      meuble_tv: emptyElement(),
      television: emptyElement(),
      etageres: emptyElement(),
      rideaux: emptyElement(),
      tapis: emptyElement(),
    });
  }
  return { id: "salon", label: "Salon / Séjour", elements };
}

function roomCuisine(meuble: boolean): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    plan_travail: emptyElement(),
    evier: emptyElement(),
    plaques: emptyElement(),
    four: emptyElement(),
    micro_onde: emptyElement(),
    hotte: emptyElement(),
    refrigerateur: emptyElement(),
    congelateur: emptyElement(),
    lave_vaisselle: emptyElement(),
    meubles_cuisine: emptyElement(),
    poubelle: emptyElement(),
  });
  if (meuble) {
    mergeElements(elements, {
      vaisselle: () => {
        const e = emptyElement();
        e.extra = { assiettes: 0, verres: 0, couverts: 0 };
        return e;
      },
      ustensiles: emptyElement(),
    });
  }
  return { id: "cuisine", label: "Cuisine", elements };
}

function roomSdb(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    baignoire_ou_douche: () => {
      const e = emptyElement();
      e.extra = { type: "douche" };
      return e;
    },
    robinetterie_bain: emptyElement(),
    lavabo: emptyElement(),
    robinetterie_lavabo: emptyElement(),
    miroir: emptyElement(),
    meuble_vasque: emptyElement(),
    porte_serviettes: emptyElement(),
    ventilation: emptyElement(),
    rideau_douche: emptyElement(),
    joints: emptyElement(),
    seche_serviettes: emptyElement(),
  });
  return { id: "sdb", label: "Salle de bain", elements };
}

function roomWc(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    cuvette: emptyElement(),
    abattant: emptyElement(),
    chasse: emptyElement(),
    robinet_arret: emptyElement(),
    ventilation_wc: emptyElement(),
  });
  return { id: "wc", label: "WC", elements };
}

function roomChambre(index: number, meuble: boolean): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  if (meuble) {
    mergeElements(elements, {
      lit: () => {
        const e = emptyElement();
        e.extra = { taille: "double" };
        return e;
      },
      matelas: emptyElement(),
      couette: emptyElement(),
      oreillers: emptyElement(),
      armoire: emptyElement(),
      commode: emptyElement(),
      bureau_chambre: emptyElement(),
      rideaux_occultants: emptyElement(),
      lampe_chevet: emptyElement(),
    });
  }
  return {
    id: `chambre_${index}`,
    label: index === 1 ? "Chambre 1" : `Chambre ${index}`,
    elements,
  };
}

function roomBureau(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    bureau: emptyElement(),
    chaise_bureau: emptyElement(),
    etageres_bureau: emptyElement(),
    prises_multi: emptyElement(),
  });
  return { id: "bureau", label: "Bureau", enabled: false, elements };
}

function roomCave(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    sol_cave: emptyElement(),
    murs_cave: emptyElement(),
    porte_cave: emptyElement(),
    eclairage_cave: emptyElement(),
    humidite: () => {
      const e = emptyElement();
      e.extra = { presence: false };
      return e;
    },
  });
  return { id: "cave", label: "Cave", enabled: false, elements };
}

function roomGarage(): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    porte_garage: () => {
      const e = emptyElement();
      e.extra = { type: "manuelle" };
      return e;
    },
    telecommandes: () => {
      const e = emptyElement();
      e.extra = { nombre: 1 };
      return e;
    },
    sol_garage: emptyElement(),
    eclairage_garage: emptyElement(),
    prises_garage: emptyElement(),
  });
  return { id: "garage", label: "Garage", enabled: false, elements };
}

function roomBalcon(meuble: boolean): RoomEdl {
  const elements: Record<string, ElementEdl> = {};
  addCommonStructural(elements);
  mergeElements(elements, {
    sol_exterieur: emptyElement(),
    rambarde: emptyElement(),
    porte_fenetre: emptyElement(),
  });
  if (meuble) {
    mergeElements(elements, {
      mobilier_jardin: emptyElement(),
      store: emptyElement(),
    });
  }
  return { id: "balcon", label: "Balcon / Terrasse", enabled: false, elements };
}

/** Première chambre toujours présente ; chambres supplémentaires via addChambre */
export function createInitialPiecesData(meuble: boolean, chambresCount = 1): PiecesEdlData {
  const rooms: RoomEdl[] = [
    roomEntree(),
    roomSalon(meuble),
    roomCuisine(meuble),
    roomSdb(),
    roomWc(),
  ];
  const n = Math.max(1, Math.min(10, chambresCount));
  for (let i = 1; i <= n; i++) {
    rooms.push(roomChambre(i, meuble));
  }
  rooms.push(roomBureau(), roomCave(), roomGarage(), roomBalcon(meuble));
  return {
    version: 1,
    rooms,
    compteurs: emptyCompteurs(),
    clesRemises: 0,
    badgesRemis: 0,
    observationsGenerales: "",
  };
}

export function addChambreToPieces(data: PiecesEdlData, meuble: boolean): PiecesEdlData {
  const chambres = data.rooms.filter((r) => r.id.startsWith("chambre_"));
  const next = chambres.length + 1;
  if (next > 10) return data;
  const idx = data.rooms.findIndex((r) => r.id === "bureau");
  const insertAt = idx === -1 ? data.rooms.length : idx;
  const nextRooms = [...data.rooms];
  nextRooms.splice(insertAt, 0, roomChambre(next, meuble));
  return { ...data, rooms: nextRooms };
}

/** Fusionne données chargées avec structure attendue (nouvelles clés) */
export function normalizePiecesData(raw: unknown, meuble: boolean): PiecesEdlData {
  const fresh = createInitialPiecesData(meuble, 1);
  if (!raw || typeof raw !== "object") return fresh;
  const o = raw as Partial<PiecesEdlData>;
  if (o.version !== 1 || !Array.isArray(o.rooms)) return fresh;

  const byId = new Map(fresh.rooms.map((r) => [r.id, r]));
  const mergedRooms: RoomEdl[] = o.rooms.map((loaded) => {
    const def = byId.get(loaded.id);
    if (!def) {
      return loaded as RoomEdl;
    }
    const elements = { ...def.elements };
    if (loaded.elements) {
      for (const [key, el] of Object.entries(loaded.elements)) {
        if (elements[key] && el && typeof el === "object") {
          const le = el as ElementEdl;
          elements[key] = {
            state: normalizeEtatNiveau(le.state ?? elements[key].state),
            comment: le.comment ?? "",
            photoPath: le.photoPath ?? null,
            extra: { ...elements[key].extra, ...(le.extra ?? {}) },
          };
        }
      }
    }
    return {
      id: loaded.id,
      label: loaded.label || def.label,
      enabled: loaded.enabled ?? def.enabled,
      elements,
    };
  });

  // Réinjecte pièces manquantes depuis fresh (optionnelles désactivées)
  const ids = new Set(mergedRooms.map((r) => r.id));
  for (const r of fresh.rooms) {
    if (!ids.has(r.id)) mergedRooms.push({ ...r, elements: { ...r.elements } });
  }

  const compteurs = { ...fresh.compteurs, ...(o.compteurs ?? {}) };
  for (const k of Object.keys(fresh.compteurs) as (keyof CompteursEdl)[]) {
    const c = compteurs[k];
    if (!c || typeof c !== "object") {
      compteurs[k] = fresh.compteurs[k];
    } else {
      compteurs[k] = {
        index: String((c as { index?: string }).index ?? ""),
        photoPath: (c as { photoPath?: string | null }).photoPath ?? null,
      };
    }
  }

  const roomsSanitized: RoomEdl[] = mergedRooms.map((r) => ({
    ...r,
    elements: Object.fromEntries(
      Object.entries(r.elements).map(([key, el]) => [
        key,
        { ...el, state: normalizeEtatNiveau(el.state) },
      ]),
    ) as Record<string, ElementEdl>,
  }));

  return {
    version: 1,
    rooms: roomsSanitized,
    compteurs: compteurs as CompteursEdl,
    clesRemises: Number(o.clesRemises ?? fresh.clesRemises) || 0,
    badgesRemis: Number(o.badgesRemis ?? fresh.badgesRemis) || 0,
    observationsGenerales: String(o.observationsGenerales ?? ""),
  };
}

export { SOL_TYPES };

export const ELEMENT_LABELS: Record<string, string> = {
  murs: "Murs / Peinture",
  plafond: "Plafond",
  sol: "Sol",
  fenetres: "Fenêtres / Volets",
  portes: "Porte(s) / Poignées",
  prises: "Prises / Interrupteurs",
  eclairage: "Éclairage / Luminaires",
  radiateur: "Radiateur / Chauffage",
  placards: "Placards / Rangements",
  sonnette_interphone: "Sonnette / Interphone",
  boite_aux_lettres: "Boîte aux lettres",
  digicode: "Digicode",
  miroir_entree: "Miroir entrée",
  patere: "Patère / Porte-manteau",
  canape: "Canapé",
  table_basse: "Table basse",
  table_manger: "Table à manger",
  chaises: "Chaises",
  meuble_tv: "Meuble TV",
  television: "Télévision",
  etageres: "Étagères / Bibliothèque",
  rideaux: "Rideaux / Voilages",
  tapis: "Tapis",
  plan_travail: "Plan de travail",
  evier: "Évier / Robinetterie",
  plaques: "Plaques de cuisson",
  four: "Four",
  micro_onde: "Micro-ondes",
  hotte: "Hotte aspirante",
  refrigerateur: "Réfrigérateur",
  congelateur: "Congélateur",
  lave_vaisselle: "Lave-vaisselle",
  meubles_cuisine: "Meubles de cuisine",
  vaisselle: "Vaisselle",
  ustensiles: "Ustensiles de cuisine",
  poubelle: "Poubelle",
  baignoire_ou_douche: "Baignoire ou douche",
  robinetterie_bain: "Robinetterie bain/douche",
  lavabo: "Lavabo",
  robinetterie_lavabo: "Robinetterie lavabo",
  miroir: "Miroir",
  meuble_vasque: "Meuble vasque",
  porte_serviettes: "Porte-serviettes",
  ventilation: "Ventilation / VMC",
  rideau_douche: "Rideau de douche / Paroi",
  joints: "Joints",
  seche_serviettes: "Sèche-serviettes",
  cuvette: "Cuvette WC",
  abattant: "Abattant",
  chasse: "Chasse d'eau",
  robinet_arret: "Robinet d'arrêt",
  ventilation_wc: "Ventilation",
  lit: "Lit",
  matelas: "Matelas",
  couette: "Couette / Couverture",
  oreillers: "Oreillers",
  armoire: "Armoire / Penderie",
  commode: "Commode / Chiffonnier",
  bureau_chambre: "Bureau et chaise",
  rideaux_occultants: "Rideaux / Volets occultants",
  lampe_chevet: "Lampe de chevet",
  bureau: "Bureau",
  chaise_bureau: "Chaise de bureau",
  etageres_bureau: "Étagères",
  prises_multi: "Prises / Multiprises",
  sol_cave: "Sol cave",
  murs_cave: "Murs cave",
  porte_cave: "Porte cave (serrure)",
  eclairage_cave: "Éclairage cave",
  humidite: "Humidité (présence)",
  porte_garage: "Porte de garage",
  telecommandes: "Télécommande(s)",
  sol_garage: "Sol garage",
  eclairage_garage: "Éclairage garage",
  prises_garage: "Prises garage",
  sol_exterieur: "Sol extérieur",
  rambarde: "Rambarde / Balustrade",
  porte_fenetre: "Porte-fenêtre",
  mobilier_jardin: "Mobilier de jardin",
  store: "Store / Parasol",
};
