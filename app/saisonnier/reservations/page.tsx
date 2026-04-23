"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/proplio-field-styles";

type ReservationRow = {
  id: string;
  logement_id: string;
  voyageur_id: string | null;
  date_arrivee: string;
  date_depart: string;
  nb_voyageurs: number;
  nb_nuits: number | null;
  tarif_nuit: number;
  tarif_total: number;
  tarif_menage: number;
  tarif_caution: number;
  montant_acompte: number;
  taxe_sejour_total: number;
  statut: string;
  source: string;
  notes: string | null;
  contrat_envoye: boolean | null;
  logements?: { nom: string } | null;
  voyageurs?: { prenom: string; nom: string } | null;
};

const STATUT_COLOR: Record<string, string> = {
  en_attente: PC.warning,
  confirmee: PC.primary,
  en_cours: PC.success,
  terminee: PC.muted,
  annulee: PC.danger,
};

const CalendrierPlanning = dynamic(
  () => import("@/components/saisonnier/calendrier-planning"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl p-6 text-sm" style={{ color: PC.muted }}>
        Chargement du planning…
      </div>
    ),
  },
);

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

export default function ReservationsSaisonnierPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"liste" | "calendrier">("liste");
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [logements, setLogements] = useState<Array<{ id: string; nom: string; tarif_nuit_moyenne: number | null; tarif_menage: number | null; tarif_caution: number | null; taxe_sejour_nuit: number | null }>>([]);
  const [voyageurs, setVoyageurs] = useState<Array<{ id: string; prenom: string; nom: string }>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [acomptePct, setAcomptePct] = useState(30);
  const dragRef = useRef<{ id: string; startX: number; deltaDays: number; arr0: string; dep0: string } | null>(null);

  const [form, setForm] = useState({
    logement_id: "",
    voyageur_id: "",
    new_voyageur_prenom: "",
    new_voyageur_nom: "",
    new_voyageur_email: "",
    date_arrivee: "",
    date_depart: "",
    nb_voyageurs: "1",
    source: "direct",
    tarif_nuit: "",
    notes: "",
  });

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
    const [r1, r2, r3] = await Promise.all([
      supabase
        .from("reservations")
        .select("*, logements(nom), voyageurs(prenom, nom)")
        .eq("proprietaire_id", proprietaireId)
        .order("date_arrivee", { ascending: true }),
      supabase
        .from("logements")
        .select("id, nom, tarif_nuit_moyenne, tarif_menage, tarif_caution, taxe_sejour_nuit, type_location")
        .eq("proprietaire_id", proprietaireId)
        .in("type_location", ["saisonnier", "les_deux"]),
      supabase.from("voyageurs").select("id, prenom, nom").eq("proprietaire_id", proprietaireId).order("nom"),
    ]);
    if (r1.error) setError(formatSubmitError(r1.error));
    const raw = (r1.data ?? []) as Record<string, unknown>[];
    const normalized: ReservationRow[] = raw.map((r) => {
      const lg = r.logements;
      const vg = r.voyageurs;
      const logements = Array.isArray(lg) ? (lg[0] as { nom?: string }) ?? null : (lg as { nom?: string } | null);
      const voyageurs = Array.isArray(vg) ? (vg[0] as { prenom?: string; nom?: string }) ?? null : (vg as { prenom?: string; nom?: string } | null);
      return {
        id: String(r.id),
        logement_id: String(r.logement_id),
        voyageur_id: (r.voyageur_id as string | null) ?? null,
        date_arrivee: String(r.date_arrivee),
        date_depart: String(r.date_depart),
        nb_voyageurs: Number(r.nb_voyageurs ?? 1),
        nb_nuits: r.nb_nuits != null ? Number(r.nb_nuits) : null,
        tarif_nuit: Number(r.tarif_nuit ?? 0),
        tarif_total: Number(r.tarif_total ?? 0),
        tarif_menage: Number(r.tarif_menage ?? 0),
        tarif_caution: Number(r.tarif_caution ?? 0),
        montant_acompte: Number(r.montant_acompte ?? 0),
        taxe_sejour_total: Number(r.taxe_sejour_total ?? 0),
        statut: String(r.statut ?? ""),
        source: String(r.source ?? "direct"),
        notes: (r.notes as string | null) ?? null,
        contrat_envoye: (r.contrat_envoye as boolean | null) ?? null,
        logements: logements ? { nom: String(logements.nom ?? "") } : null,
        voyageurs: voyageurs ? { prenom: String(voyageurs.prenom ?? ""), nom: String(voyageurs.nom ?? "") } : null,
      };
    });
    setRows(normalized);
    setLogements((r2.data as typeof logements) ?? []);
    setVoyageurs((r3.data as typeof voyageurs) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarMonth = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  }, []);

  const monthDays = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => new Date(y, m, i + 1));
  }, [calendarMonth]);

  const pxPerDay = 28;

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

  function openModal() {
    const lg = logements[0];
    setForm({
      logement_id: lg?.id ?? "",
      voyageur_id: "",
      new_voyageur_prenom: "",
      new_voyageur_nom: "",
      new_voyageur_email: "",
      date_arrivee: "",
      date_depart: "",
      nb_voyageurs: "1",
      source: "direct",
      tarif_nuit: lg?.tarif_nuit_moyenne != null ? String(lg.tarif_nuit_moyenne) : "",
      notes: "",
    });
    setModalOpen(true);
  }

  function onLogementPick(id: string) {
    const lg = logements.find((l) => l.id === id);
    setForm((f) => ({
      ...f,
      logement_id: id,
      tarif_nuit: lg?.tarif_nuit_moyenne != null ? String(lg.tarif_nuit_moyenne) : f.tarif_nuit,
    }));
  }

  const preview = useMemo(() => {
    const tn = Number(form.tarif_nuit) || 0;
    const arr = form.date_arrivee;
    const dep = form.date_depart;
    if (!arr || !dep || dep <= arr) return { nuits: 0, nuitees: 0, menage: 0, taxe: 0, caution: 0, total: 0, acompte: 0 };
    const nuits = daysBetween(arr, dep);
    const lg = logements.find((l) => l.id === form.logement_id);
    const menage = lg?.tarif_menage != null ? Number(lg.tarif_menage) : 0;
    const caution = lg?.tarif_caution != null ? Number(lg.tarif_caution) : 0;
    const taxeN = lg?.taxe_sejour_nuit != null ? Number(lg.taxe_sejour_nuit) : 0;
    const nv = Math.max(1, Number(form.nb_voyageurs) || 1);
    const nuitees = nuits * tn;
    const taxe = taxeN * nv * nuits;
    const total = nuitees + menage + taxe + caution;
    const acompte = (total * acomptePct) / 100;
    return { nuits, nuitees, menage, taxe, caution, total, acompte };
  }, [form, logements, acomptePct]);

  async function onCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { proprietaireId, error: ownerErr } = await getCurrentProprietaireId();
    if (ownerErr || !proprietaireId) return;
    let voyageurId = form.voyageur_id || null;
    if (!voyageurId && form.new_voyageur_prenom.trim() && form.new_voyageur_nom.trim()) {
      const { data: nv, error: nvErr } = await supabase
        .from("voyageurs")
        .insert({
          proprietaire_id: proprietaireId,
          prenom: form.new_voyageur_prenom.trim(),
          nom: form.new_voyageur_nom.trim(),
          email: form.new_voyageur_email.trim() || null,
        })
        .select("id")
        .single();
      if (nvErr) {
        setError(formatSubmitError(nvErr));
        return;
      }
      voyageurId = nv.id as string;
    }
    const tn = Number(form.tarif_nuit);
    if (!form.logement_id || !form.date_arrivee || !form.date_depart || !Number.isFinite(tn)) {
      setError("Renseignez logement, dates et tarif/nuit.");
      return;
    }
    const nuits = daysBetween(form.date_arrivee, form.date_depart);
    if (nuits <= 0) {
      setError("La date de départ doit être après l’arrivée.");
      return;
    }
    const lg = logements.find((l) => l.id === form.logement_id);
    const menage = lg?.tarif_menage != null ? Number(lg.tarif_menage) : 0;
    const caution = lg?.tarif_caution != null ? Number(lg.tarif_caution) : 0;
    const taxeN = lg?.taxe_sejour_nuit != null ? Number(lg.taxe_sejour_nuit) : 0;
    const nv = Math.max(1, Number(form.nb_voyageurs) || 1);
    const tarifTotal = nuits * tn;
    const taxeTotal = taxeN * nv * nuits;
    const totalTtc = tarifTotal + menage + taxeTotal + caution;
    const acompte = (totalTtc * acomptePct) / 100;

    const { data: ins, error: iErr } = await supabase
      .from("reservations")
      .insert({
        proprietaire_id: proprietaireId,
        logement_id: form.logement_id,
        voyageur_id: voyageurId,
        date_arrivee: form.date_arrivee,
        date_depart: form.date_depart,
        nb_voyageurs: nv,
        tarif_nuit: tn,
        tarif_total: tarifTotal,
        tarif_menage: menage,
        tarif_caution: caution,
        montant_acompte: Math.round(acompte * 100) / 100,
        taxe_sejour_total: taxeTotal,
        statut: "en_attente",
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

  async function setStatut(id: string, statut: string) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("reservations").update({ statut }).eq("id", id).eq("proprietaire_id", proprietaireId);
    void load();
  }

  async function sendApi(kind: "contrat" | "acompte" | "solde", id: string) {
    setError("");
    const res = await fetch(`/api/saisonnier/reservations/${id}/send-${kind}`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Erreur envoi");
    void load();
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

  function onPointerDownBar(ev: React.PointerEvent, row: ReservationRow) {
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    dragRef.current = {
      id: row.id,
      startX: ev.clientX,
      deltaDays: 0,
      arr0: row.date_arrivee,
      dep0: row.date_depart,
    };
  }

  function onPointerMoveBar(ev: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = ev.clientX - d.startX;
    d.deltaDays = Math.round(dx / pxPerDay);
  }

  async function onPointerUpBar() {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.deltaDays === 0) return;
    const arr = addDays(d.arr0, d.deltaDays);
    const dep = addDays(d.dep0, d.deltaDays);
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    const row = rows.find((r) => r.id === d.id);
    if (!row) return;
    const nuits = daysBetween(arr, dep);
    const tarifTotal = nuits * row.tarif_nuit;
    await supabase
      .from("reservations")
      .update({ date_arrivee: arr, date_depart: dep, tarif_total: tarifTotal })
      .eq("id", d.id)
      .eq("proprietaire_id", proprietaireId);
    void load();
  }

  const monthStartStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEndStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(monthDays.length).padStart(2, "0")}`;

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="proplio-page-title">Réservations</h1>
          <p className="proplio-page-subtitle">Location saisonnière — liste et planning.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full p-1" style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-xs font-semibold transition duration-200"
              style={{
                backgroundColor: view === "liste" ? PC.primary : "transparent",
                color: view === "liste" ? PC.white : PC.muted,
              }}
              onClick={() => setView("liste")}
            >
              Liste
            </button>
            <button
              type="button"
              className="rounded-full px-4 py-2 text-xs font-semibold transition duration-200"
              style={{
                backgroundColor: view === "calendrier" ? PC.primary : "transparent",
                color: view === "calendrier" ? PC.white : PC.muted,
              }}
              onClick={() => setView("calendrier")}
            >
              Calendrier
            </button>
          </div>
          <button type="button" className="proplio-btn-primary px-4 py-2 text-sm" onClick={openModal} disabled={logements.length === 0}>
            Nouvelle réservation
          </button>
        </div>
      </div>
      {logements.length === 0 ? (
        <p className="text-sm" style={{ color: PC.warning }}>
          Aucun logement en mode saisonnier ou « les deux ». Configurez un logement dans Paramètres saisonniers.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {view === "liste" ? (
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
                  <td className="px-3 py-2">{row.tarif_total.toFixed(0)} €</td>
                  <td className="px-3 py-2">
                    <span className="rounded px-2 py-0.5 text-xs" style={{ backgroundColor: `${STATUT_COLOR[row.statut] ?? PC.muted}22`, color: STATUT_COLOR[row.statut] }}>
                      {row.statut}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.source}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1 text-xs">
                      <button type="button" className="text-left underline" style={{ color: PC.primary }} onClick={() => setDetailId(row.id)}>
                        Détail
                      </button>
                      {row.statut === "en_attente" ? (
                        <button type="button" style={{ color: PC.success }} onClick={() => void setStatut(row.id, "confirmee")}>
                          Confirmer
                        </button>
                      ) : null}
                      {row.statut !== "annulee" ? (
                        <button type="button" style={{ color: PC.danger }} onClick={() => void setStatut(row.id, "annulee")}>
                          Annuler
                        </button>
                      ) : null}
                      {row.voyageurs ? (
                        <>
                          <button type="button" style={{ color: PC.secondary }} onClick={() => void sendApi("contrat", row.id)}>
                            Envoyer contrat
                          </button>
                          <button type="button" style={{ color: PC.secondary }} onClick={() => void sendApi("acompte", row.id)}>
                            Reçu acompte
                          </button>
                          <button type="button" style={{ color: PC.secondary }} onClick={() => void sendApi("solde", row.id)}>
                            Reçu solde
                          </button>
                        </>
                      ) : null}
                      <button type="button" style={{ color: PC.muted }} onClick={() => void markMenageDone(row.id, row.logement_id)}>
                        Ménage fait
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CalendrierPlanning
          logements={logements}
          rows={rows}
          monthDays={monthDays}
          monthStartStr={monthStartStr}
          monthEndStr={monthEndStr}
          pxPerDay={pxPerDay}
          onPointerDownBar={(e, row) => onPointerDownBar(e, row as ReservationRow)}
          onPointerMoveBar={onPointerMoveBar}
          onPointerUpBar={() => {
            void onPointerUpBar();
          }}
        />
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-2xl p-6" style={{ ...panelCard, backgroundColor: PC.card }}>
            <h3 className="text-lg font-semibold">Nouvelle réservation</h3>
            <form onSubmit={onCreateSubmit} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Logement
                <select required style={fieldSelectStyle} value={form.logement_id} onChange={(e) => onLogementPick(e.target.value)}>
                  {logements.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Voyageur existant
                <select style={fieldSelectStyle} value={form.voyageur_id} onChange={(e) => setForm((f) => ({ ...f, voyageur_id: e.target.value }))}>
                  <option value="">— Créer ou choisir —</option>
                  {voyageurs.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.prenom} {v.nom}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs" style={{ color: PC.muted }}>
                Ou créer : prénom, nom, email
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input placeholder="Prénom" style={fieldInputStyle} value={form.new_voyageur_prenom} onChange={(e) => setForm((f) => ({ ...f, new_voyageur_prenom: e.target.value }))} />
                <input placeholder="Nom" style={fieldInputStyle} value={form.new_voyageur_nom} onChange={(e) => setForm((f) => ({ ...f, new_voyageur_nom: e.target.value }))} />
              </div>
              <input placeholder="Email nouveau voyageur" type="email" style={fieldInputStyle} value={form.new_voyageur_email} onChange={(e) => setForm((f) => ({ ...f, new_voyageur_email: e.target.value }))} />
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
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Nb voyageurs
                <input type="number" min={1} style={fieldInputStyle} value={form.nb_voyageurs} onChange={(e) => setForm((f) => ({ ...f, nb_voyageurs: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Source
                <select style={fieldSelectStyle} value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                  <option value="direct">Direct</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Tarif / nuit (€)
                <input required type="number" step="0.01" style={fieldInputStyle} value={form.tarif_nuit} onChange={(e) => setForm((f) => ({ ...f, tarif_nuit: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Acompte demandé (%)
                <input type="number" min={0} max={100} style={fieldInputStyle} value={acomptePct} onChange={(e) => setAcomptePct(Number(e.target.value) || 0)} />
              </label>
              <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: PC.primaryBg10, border: `1px solid ${PC.border}` }}>
                <p>Nuits : {preview.nuits}</p>
                <p>Total nuitées : {preview.nuitees.toFixed(2)} €</p>
                <p>Ménage + taxe + caution inclus : total TTC {preview.total.toFixed(2)} €</p>
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
      ) : null}

      {detailId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailId(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl p-6" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const row = rows.find((r) => r.id === detailId);
              if (!row) return null;
              return (
                <>
                  <h3 className="text-lg font-semibold">Détail réservation</h3>
                  <ul className="mt-3 space-y-2 text-sm" style={{ color: PC.muted }}>
                    <li>Logement : {row.logements?.nom}</li>
                    <li>Dates : {row.date_arrivee} → {row.date_depart}</li>
                    <li>Montant : {row.tarif_total.toFixed(2)} €</li>
                    <li>Statut : {row.statut}</li>
                    <li>Notes : {row.notes ?? "—"}</li>
                  </ul>
                  <button type="button" className="proplio-btn-primary mt-4 w-full py-2" onClick={() => setDetailId(null)}>
                    Fermer
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </section>
  );
}
