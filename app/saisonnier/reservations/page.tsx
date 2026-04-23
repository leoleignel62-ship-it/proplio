"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";
import { calculerMontantReservation } from "@/lib/saisonnier-tarifs";

type LogementOption = {
  id: string;
  nom: string;
  tarifs_creneaux: unknown;
  tarif_nuit_defaut: number | null;
  tarif_nuit_moyenne: number | null;
  tarif_menage: number | null;
  tarif_caution: number | null;
  taxe_sejour_nuit: number | null;
  ical_airbnb_url: string | null;
  ical_booking_url: string | null;
};

type ReservationRow = {
  id: string;
  logement_id: string;
  voyageur_id: string | null;
  date_arrivee: string;
  date_depart: string;
  heure_arrivee: string;
  heure_depart: string;
  nb_voyageurs: number;
  nb_nuits: number | null;
  tarif_nuit: number;
  tarif_total: number;
  tarif_menage: number;
  menage_inclus: boolean;
  tarif_caution: number;
  montant_acompte: number;
  taxe_sejour_total: number;
  statut: string;
  source: string;
  notes: string | null;
  contrat_envoye: boolean | null;
  logements?: { nom: string } | null;
  voyageurs?: { prenom: string; nom: string; email: string | null } | null;
};

const STATUT_COLOR: Record<string, string> = {
  en_attente: PC.warning,
  confirmee: PC.primary,
  en_cours: PC.success,
  terminee: PC.muted,
  annulee: PC.danger,
};

