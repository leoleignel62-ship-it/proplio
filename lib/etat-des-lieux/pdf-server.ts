import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePiecesData } from "./defaults";
import {
  collectPhotoPathsFromPieces,
  generateEdlPdfBuffer,
  type EdlPdfParams,
} from "@/lib/pdf/generate-edl-pdf";
import type { PiecesEdlData } from "./types";
import { getEdlTypeEtatFromRow } from "./edl-type-etat";

function parsePiecesData(row: Record<string, unknown>): PiecesEdlData {
  const meuble = row.type_logement === "meuble";
  const base = normalizePiecesData(row.pieces, meuble);
  const rowC = row.compteurs && typeof row.compteurs === "object" ? (row.compteurs as PiecesEdlData["compteurs"]) : null;
  return {
    ...base,
    compteurs: rowC
      ? {
          electricite: { ...base.compteurs.electricite, ...rowC.electricite },
          eauFroide: { ...base.compteurs.eauFroide, ...rowC.eauFroide },
          eauChaude: { ...base.compteurs.eauChaude, ...rowC.eauChaude },
          gaz: { ...base.compteurs.gaz, ...rowC.gaz },
        }
      : base.compteurs,
    clesRemises: Number(row.cles_remises ?? base.clesRemises) || 0,
    badgesRemis: Number(row.badges_remis ?? base.badgesRemis) || 0,
    observationsGenerales: String(row.observations ?? base.observationsGenerales ?? ""),
  };
}

export async function buildEdlPdfBufferFromDb(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  edl: Record<string, unknown>,
  proprietaire: Record<string, unknown>,
  signatureBytes: { bytes: Uint8Array; isPng: boolean } | null,
): Promise<Uint8Array> {
  const logementId = edl.logement_id as string | undefined;
  const locataireId = edl.locataire_id as string | undefined;
  const reservationId = edl.bail_id as string | undefined;

  const [logementRes, locataireRes, reservationRes] = await Promise.all([
    logementId
      ? supabase
          .from("logements")
          .select("id, adresse, code_postal, ville")
          .eq("id", logementId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    locataireId
      ? supabase.from("locataires").select("id, prenom, nom").eq("id", locataireId).maybeSingle()
      : Promise.resolve({ data: null }),
    reservationId
      ? supabase
          .from("reservations")
          .select("id, date_arrivee, date_depart, voyageurs(prenom, nom)")
          .eq("id", reservationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const logement = logementRes.data;
  const locataire = locataireRes.data;
  const reservation = reservationRes.data;

  const bailleurNom =
    `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—";
  const reservationVoyageur = Array.isArray((reservation as Record<string, unknown> | null)?.voyageurs)
    ? ((reservation as Record<string, unknown>).voyageurs as Array<Record<string, unknown>>)[0]
    : ((reservation as Record<string, unknown> | null)?.voyageurs as Record<string, unknown> | null);
  const preneurNom =
    `${(locataire as Record<string, unknown> | null)?.prenom ?? ""} ${(locataire as Record<string, unknown> | null)?.nom ?? ""}`.trim() ||
    `${String(reservationVoyageur?.prenom ?? "")} ${String(reservationVoyageur?.nom ?? "")}`.trim() ||
    "—";
  const logementAdresse = logement
    ? `${(logement as Record<string, unknown>).adresse ?? ""}, ${(logement as Record<string, unknown>).code_postal ?? ""} ${(logement as Record<string, unknown>).ville ?? ""}`.trim()
    : "—";

  const pieces = parsePiecesData(edl);
  const typeEtat = getEdlTypeEtatFromRow(edl);
  const dateEtat = edl.date_etat
    ? new Date(String(edl.date_etat)).toLocaleDateString("fr-FR")
    : "—";
  const typeLogement = edl.type_logement === "meuble" ? "meuble" : "vide";

  let entryPiecesJson: unknown | null = null;
  const entryId = edl.etat_entree_id as string | undefined;
  if (typeEtat === "sortie" && entryId) {
    const { data: ent } = await supabase
      .from("etats_des_lieux")
      .select("pieces, type_logement")
      .eq("id", entryId)
      .maybeSingle();
    if (ent) {
      entryPiecesJson = ent.pieces;
    }
  }

  const photoFiles = new Map<string, Uint8Array>();
  const paths = collectPhotoPathsFromPieces(pieces);
  const downloaded = await Promise.all(
    paths.map(async (path) => {
      const { data: blob, error } = await supabaseAdmin.storage.from("etats-des-lieux").download(path);
      if (error || !blob) return null;
      return [path, new Uint8Array(await blob.arrayBuffer())] as const;
    }),
  );
  for (const entry of downloaded) {
    if (entry) photoFiles.set(entry[0], entry[1]);
  }

  const isSaisonnier = Boolean(reservation && !locataire);
  const stayInfoLine =
    reservation && reservation.date_arrivee && reservation.date_depart
      ? `${new Date(String(reservation.date_arrivee)).toLocaleDateString("fr-FR")} → ${new Date(String(reservation.date_depart)).toLocaleDateString("fr-FR")}`
      : undefined;

  const params: EdlPdfParams = {
    typeEtat,
    dateEtat,
    typeLogement,
    bailleurNom,
    preneurNom,
    logementAdresse,
    piecesJson: pieces,
    compteursExtra: {
      clesRemises: pieces.clesRemises,
      badgesRemis: pieces.badgesRemis,
      observationsGenerales: pieces.observationsGenerales,
    },
    entryPiecesJson,
    signatureImage: signatureBytes,
    photoFiles,
    documentTitle: isSaisonnier
      ? `ÉTAT DES LIEUX - LOCATION SAISONNIÈRE\n${typeEtat === "entree" ? "ENTRÉE" : "SORTIE"}`
      : undefined,
    stayInfoLine,
  };

  return generateEdlPdfBuffer(params);
}
