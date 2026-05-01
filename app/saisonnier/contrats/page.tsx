"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { IconArrowPath } from "@/components/locavio-icons";
import { BtnEmail, BtnSecondary, StatusBadge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle, fieldSelectStyle, panelCard } from "@/lib/locavio-field-styles";

type ContratStatut = "Généré" | "Envoyé" | "Signé";

function extractVoyageurFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.match(/Voyageur:\s*(.+)/i);
  return match?.[1]?.trim() ?? null;
}

type Row = {
  id: string;
  logement_id: string | null;
  voyageur_id: string | null;
  notes: string | null;
  date_arrivee: string;
  date_depart: string;
  contrat_envoye: boolean | null;
  contrat_signe: boolean | null;
  source: string | null;
  logements: { nom: string } | null;
  voyageurs: { prenom: string; nom: string; email: string | null } | null;
};

function formatDateFR(dateStr: string): string {
  if (!dateStr) return "";
  const base = dateStr.trim().split("T")[0] ?? "";
  const date = new Date(`${base}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function rowContratStatut(row: Row): ContratStatut {
  if (row.contrat_signe) return "Signé";
  if (row.contrat_envoye) return "Envoyé";
  return "Généré";
}

type StatutFiltre = "tous" | "genere" | "envoye" | "signe";

export default function ContratsSejourPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statutFiltre, setStatutFiltre] = useState<StatutFiltre>("tous");
  const [logementFiltre, setLogementFiltre] = useState("");
  const [allVoyageurs, setAllVoyageurs] = useState<Array<{ id: string; prenom: string; nom: string; email: string | null }>>([]);
  const [lierModalId, setLierModalId] = useState<string | null>(null);
  const [lierTab, setLierTab] = useState<"existant" | "nouveau">("existant");
  const [lierVoyageurId, setLierVoyageurId] = useState("");
  const [lierPrenom, setLierPrenom] = useState("");
  const [lierNom, setLierNom] = useState("");
  const [lierEmail, setLierEmail] = useState("");
  const [lierTel, setLierTel] = useState("");
  const [lierLoading, setLierLoading] = useState(false);

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
    const [resaRes, voyRes] = await Promise.all([
      supabase
        .from("reservations")
        .select(
          "id, logement_id, voyageur_id, notes, date_arrivee, date_depart, contrat_envoye, contrat_signe, source, logements(nom), voyageurs(prenom, nom, email)",
        )
        .eq("proprietaire_id", proprietaireId)
        .in("source", ["direct", "autre", "airbnb", "booking"])
        .order("date_arrivee", { ascending: false }),
      supabase.from("voyageurs").select("id, prenom, nom, email").eq("proprietaire_id", proprietaireId).order("nom"),
    ]);
    const { data, error: qErr } = resaRes;
    const { data: vData, error: vErr } = voyRes;
    const errParts: string[] = [];
    if (qErr) errParts.push(formatSubmitError(qErr));
    if (vErr) errParts.push(formatSubmitError(vErr));
    if (errParts.length) setError(errParts.join(" — "));
    setAllVoyageurs((vData as Array<{ id: string; prenom: string; nom: string; email: string | null }>) ?? []);
    const raw = (data ?? []) as Record<string, unknown>[];
    setRows(
      raw.map((r) => {
        const lg = r.logements as { nom?: string } | { nom?: string }[] | null;
        const vg = r.voyageurs as { prenom?: string; nom?: string; email?: string } | { prenom?: string; nom?: string; email?: string }[] | null;
        const logements = Array.isArray(lg) ? lg[0] ?? null : lg;
        const voyageurs = Array.isArray(vg) ? vg[0] ?? null : vg;
        return {
          id: String(r.id),
          logement_id: r.logement_id != null ? String(r.logement_id) : null,
          voyageur_id: r.voyageur_id != null ? String(r.voyageur_id) : null,
          notes: (r.notes as string | null) ?? null,
          date_arrivee: String(r.date_arrivee),
          date_depart: String(r.date_depart),
          contrat_envoye: (r.contrat_envoye as boolean | null) ?? null,
          contrat_signe: (r.contrat_signe as boolean | null) ?? null,
          source: r.source != null ? String(r.source) : null,
          logements: logements ? { nom: String(logements.nom ?? "") } : null,
          voyageurs: voyageurs
            ? { prenom: String(voyageurs.prenom ?? ""), nom: String(voyageurs.nom ?? ""), email: (voyageurs.email as string | null) ?? null }
            : null,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logementsOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      const id = r.logement_id;
      if (!id) continue;
      const nom = r.logements?.nom?.trim() || "Logement";
      if (!m.has(id)) m.set(id, nom);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (logementFiltre && row.logement_id !== logementFiltre) return false;
      const st = rowContratStatut(row);
      if (statutFiltre === "genere" && st !== "Généré") return false;
      if (statutFiltre === "envoye" && st !== "Envoyé") return false;
      if (statutFiltre === "signe" && st !== "Signé") return false;
      if (!q) return true;
      const logNom = (row.logements?.nom ?? "").toLowerCase();
      const v = row.voyageurs;
      const voyStr = v
        ? `${v.prenom} ${v.nom} ${v.email ?? ""}`.toLowerCase()
        : (extractVoyageurFromNotes(row.notes) ?? "").toLowerCase();
      return logNom.includes(q) || voyStr.includes(q);
    });
  }, [rows, search, statutFiltre, logementFiltre]);

  async function sendContrat(id: string) {
    setError("");
    const res = await fetch(`/api/saisonnier/reservations/${id}/send-contrat`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Erreur");
    else toast.success("Contrat envoyé par email.");
    void load();
  }

  async function downloadContratPdf(id: string): Promise<void> {
    setError("");
    try {
      const res = await fetch(`/api/saisonnier/contrats/${id}/pdf`, { method: "GET" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Impossible de télécharger le PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contrat-sejour-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erreur réseau lors du téléchargement du PDF.");
    }
  }

  async function toggleSigne(id: string, next: boolean) {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    await supabase.from("reservations").update({ contrat_signe: next }).eq("id", id).eq("proprietaire_id", proprietaireId);
    void load();
    toast.success(next ? "Contrat marqué comme signé." : "Marquage signé retiré.");
  }

  function openLierVoyageurModal(reservationId: string) {
    setError("");
    setLierModalId(reservationId);
    setLierTab("existant");
    setLierVoyageurId("");
    setLierPrenom("");
    setLierNom("");
    setLierEmail("");
    setLierTel("");
  }

  async function lierVoyageurExistant() {
    if (!lierModalId || !lierVoyageurId) return;
    setLierLoading(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setLierLoading(false);
      return;
    }
    const { error: uErr } = await supabase
      .from("reservations")
      .update({ voyageur_id: lierVoyageurId })
      .eq("id", lierModalId)
      .eq("proprietaire_id", proprietaireId);
    setLierLoading(false);
    if (uErr) {
      setError(formatSubmitError(uErr));
      return;
    }
    toast.success("Voyageur lié avec succès.");
    setLierModalId(null);
    void load();
  }

  async function creerEtLierVoyageur() {
    if (!lierModalId) return;
    const prenom = lierPrenom.trim();
    const nom = lierNom.trim();
    if (!prenom || !nom) return;
    setLierLoading(true);
    setError("");
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setLierLoading(false);
      return;
    }
    const { data: newV, error: iErr } = await supabase
      .from("voyageurs")
      .insert({
        prenom,
        nom,
        email: lierEmail.trim() || null,
        telephone: lierTel.trim() || null,
        proprietaire_id: proprietaireId,
      })
      .select("id")
      .single();
    if (iErr || !newV) {
      setLierLoading(false);
      setError(formatSubmitError(iErr));
      return;
    }
    const newId = String((newV as { id: string }).id);
    const { error: uErr } = await supabase
      .from("reservations")
      .update({ voyageur_id: newId })
      .eq("id", lierModalId)
      .eq("proprietaire_id", proprietaireId);
    setLierLoading(false);
    if (uErr) {
      setError(formatSubmitError(uErr));
      return;
    }
    toast.success("Voyageur créé et lié avec succès.");
    setLierModalId(null);
    setLierPrenom("");
    setLierNom("");
    setLierEmail("");
    setLierTel("");
    void load();
  }

  if (loading) {
    return (
      <section className="locavio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (plan === "free") {
    return <PlanFreeModuleUpsell variant="saisonnier" />;
  }

  return (
    <section className="locavio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div>
        <h1 className="locavio-page-title">Contrats de séjour</h1>
        <p className="locavio-page-subtitle">
          Gérez et envoyez vos contrats de séjour pour toutes vos réservations. Le contrat Locavio est obligatoire même pour les réservations Airbnb
          et Booking.
        </p>
      </div>

      <div
        className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:flex-wrap sm:items-end"
        style={{ ...panelCard, border: `1px solid ${PC.border}` }}
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Recherche</span>
          <input
            type="search"
            placeholder="Voyageur ou logement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={fieldInputStyle}
            className="w-full"
          />
        </label>
        <label className="flex min-w-[160px] flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Statut contrat</span>
          <select value={statutFiltre} onChange={(e) => setStatutFiltre(e.target.value as StatutFiltre)} style={fieldSelectStyle} className="w-full">
            <option value="tous">Tous</option>
            <option value="genere">Généré</option>
            <option value="envoye">Envoyé</option>
            <option value="signe">Signé</option>
          </select>
        </label>
        <label className="flex min-w-[200px] flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span>Logement</span>
          <select value={logementFiltre} onChange={(e) => setLogementFiltre(e.target.value)} style={fieldSelectStyle} className="w-full">
            <option value="">Tous les logements</option>
            {logementsOptions.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
            Aucune réservation à afficher.
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
            Aucun résultat pour ces filtres.
          </div>
        ) : (
          filteredRows.map((row) => {
            const statut = rowContratStatut(row);
            const datesAffichees = `${formatDateFR(row.date_arrivee)} → ${formatDateFR(row.date_depart)}`;
            const hasNomFromNotes = !!extractVoyageurFromNotes(row.notes);
            return (
              <article key={row.id} className="rounded-xl p-4" style={{ ...panelCard, border: `1px solid ${PC.border}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{row.logements?.nom ?? "Logement"}</p>
                    <p className="text-sm" style={{ color: PC.muted }}>
                      {row.voyageurs
                        ? `${row.voyageurs.prenom} ${row.voyageurs.nom}`
                        : extractVoyageurFromNotes(row.notes) ?? "Sans voyageur"}{" "}
                      · {datesAffichees}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs" style={{ color: PC.secondary }}>
                      <span>Statut :</span>
                      <StatusBadge
                        status={statut === "Généré" ? "brouillon" : statut === "Envoyé" ? "envoye" : "signe"}
                        label={statut}
                      />
                    </p>
                    {!row.voyageurs && !hasNomFromNotes ? (
                      <p
                        className="mt-2 rounded-lg px-3 py-2 text-xs"
                        style={{
                          backgroundColor: "rgba(234,88,12,0.1)",
                          color: "#fb923c",
                          border: "1px solid rgba(234,88,12,0.3)",
                        }}
                      >
                        ⚠ Aucun voyageur lié à cette réservation.{" "}
                        <button
                          type="button"
                          onClick={() => openLierVoyageurModal(row.id)}
                          className="font-medium underline"
                          style={{ color: "#fb923c" }}
                        >
                          Lier un voyageur
                        </button>{" "}
                        pour pouvoir envoyer le contrat.
                      </p>
                    ) : null}
                    {row.voyageurs && !row.voyageurs.email ? (
                      <p
                        className="mt-2 rounded-lg px-3 py-2 text-xs"
                        style={{
                          backgroundColor: "rgba(234,88,12,0.1)",
                          color: "#fb923c",
                          border: "1px solid rgba(234,88,12,0.3)",
                        }}
                      >
                        ⚠ {row.voyageurs.prenom} {row.voyageurs.nom} n&apos;a pas d&apos;email renseigné. Ajoutez son email depuis la page
                        Voyageurs pour pouvoir envoyer le contrat.{" "}
                        <button
                          type="button"
                          onClick={() => openLierVoyageurModal(row.id)}
                          className="font-medium underline"
                          style={{ color: "#fb923c" }}
                        >
                          Changer de voyageur
                        </button>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <BtnEmail
                        size="small"
                        className="!flex-1 justify-center"
                        disabled={!String(row.voyageurs?.email ?? "").trim()}
                        onClick={() => void sendContrat(row.id)}
                      >
                        Envoyer
                      </BtnEmail>
                      <BtnSecondary
                        size="small"
                        className="!flex-1 justify-center"
                        onClick={() => void downloadContratPdf(row.id)}
                      >
                        Télécharger PDF
                      </BtnSecondary>
                    </div>
                    <BtnSecondary
                      size="small"
                      icon={<IconArrowPath className="h-3 w-3" />}
                      onClick={() => void sendContrat(row.id)}
                    >
                      Renvoyer
                    </BtnSecondary>
                    <label className="flex items-center gap-2 text-xs" style={{ color: PC.muted }}>
                      <input type="checkbox" checked={Boolean(row.contrat_signe)} onChange={(e) => void toggleSigne(row.id, e.target.checked)} />
                      Marquer comme signé
                    </label>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {lierModalId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setLierModalId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ ...panelCard, border: "1px solid rgba(124,58,237,0.3)", backgroundColor: PC.card }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold" style={{ color: PC.text }}>
              Lier un voyageur
            </h2>

            <div
              className="mb-4 flex rounded-full p-1"
              style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}
            >
              <button
                type="button"
                onClick={() => setLierTab("existant")}
                className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: lierTab === "existant" ? PC.primary : "transparent",
                  color: lierTab === "existant" ? PC.white : PC.muted,
                }}
              >
                Voyageur existant
              </button>
              <button
                type="button"
                onClick={() => setLierTab("nouveau")}
                className="flex-1 rounded-full px-4 py-2 text-sm font-semibold transition"
                style={{
                  backgroundColor: lierTab === "nouveau" ? PC.primary : "transparent",
                  color: lierTab === "nouveau" ? PC.white : PC.muted,
                }}
              >
                Nouveau voyageur
              </button>
            </div>

            {lierTab === "existant" ? (
              <div className="space-y-4">
                <select
                  value={lierVoyageurId}
                  onChange={(e) => setLierVoyageurId(e.target.value)}
                  style={{ ...fieldSelectStyle, colorScheme: "dark" }}
                  className="w-full"
                >
                  <option value="">Sélectionner un voyageur…</option>
                  {allVoyageurs.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.prenom} {v.nom}
                      {v.email ? ` — ${v.email}` : " (sans email)"}
                    </option>
                  ))}
                </select>
                {!lierVoyageurId ? (
                  <p className="text-xs" style={{ color: PC.muted }}>
                    Sélectionnez un voyageur avec un email pour pouvoir envoyer le contrat.
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLierModalId(null)}
                    className="flex-1 rounded-xl px-4 py-2 text-sm transition hover:bg-white/5"
                    style={{ color: PC.muted, border: `1px solid ${PC.border}` }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void lierVoyageurExistant()}
                    disabled={!lierVoyageurId || lierLoading}
                    className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                    style={{ backgroundColor: PC.primary }}
                  >
                    {lierLoading ? "Liaison…" : "Lier ce voyageur"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: PC.muted }}>
                      Prénom *
                    </label>
                    <input
                      value={lierPrenom}
                      onChange={(e) => setLierPrenom(e.target.value)}
                      placeholder="Prénom"
                      style={fieldInputStyle}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: PC.muted }}>
                      Nom *
                    </label>
                    <input
                      value={lierNom}
                      onChange={(e) => setLierNom(e.target.value)}
                      placeholder="Nom"
                      style={fieldInputStyle}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: PC.muted }}>
                    Email (requis pour envoyer le contrat)
                  </label>
                  <input
                    type="email"
                    value={lierEmail}
                    onChange={(e) => setLierEmail(e.target.value)}
                    placeholder="email@exemple.fr"
                    style={fieldInputStyle}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs" style={{ color: PC.muted }}>
                    Téléphone
                  </label>
                  <input
                    value={lierTel}
                    onChange={(e) => setLierTel(e.target.value)}
                    placeholder="06 00 00 00 00"
                    style={fieldInputStyle}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setLierModalId(null)}
                    className="flex-1 rounded-xl px-4 py-2 text-sm transition hover:bg-white/5"
                    style={{ color: PC.muted, border: `1px solid ${PC.border}` }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => void creerEtLierVoyageur()}
                    disabled={!lierPrenom.trim() || !lierNom.trim() || lierLoading}
                    className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                    style={{ backgroundColor: PC.primary }}
                  >
                    {lierLoading ? "Création…" : "Créer et lier"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