function ResaActionPill({
  children,
  onClick,
  variant,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void | Promise<void>;
  variant: "green" | "red" | "redOutline" | "violet" | "violetOutline" | "grey";
  disabled?: boolean;
}) {
  const base =
    "rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";
  const style: CSSProperties =
    variant === "green"
      ? { backgroundColor: "#16a34a", color: "#fff", border: "none" }
      : variant === "red"
        ? { backgroundColor: "#dc2626", color: "#fff", border: "none" }
        : variant === "redOutline"
          ? {
              backgroundColor: "transparent",
              color: "#dc2626",
              border: "1px solid rgba(220, 38, 38, 0.65)",
            }
          : variant === "violet"
            ? { backgroundColor: "#7c3aed", color: "#fff", border: "none" }
            : variant === "violetOutline"
              ? { backgroundColor: "transparent", color: "#a78bfa", border: "1px solid rgba(167, 139, 250, 0.55)" }
              : { backgroundColor: "rgba(148, 163, 184, 0.2)", color: PC.muted, border: `1px solid ${PC.border}` };
  return (
    <button type="button" className={base} style={style} disabled={disabled} onClick={() => void onClick()}>
      {children}
    </button>
  );
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

function logementTarifPayload(lg: LogementOption) {
  return {
    tarifs_creneaux: lg.tarifs_creneaux,
    tarif_nuit_defaut: lg.tarif_nuit_defaut,
    tarif_nuit_moyenne: lg.tarif_nuit_moyenne,
  };
}

export default function ReservationsSaisonnierPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [voyageurs, setVoyageurs] = useState<Array<{ id: string; prenom: string; nom: string; email: string | null }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [acomptePct, setAcomptePct] = useState(30);
  const [toast, setToast] = useState<string | null>(null);
  const [editingMontantId, setEditingMontantId] = useState<string | null>(null);
  const [editingMontantValue, setEditingMontantValue] = useState("");
  const montantInputRef = useRef<HTMLInputElement | null>(null);
  const [detailPrixReel, setDetailPrixReel] = useState("");
  const [detailSaving, setDetailSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteOtaConfirmId, setDeleteOtaConfirmId] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [sendConfirm, setSendConfirm] = useState<{
    kind: "contrat" | "acompte" | "solde";
    id: string;
    email: string;
  } | null>(null);
  const [sendSubmitting, setSendSubmitting] = useState(false);

  const [form, setForm] = useState({
    logement_id: "",
    voyageur_id: "",
    date_arrivee: "",
    date_depart: "",
    heure_arrivee: "15:00",
    heure_depart: "11:00",
    nb_voyageurs: "1",
    source: "direct",
    notes: "",
    menage_inclus: true,
  });
  const [tarifManuelAirbnb, setTarifManuelAirbnb] = useState("");

  const load = useCallback(async () => {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setLoading(false);
      return;
    }
    const p = await getOwnerPlan(proprietaireId);
    setPlan(p);
    if (p === "free") {
      setLoading(false);
      return;
    }
    setError("");
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, logements(nom), voyageurs(prenom, nom, email)")
        .eq("proprietaire_id", proprietaireId)
        .order("date_arrivee", { ascending: true }),
      supabase
        .from("logements")
        .select(
          "id, nom, tarifs_creneaux, tarif_nuit_defaut, tarif_nuit_moyenne, tarif_menage, tarif_caution, taxe_sejour_nuit, ical_airbnb_url, ical_booking_url, type_location",
        )
        .eq("proprietaire_id", proprietaireId),
      supabase.from("voyageurs").select("id, prenom, nom, email").eq("proprietaire_id", proprietaireId).order("nom"),
    ]);
    const errParts: string[] = [];
    if (r1.error) errParts.push(formatSubmitError(r1.error));
    if (r2.error) errParts.push(formatSubmitError(r2.error));
    if (r3.error) errParts.push(formatSubmitError(r3.error));
    if (errParts.length) setError(errParts.join(" — "));
    const raw = (r1.data ?? []) as Record<string, unknown>[];
    const normalized: ReservationRow[] = raw.map((r) => {
      const lg = r.logements;
      const vg = r.voyageurs;
      const logementsJoin = Array.isArray(lg) ? (lg[0] as { nom?: string }) ?? null : (lg as { nom?: string } | null);
      const voyageursJoin = Array.isArray(vg)
        ? (vg[0] as { prenom?: string; nom?: string; email?: string | null }) ?? null
        : (vg as { prenom?: string; nom?: string; email?: string | null } | null);
      return {
        id: String(r.id),
        logement_id: String(r.logement_id),
        voyageur_id: (r.voyageur_id as string | null) ?? null,
        date_arrivee: String(r.date_arrivee),
        date_depart: String(r.date_depart),
        heure_arrivee: String((r as { heure_arrivee?: string }).heure_arrivee ?? "15:00"),
        heure_depart: String((r as { heure_depart?: string }).heure_depart ?? "11:00"),
        nb_voyageurs: Number(r.nb_voyageurs ?? 1),
        nb_nuits: r.nb_nuits != null ? Number(r.nb_nuits) : null,
        tarif_nuit: Number(r.tarif_nuit ?? 0),
        tarif_total: Number(r.tarif_total ?? 0),
        tarif_menage: Number(r.tarif_menage ?? 0),
        menage_inclus: (r as { menage_inclus?: boolean }).menage_inclus !== false,
        tarif_caution: Number(r.tarif_caution ?? 0),
        montant_acompte: Number(r.montant_acompte ?? 0),
        taxe_sejour_total: Number(r.taxe_sejour_total ?? 0),
        statut: String(r.statut ?? ""),
        source: String(r.source ?? "direct"),
        notes: (r.notes as string | null) ?? null,
        contrat_envoye: (r.contrat_envoye as boolean | null) ?? null,
        logements: logementsJoin ? { nom: String(logementsJoin.nom ?? "") } : null,
        voyageurs: voyageursJoin
          ? {
              prenom: String(voyageursJoin.prenom ?? ""),
              nom: String(voyageursJoin.nom ?? ""),
              email: (voyageursJoin.email as string | null) ?? null,
            }
          : null,
      };
    });
    setRows(normalized);
    const logRowsRaw = (r2.data ?? []) as Record<string, unknown>[];
    const logSaisonnier = logRowsRaw.filter((row) => {
      const t = (row.type_location as string | null | undefined) ?? "classique";
      return t === "saisonnier" || t === "les_deux";
    });
    setLogements(
      logSaisonnier
        .map((row) => ({
          id: String(row.id),
          nom: String(row.nom ?? "").trim() || "Logement sans nom",
          tarifs_creneaux: row.tarifs_creneaux ?? [],
          tarif_nuit_defaut: row.tarif_nuit_defaut != null ? Number(row.tarif_nuit_defaut) : null,
          tarif_nuit_moyenne: row.tarif_nuit_moyenne != null ? Number(row.tarif_nuit_moyenne) : null,
          tarif_menage: row.tarif_menage != null ? Number(row.tarif_menage) : null,
          tarif_caution: row.tarif_caution != null ? Number(row.tarif_caution) : null,
          taxe_sejour_nuit: row.taxe_sejour_nuit != null ? Number(row.taxe_sejour_nuit) : null,
          ical_airbnb_url: (row.ical_airbnb_url as string | null) ?? null,
          ical_booking_url: (row.ical_booking_url as string | null) ?? null,
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" })),
    );
    setVoyageurs((r3.data as Array<{ id: string; prenom: string; nom: string; email: string | null }>) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (editingMontantId) montantInputRef.current?.focus();
  }, [editingMontantId]);

  useEffect(() => {
    if (!detailId) {
      setDetailPrixReel("");
      return;
    }
    const r = rows.find((x) => x.id === detailId);
    if (r) setDetailPrixReel(String(r.tarif_total));
  }, [detailId, rows]);

  /** Évite un <select> contrôlé avec une valeur absente des options (affichage vide). */
  useEffect(() => {
    if (!modalOpen || logements.length === 0) return;
    setForm((f) => {
      if (logements.some((l) => l.id === f.logement_id)) return f;
      return { ...f, logement_id: logements[0]!.id };
    });
  }, [modalOpen, logements]);

  const showIcalPrixInfo = useMemo(
    () =>
      logements.some(
        (l) => String(l.ical_airbnb_url ?? "").trim().length > 0 || String(l.ical_booking_url ?? "").trim().length > 0,
      ),
    [logements],
  );

  const preview = useMemo(() => {
    const arr = form.date_arrivee;
    const dep = form.date_depart;
    if (!arr || !dep || dep <= arr) return { nuits: 0, nuitees: 0, menage: 0, taxe: 0, caution: 0, total: 0, acompte: 0 };
    const nuits = daysBetween(arr, dep);
    const lg = logements.find((l) => l.id === form.logement_id);
    const nuitees =
      form.source === "direct" && lg
        ? calculerMontantReservation(logementTarifPayload(lg), arr, dep)
        : Math.max(0, Number(tarifManuelAirbnb) || 0) * nuits;
    const menageLogement = lg?.tarif_menage != null ? Number(lg.tarif_menage) : 0;
    const menage = form.menage_inclus ? menageLogement : 0;
    const caution = lg?.tarif_caution != null ? Number(lg.tarif_caution) : 0;
    const taxeN = lg?.taxe_sejour_nuit != null ? Number(lg.taxe_sejour_nuit) : 0;
    const nv = Math.max(1, Number(form.nb_voyageurs) || 1);
    const taxe = taxeN * nv * nuits;
    const baseAcompte = nuitees + menage + taxe;
    const total = baseAcompte + caution;
    const acompte = (baseAcompte * acomptePct) / 100;
    return { nuits, nuitees, menage, taxe, caution, total, acompte };
  }, [form, logements, acomptePct, tarifManuelAirbnb]);

  function openModal() {
    const first = logements[0];
    setForm({
      logement_id: first?.id ?? "",
      voyageur_id: "",
      date_arrivee: "",
      date_depart: "",
      heure_arrivee: "15:00",
      heure_depart: "11:00",
      nb_voyageurs: "1",
      source: "direct",
      notes: "",
      menage_inclus: true,
    });
    setTarifManuelAirbnb("");
    setModalOpen(true);
  }

  function onLogementPick(id: string) {
    setForm((f) => ({
      ...f,
      logement_id: id,
    }));
  }

  async function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { proprietaireId, error: ownerErr } = await getCurrentProprietaireId();
    if (ownerErr || !proprietaireId) return;
    const voyageurId = form.voyageur_id.trim() || null;
    if (!voyageurId) {
      setError("Sélectionnez un voyageur. Créez un profil depuis la page Voyageurs si besoin.");
      return;
    }
    if (!form.logement_id || !form.date_arrivee || !form.date_depart) {
      setError("Renseignez logement et dates.");
      return;
    }
    const nuits = daysBetween(form.date_arrivee, form.date_depart);
    if (nuits <= 0) {
      setError("La date de départ doit être après l’arrivée.");
      return;
    }
    const lg = logements.find((l) => l.id === form.logement_id);
    if (!lg) {
      setError("Logement introuvable.");
      return;
    }
    const menageFromLogement = lg?.tarif_menage != null ? Number(lg.tarif_menage) : 0;
    const menageFacture = form.menage_inclus ? menageFromLogement : 0;
    const caution = lg?.tarif_caution != null ? Number(lg.tarif_caution) : 0;
    const taxeN = lg?.taxe_sejour_nuit != null ? Number(lg.taxe_sejour_nuit) : 0;
    const nv = Math.max(1, Number(form.nb_voyageurs) || 1);
    let tarifTotal: number;
    let tn: number;
    if (form.source === "direct") {
      tarifTotal = calculerMontantReservation(logementTarifPayload(lg), form.date_arrivee, form.date_depart);
      tn = nuits > 0 ? Math.round((tarifTotal / nuits) * 100) / 100 : 0;
    } else {
      const tnm = Number(tarifManuelAirbnb);
      if (!Number.isFinite(tnm) || tnm < 0) {
        setError("Renseignez un tarif / nuit pour cette source.");
        return;
      }
      tn = tnm;
      tarifTotal = nuits * tn;
    }
    const taxeTotal = taxeN * nv * nuits;
    const totalTtc = tarifTotal + menageFacture + taxeTotal + caution;
    const baseAcompte = tarifTotal + menageFacture + taxeTotal;
    const acompte = (baseAcompte * acomptePct) / 100;

    const { data: ins, error: iErr } = await supabase
      .from("reservations")
      .insert({
        proprietaire_id: proprietaireId,
        logement_id: form.logement_id,
        voyageur_id: voyageurId,
        date_arrivee: form.date_arrivee,
        date_depart: form.date_depart,
        heure_arrivee: form.heure_arrivee || "15:00",
        heure_depart: form.heure_depart || "11:00",
        nb_voyageurs: nv,
        tarif_nuit: tn,
        tarif_total: tarifTotal,
        tarif_menage: menageFacture,
        menage_inclus: form.menage_inclus,
        tarif_caution: caution,
        montant_acompte: Math.round(acompte * 100) / 100,
        taxe_sejour_total: taxeTotal,
        statut: form.source === "direct" ? "confirmee" : "en_attente",
        source: form.source,
        notes: form.notes.trim() || null,
      })
      .select("id")
      .single();
    if (iErr || !ins) {
      setError(formatSubmitError(iErr));
      return;
    }
    if (taxeTotal > 0) {
      const d = new Date(`${form.date_arrivee}T12:00:00`);
      await supabase.from("taxes_sejour").insert({
        proprietaire_id: proprietaireId,
        reservation_id: ins.id as string,
        logement_id: form.logement_id,
        montant: taxeTotal,
        nb_personnes: nv,
        nb_nuits: nuits,
        tarif_par_personne_nuit: taxeN,
        mois: d.getMonth() + 1,
        annee: d.getFullYear(),
      });
    }
    setModalOpen(false);
    void load();
  }

  async function saveTarifTotalReservation(id: string, valueStr: string) {
    const v = Number(valueStr);
    if (!Number.isFinite(v) || v < 0) {
      setEditingMontantId(null);
      return;
    }
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    const row = rows.find((r) => r.id === id);
    const nuits = row ? daysBetween(row.date_arrivee, row.date_depart) : 0;
    const tarif_nuit = nuits > 0 ? Math.round((v / nuits) * 100) / 100 : 0;
    const { error: uErr } = await supabase
      .from("reservations")
      .update({ tarif_total: v, tarif_nuit })
      .eq("id", id)
      .eq("proprietaire_id", proprietaireId);
    if (!uErr) {
      setToast("Prix mis à jour");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, tarif_total: v, tarif_nuit } : r)));
    } else {
      setError(formatSubmitError(uErr));
    }
    setEditingMontantId(null);
  }

  async function saveDetailPrixReel() {
    if (!detailId) return;
    const v = Number(detailPrixReel);
    if (!Number.isFinite(v) || v < 0) return;
    setDetailSaving(true);
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setDetailSaving(false);
      return;
    }
    const row = rows.find((r) => r.id === detailId);
    const nuits = row ? daysBetween(row.date_arrivee, row.date_depart) : 0;
    const tarif_nuit = nuits > 0 ? Math.round((v / nuits) * 100) / 100 : 0;
    const { error: uErr } = await supabase
      .from("reservations")
      .update({ tarif_total: v, tarif_nuit })
      .eq("id", detailId)
      .eq("proprietaire_id", proprietaireId);
    setDetailSaving(false);
    if (!uErr) {
      setToast("Prix mis à jour");
      setRows((prev) => prev.map((r) => (r.id === detailId ? { ...r, tarif_total: v, tarif_nuit } : r)));
    } else {
      setError(formatSubmitError(uErr));
    }
  }

  async function setStatut(id: string, statut: string) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("reservations").update({ statut }).eq("id", id).eq("proprietaire_id", proprietaireId);
    void load();
  }

  async function deleteReservationPermanently(id: string): Promise<boolean> {
    setDeleteSubmitting(true);
    setError("");
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setDeleteSubmitting(false);
      return false;
    }
    const { error: dErr } = await supabase
      .from("reservations")
      .delete()
      .eq("id", id)
      .eq("proprietaire_id", proprietaireId);
    setDeleteSubmitting(false);
    if (dErr) {
      setError(formatSubmitError(dErr));
      return false;
    }
    if (detailId === id) setDetailId(null);
    void load();
    return true;
  }

  async function confirmDeleteReservation() {
    if (!deleteConfirmId) return;
    const ok = await deleteReservationPermanently(deleteConfirmId);
    if (ok) setDeleteConfirmId(null);
  }

  async function confirmDeleteOtaFromProplio() {
    if (!deleteOtaConfirmId) return;
    const ok = await deleteReservationPermanently(deleteOtaConfirmId);
    if (ok) setDeleteOtaConfirmId(null);
  }

  async function sendApi(kind: "contrat" | "acompte" | "solde", id: string): Promise<boolean> {
    setError("");
    const res = await fetch(`/api/saisonnier/reservations/${id}/send-${kind}`, { method: "POST" });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Erreur envoi");
      return false;
    }
    void load();
    return true;
  }

  function requestSendConfirm(kind: "contrat" | "acompte" | "solde", row: ReservationRow) {
    const email = row.voyageurs?.email?.trim();
    if (!email) {
      setError("Le voyageur doit avoir une adresse e-mail.");
      return;
    }
    setSendConfirm({ kind, id: row.id, email });
  }

  async function confirmSendReservation() {
    if (!sendConfirm) return;
    setSendSubmitting(true);
    const ok = await sendApi(sendConfirm.kind, sendConfirm.id);
    setSendSubmitting(false);
    if (ok) setSendConfirm(null);
  }

  async function markMenageDone(reservationId: string, logementId: string) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("menages").insert({
      proprietaire_id: proprietaireId,
      reservation_id: reservationId,
      logement_id: logementId,
      statut: "termine",
      checklist: [],
    });
    void load();
  }

  if (loading) {
    return (
      <section className="proplio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (plan === "free") {
    return <PlanFreeModuleUpsell variant="saisonnier" />;
  }

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="proplio-page-title">Réservations</h1>
          <p className="proplio-page-subtitle">Location saisonnière — liste des réservations.</p>
        </div>
        <button type="button" className="proplio-btn-primary px-4 py-2 text-sm" onClick={openModal} disabled={logements.length === 0}>
          Nouvelle réservation
        </button>
      </div>
      {logements.length === 0 ? (
        <p className="text-sm" style={{ color: PC.warning }}>
          Aucun logement en mode saisonnier ou « les deux ». Configurez un logement dans l’espace saisonnier.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {showIcalPrixInfo ? (
        <div
          className="flex gap-3 rounded-xl p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: "rgba(251, 146, 60, 0.12)",
            border: `1px solid rgba(251, 146, 60, 0.35)`,
            color: PC.text,
          }}
        >
          <span className="shrink-0 text-xl" aria-hidden>
            ℹ️
          </span>
          <div>
            <p className="font-semibold" style={{ color: "#fb923c" }}>
              Prix des réservations Airbnb/Booking
            </p>
            <p className="mt-2" style={{ color: PC.muted }}>
              Airbnb et Booking ne communiquent pas les prix via la synchronisation de calendrier. Les réservations importées affichent une estimation basée sur vos tarifs configurés. Pour un suivi précis, renseignez le prix réel directement sur chaque réservation.
            </p>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
          style={{ backgroundColor: PC.success, color: PC.white }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}`, color: PC.muted }}>
        Vue calendrier disponible prochainement
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${PC.border}` }}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead style={{ backgroundColor: PC.card, color: PC.muted }}>
            <tr>
              <th className="px-3 py-2">Logement</th>
              <th className="px-3 py-2">Voyageur</th>
              <th className="px-3 py-2">Arrivée</th>
              <th className="px-3 py-2">Départ</th>
              <th className="px-3 py-2">Nuits</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${PC.border}` }}>
                <td className="px-3 py-2">{row.logements?.nom}</td>
                <td className="px-3 py-2" style={{ color: PC.muted }}>
                  {row.voyageurs ? `${row.voyageurs.prenom} ${row.voyageurs.nom}` : "—"}
                </td>
                <td className="px-3 py-2">{row.date_arrivee}</td>
                <td className="px-3 py-2">{row.date_depart}</td>
                <td className="px-3 py-2">{row.nb_nuits ?? daysBetween(row.date_arrivee, row.date_depart)}</td>
                <td className="px-3 py-2 align-top">
                  {row.source === "blocage" ? (
                    <span style={{ color: PC.muted }}>—</span>
                  ) : row.source === "airbnb" || row.source === "booking" ? (
                    <div className="flex flex-col gap-0.5">
                      {editingMontantId === row.id ? (
                        <input
                          ref={montantInputRef}
                          type="number"
                          step="0.01"
                          min={0}
                          className="w-28 rounded px-2 py-1 text-sm"
                          style={{ ...fieldInputStyle, width: "7rem" }}
                          value={editingMontantValue}
                          onChange={(e) => setEditingMontantValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void saveTarifTotalReservation(row.id, editingMontantValue);
                          }}
                          onBlur={() => void saveTarifTotalReservation(row.id, editingMontantValue)}
                        />
                      ) : (
                        <>
                          <span>{row.tarif_total.toFixed(0)} €</span>
                          <button
                            type="button"
                            className="w-fit p-0 text-left text-[12px] font-normal underline"
                            style={{ color: "#a78bfa", background: "none", border: "none", cursor: "pointer" }}
                            onClick={() => {
                              setEditingMontantId(row.id);
                              setEditingMontantValue(String(row.tarif_total));
                            }}
                          >
                            Modifier le prix
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    `${row.tarif_total.toFixed(0)} €`
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `${STATUT_COLOR[row.statut] ?? PC.muted}22`, color: STATUT_COLOR[row.statut] }}>
                    {row.statut}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {row.source === "blocage" ? (
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={{ backgroundColor: "rgba(148, 163, 184, 0.12)", color: PC.muted }}
                    >
                      Blocage personnel
                    </span>
                  ) : (
                    row.source
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {(() => {
                    const isOta = row.source === "airbnb" || row.source === "booking";
                    const isBlocage = row.source === "blocage";
                    const canDirectActions = !isOta && !isBlocage;
                    const canDeletePermanently =
                      row.source === "direct" || row.source === "autre" || row.source === "blocage";
                    return (
                      <div className="flex max-w-[220px] flex-col gap-1.5">
                        <button
                          type="button"
                          className="w-fit p-0 text-left text-xs underline"
                          style={{ color: PC.primary, background: "none", border: "none", cursor: "pointer" }}
                          onClick={() => setDetailId(row.id)}
                        >
                          Détail
                        </button>
                        <div className="grid grid-cols-2 gap-1">
                          {canDirectActions && row.statut === "en_attente" ? (
                            <ResaActionPill variant="green" onClick={() => void setStatut(row.id, "confirmee")}>
                              Confirmer
                            </ResaActionPill>
                          ) : null}
                          {canDirectActions && canDeletePermanently ? (
                            <ResaActionPill
                              variant="red"
                              onClick={() => {
                                setDeleteOtaConfirmId(null);
                                setDeleteConfirmId(row.id);
                              }}
                            >
                              Supprimer
                            </ResaActionPill>
                          ) : null}
                          {canDirectActions && row.voyageurs ? (
                            <ResaActionPill variant="violet" onClick={() => requestSendConfirm("contrat", row)}>
                              Contrat
                            </ResaActionPill>
                          ) : null}
                          {canDirectActions && row.voyageurs ? (
                            <ResaActionPill variant="violetOutline" onClick={() => requestSendConfirm("acompte", row)}>
                              Acompte
                            </ResaActionPill>
                          ) : null}
                          {canDirectActions && row.voyageurs ? (
                            <ResaActionPill variant="violetOutline" onClick={() => requestSendConfirm("solde", row)}>
                              Solde
                            </ResaActionPill>
                          ) : null}
                          {isOta ? (
                            <ResaActionPill
                              variant="redOutline"
                              onClick={() => {
                                setDeleteConfirmId(null);
                                setDeleteOtaConfirmId(row.id);
                              }}
                            >
                              Supprimer
                            </ResaActionPill>
                          ) : null}
                          {!isBlocage ? (
                            <ResaActionPill variant="grey" onClick={() => void markMenageDone(row.id, row.logement_id)}>
                              Ménage ✓
                            </ResaActionPill>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal
            aria-labelledby="nouvelle-resa-title"
            className="flex h-full max-h-[100dvh] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-2xl"
            style={{ ...panelCard, backgroundColor: PC.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-8 sm:px-6 sm:pb-8"
              style={{
                paddingTop: "max(1.5rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))",
              }}
            >
              <h3 id="nouvelle-resa-title" className="sr-only">
                Nouvelle réservation — formulaire
              </h3>
              <form onSubmit={onCreateSubmit} className="space-y-3">
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Logement
                <select
                  required
                  style={{ ...fieldSelectStyle, colorScheme: "dark" }}
                  value={form.logement_id}
                  onChange={(e) => onLogementPick(e.target.value)}
                >
                  <option value="" disabled>
                    — Sélectionner un logement —
                  </option>
                  {logements.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Voyageur existant
                <select required style={fieldSelectStyle} value={form.voyageur_id} onChange={(e) => setForm((f) => ({ ...f, voyageur_id: e.target.value }))}>
                  <option value="">— Sélectionner un voyageur —</option>
                  {voyageurs.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.prenom} {v.nom}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs" style={{ color: PC.muted }}>
                <a
                  href="/saisonnier/voyageurs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: PC.muted }}
                >
                  + Créer un nouveau voyageur
                </a>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                  Arrivée
                  <input required type="date" style={fieldInputStyle} value={form.date_arrivee} onChange={(e) => setForm((f) => ({ ...f, date_arrivee: e.target.value }))} />
                </label>
                <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                  Départ
                  <input required type="date" style={fieldInputStyle} value={form.date_depart} onChange={(e) => setForm((f) => ({ ...f, date_depart: e.target.value }))} />
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                  Heure d&apos;arrivée
                  <input
                    type="time"
                    style={fieldInputStyle}
                    value={form.heure_arrivee}
                    onChange={(e) => setForm((f) => ({ ...f, heure_arrivee: e.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                  Heure de départ
                  <input
                    type="time"
                    style={fieldInputStyle}
                    value={form.heure_depart}
                    onChange={(e) => setForm((f) => ({ ...f, heure_depart: e.target.value }))}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Nb voyageurs
                <input type="number" min={1} style={fieldInputStyle} value={form.nb_voyageurs} onChange={(e) => setForm((f) => ({ ...f, nb_voyageurs: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Source
                <select
                  style={fieldSelectStyle}
                  value={form.source}
                  onChange={(e) => {
                    const source = e.target.value;
                    setForm((f) => ({ ...f, source }));
                    if (source !== "direct") setTarifManuelAirbnb("");
                  }}
                >
                  <option value="direct">Direct</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
              {form.source === "direct" ? (
                <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                  Le montant des nuitées est calculé automatiquement à partir des créneaux tarifaires et du tarif par défaut du logement.
                </p>
              ) : (
                <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                  Tarif / nuit (€)
                  <input
                    required
                    type="number"
                    step="0.01"
                    style={fieldInputStyle}
                    value={tarifManuelAirbnb}
                    onChange={(e) => setTarifManuelAirbnb(e.target.value)}
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Acompte demandé (%)
                <input type="number" min={0} max={100} style={fieldInputStyle} value={acomptePct} onChange={(e) => setAcomptePct(Number(e.target.value) || 0)} />
              </label>
              {(() => {
                const lgM = logements.find((l) => l.id === form.logement_id);
                const tarifMenageLogement = lgM?.tarif_menage != null ? Number(lgM.tarif_menage) : 0;
                return (
                  <fieldset className="space-y-2 rounded-lg p-3 text-sm" style={{ border: `1px solid ${PC.border}` }}>
                    <legend className="px-1 font-medium" style={{ color: PC.text }}>
                      Ménage
                    </legend>
                    <p className="text-xs" style={{ color: PC.muted }}>
                      Tarif ménage (logement)&nbsp;: {tarifMenageLogement.toFixed(2)} €
                    </p>
                    <div className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-start gap-2" style={{ color: PC.text }}>
                        <input
                          type="radio"
                          name="menage_mode"
                          checked={form.menage_inclus}
                          onChange={() => setForm((f) => ({ ...f, menage_inclus: true }))}
                          className="mt-1 accent-[#7c3aed]"
                        />
                        <span>Inclus dans la réservation (payant)</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2" style={{ color: PC.text }}>
                        <input
                          type="radio"
                          name="menage_mode"
                          checked={!form.menage_inclus}
                          onChange={() => setForm((f) => ({ ...f, menage_inclus: false }))}
                          className="mt-1 accent-[#7c3aed]"
                        />
                        <span>À la charge du voyageur (fait par lui-même)</span>
                      </label>
                    </div>
                    {!form.menage_inclus ? (
                      <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                        Le tarif ménage n&apos;est pas facturé. Le voyageur remet le logement en état.
                      </p>
                    ) : null}
                  </fieldset>
                );
              })()}
              <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.border}` }}>
                <p>Nuits : {preview.nuits}</p>
                <p>Total nuitées (hébergement) : {preview.nuitees.toFixed(2)} €</p>
                {form.menage_inclus ? (
                  <p>Frais de ménage : {preview.menage.toFixed(2)} €</p>
                ) : (
                  <p style={{ color: PC.muted }}>Ménage : à la charge du voyageur (non facturé)</p>
                )}
                <p>Taxe de séjour : {preview.taxe.toFixed(2)} €</p>
                <p>Caution : {preview.caution.toFixed(2)} €</p>
                <p className="font-medium" style={{ color: PC.text }}>
                  Total TTC : {preview.total.toFixed(2)} €
                </p>
                <p className="text-xs" style={{ color: PC.muted }}>
                  Acompte ({acomptePct}%) sur nuitées + taxe
                  {form.menage_inclus ? " + ménage" : ""} (hors caution)
                </p>
                <p>Acompte ({acomptePct}%) : {preview.acompte.toFixed(2)} €</p>
              </div>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Notes
                <textarea className="min-h-16 rounded-lg px-3 py-2 text-sm" style={fieldInputStyle} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="proplio-btn-secondary px-4 py-2" onClick={() => setModalOpen(false)}>
                  Fermer
                </button>
                <button type="submit" className="proplio-btn-primary px-4 py-2">
                  Créer
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      ) : null}

      {detailId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailId(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const row = rows.find((r) => r.id === detailId);
              if (!row) return null;
              const isOta = row.source === "airbnb" || row.source === "booking";
              const isBlocage = row.source === "blocage";
              return (
                <>
                  <h3 className="text-lg font-semibold">Détail réservation</h3>
                  <ul className="mt-3 space-y-2 text-sm" style={{ color: PC.muted }}>
                    <li>Logement : {row.logements?.nom}</li>
                    <li>
                      Dates : {row.date_arrivee} ({row.heure_arrivee}) → {row.date_depart} ({row.heure_depart})
                    </li>
                    <li className="flex flex-wrap items-center gap-2">
                      Source :{" "}
                      {isBlocage ? (
                        <span
                          className="rounded px-2 py-0.5 text-xs"
                          style={{ backgroundColor: "rgba(148, 163, 184, 0.12)", color: PC.muted }}
                        >
                          Blocage personnel
                        </span>
                      ) : (
                        row.source
                      )}
                    </li>
                    <li>Montant (hébergement) : {isBlocage ? "—" : `${row.tarif_total.toFixed(2)} €`}</li>
                    <li>Statut : {row.statut}</li>
                    <li>Notes : {row.notes ?? "—"}</li>
                  </ul>
                  {isOta ? (
                    <div className="mt-4 space-y-2 rounded-lg p-3" style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.inputBg }}>
                      <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                        <span className="font-medium" style={{ color: PC.text }}>
                          Prix réel (€)
                        </span>
                        <span className="text-xs">Prix communiqué par Airbnb/Booking</span>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          style={fieldInputStyle}
                          value={detailPrixReel}
                          onChange={(e) => setDetailPrixReel(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={detailSaving}
                        className="proplio-btn-primary w-full py-2 text-sm"
                        onClick={() => void saveDetailPrixReel()}
                      >
                        {detailSaving ? "…" : "Mettre à jour"}
                      </button>
                    </div>
                  ) : null}
                  <button type="button" className="proplio-btn-primary mt-4 w-full py-2" onClick={() => setDetailId(null)}>
                    Fermer
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {sendConfirm ? (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="send-resa-title"
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
            <h3 id="send-resa-title" className="text-lg font-semibold" style={{ color: PC.text }}>
              Confirmation d&apos;envoi
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              {sendConfirm.kind === "contrat"
                ? `Envoyer le contrat de séjour à ${sendConfirm.email} ?`
                : sendConfirm.kind === "acompte"
                  ? `Envoyer le reçu d'acompte à ${sendConfirm.email} ?`
                  : `Envoyer le reçu de solde à ${sendConfirm.email} ?`}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="proplio-btn-secondary px-4 py-2 text-sm"
                disabled={sendSubmitting}
                onClick={() => setSendConfirm(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "#7c3aed" }}
                disabled={sendSubmitting}
                onClick={() => void confirmSendReservation()}
              >
                {sendSubmitting ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="delete-resa-title"
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
            <h3 id="delete-resa-title" className="text-lg font-semibold" style={{ color: PC.text }}>
              Supprimer la réservation
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Êtes-vous sûr de vouloir supprimer cette réservation ? Cette action est irréversible.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="proplio-btn-secondary px-4 py-2 text-sm"
                disabled={deleteSubmitting}
                onClick={() => setDeleteConfirmId(null)}
              >
                Retour
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "#dc2626" }}
                disabled={deleteSubmitting}
                onClick={() => void confirmDeleteReservation()}
              >
                {deleteSubmitting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOtaConfirmId ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="delete-ota-proplio-title"
        >
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
            <h3 id="delete-ota-proplio-title" className="text-lg font-semibold" style={{ color: PC.text }}>
              Supprimer de Proplio
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Supprimer cette réservation de Proplio ? Elle restera sur Airbnb/Booking.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="proplio-btn-secondary px-4 py-2 text-sm"
                disabled={deleteSubmitting}
                onClick={() => setDeleteOtaConfirmId(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "#dc2626" }}
                disabled={deleteSubmitting}
                onClick={() => void confirmDeleteOtaFromProplio()}
              >
                {deleteSubmitting ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
