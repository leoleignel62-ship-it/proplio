import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SAISONNIER_ROOM_META,
  parseSaisonnierPayload,
  type SaisonnierRoomId,
} from "@/lib/etat-des-lieux/saisonnier-edl-data";
import { generateEdlSaisonnierPdfBuffer } from "@/lib/pdf/generate-edl-saisonnier-pdf";

/** PDF saisonnier : réservation liée ou payload marqué. */
export function rowUsesSaisonnierPdf(edl: Record<string, unknown>): boolean {
  if (edl.reservation_id != null && String(edl.reservation_id).length > 0) return true;
  const p = edl.pieces;
  if (!p || typeof p !== "object") return false;
  return (p as Record<string, unknown>)._proplio_saisonnier === true;
}

export async function buildSaisonnierEdlPdfBufferFromDb(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  edl: Record<string, unknown>,
  proprietaire: Record<string, unknown>,
  signatureBytes: { bytes: Uint8Array; isPng: boolean } | null,
): Promise<Uint8Array> {
  const reservationId =
    (edl.reservation_id as string | undefined) ?? (edl.bail_id as string | undefined);
  const logementId = edl.logement_id as string | undefined;
  const typeRaw = String(edl.type ?? edl.type_etat ?? "entree").toLowerCase();
  const typeEtat = typeRaw === "sortie" ? "sortie" : "entree";
  const dateEtat = String(edl.date_etat ?? "");

  const payload = parseSaisonnierPayload(edl.pieces);

  const [resaRes, logRes] = await Promise.all([
    reservationId
      ? supabase
          .from("reservations")
          .select("id, date_arrivee, date_depart, voyageurs(prenom, nom, email, nationalite)")
          .eq("id", reservationId)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
    logementId
      ? supabase
          .from("logements")
          .select("adresse, code_postal, ville")
          .eq("id", logementId)
          .maybeSingle()
      : Promise.resolve({ data: null as Record<string, unknown> | null }),
  ]);

  const resa = resaRes.data as Record<string, unknown> | null;
  const log = logRes.data as Record<string, unknown> | null;
  const vgRaw = resa?.voyageurs;
  const vg = Array.isArray(vgRaw) ? (vgRaw[0] as Record<string, unknown>) : (vgRaw as Record<string, unknown> | null);

  const preneurNom = `${String(vg?.prenom ?? "")} ${String(vg?.nom ?? "")}`.trim() || "—";
  const logementAdresse = log
    ? `${String(log.adresse ?? "")}, ${String(log.code_postal ?? "")} ${String(log.ville ?? "")}`.trim()
    : "—";

  const sejourDebut = resa?.date_arrivee
    ? new Date(String(resa.date_arrivee)).toLocaleDateString("fr-FR")
    : "—";
  const sejourFin = resa?.date_depart
    ? new Date(String(resa.date_depart)).toLocaleDateString("fr-FR")
    : "—";

  const bailleurNom = `${String(proprietaire.prenom ?? "")} ${String(proprietaire.nom ?? "")}`.trim() || "—";
  const adresseParts = [
    [proprietaire.adresse, proprietaire.code_postal, proprietaire.ville]
      .filter(Boolean)
      .map(String)
      .join(" ")
      .trim(),
  ].filter(Boolean);

  const allPaths: string[] = [];
  for (const meta of SAISONNIER_ROOM_META) {
    const st = payload.rooms[meta.id as SaisonnierRoomId];
    const included = !meta.optional || st?.enabled === true;
    if (included) for (const p of st?.photoPaths ?? []) allPaths.push(p);
  }
  const uniquePaths = [...new Set(allPaths)];
  const downloaded = await Promise.all(
    uniquePaths.map(async (path) => {
      const { data: blob, error } = await supabaseAdmin.storage.from("etats-des-lieux").download(path);
      if (error || !blob) return [path, null] as const;
      return [path, new Uint8Array(await blob.arrayBuffer())] as const;
    }),
  );
  const bytesByPath = new Map<string, Uint8Array>();
  for (const [path, b] of downloaded) {
    if (b) bytesByPath.set(path, b);
  }

  const roomsForPdf = SAISONNIER_ROOM_META.filter((meta) => {
    const st = payload.rooms[meta.id as SaisonnierRoomId];
    return !meta.optional || st?.enabled === true;
  }).map((meta) => {
    const st = payload.rooms[meta.id as SaisonnierRoomId]!;
    const files = (st.photoPaths ?? []).map((p) => bytesByPath.get(p)).filter((b): b is Uint8Array => Boolean(b));
    return {
      label: meta.label,
      etat: st.etat,
      observations: st.observations,
      photoFiles: files,
    };
  });

  const cles = Number(edl.cles_remises ?? payload.general.nb_cles) || 0;

  return generateEdlSaisonnierPdfBuffer({
    typeEtat,
    dateEtatIso: dateEtat,
    bailleur: {
      nom: bailleurNom,
      adresseLignes: adresseParts.length ? adresseParts : ["—"],
      email: String(proprietaire.email ?? "").trim(),
      telephone: String(proprietaire.telephone ?? "").trim(),
    },
    preneur: {
      nom: preneurNom,
      email: String(vg?.email ?? "").trim(),
      nationalite: String(vg?.nationalite ?? "").trim(),
    },
    logementAdresse,
    sejourDebut,
    sejourFin,
    clesRemises: cles,
    compteurEau: payload.general.compteur_eau,
    compteurElec: payload.general.compteur_elec,
    rooms: roomsForPdf,
    inventory: payload.inventory.map((r) => ({
      zone: r.zone,
      label: r.label,
      status: r.status,
    })),
    signatureImage: signatureBytes,
  });
}
