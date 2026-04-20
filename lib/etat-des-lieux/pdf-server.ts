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

  const { data: logement } = logementId
    ? await supabase.from("logements").select("*").eq("id", logementId).maybeSingle()
    : { data: null };
  const { data: locataire } = locataireId
    ? await supabase.from("locataires").select("*").eq("id", locataireId).maybeSingle()
    : { data: null };

  const bailleurNom =
    `${proprietaire.prenom ?? ""} ${proprietaire.nom ?? ""}`.trim() || "—";
  const preneurNom =
    `${(locataire as Record<string, unknown> | null)?.prenom ?? ""} ${(locataire as Record<string, unknown> | null)?.nom ?? ""}`.trim() ||
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
  for (const path of paths) {
    const { data: blob, error } = await supabaseAdmin.storage.from("etats-des-lieux").download(path);
    if (!error && blob) {
      photoFiles.set(path, new Uint8Array(await blob.arrayBuffer()));
    }
  }

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
  };

  return generateEdlPdfBuffer(params);
}
