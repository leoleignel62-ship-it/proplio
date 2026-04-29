"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { invalidateHeaderAlertsCache } from "@/components/navigation-sidebar";
import { IconArrowPath, IconBuilding } from "@/components/locavio-icons";
import {
  calculerNouveauLoyer,
  detecterBauxEligibles,
  formatDateIsoLocal,
  getDerniereDateAnniversaireBail,
} from "@/lib/irl-revision";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { BtnEmail, BtnPrimary, BtnSecondary } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";
import { supabase } from "@/lib/supabase";
import type { CSSProperties } from "react";

const CARD: CSSProperties = { ...panelCard, padding: 20 };

type IrlApi = { valeur: number; trimestre: string };

type BailRow = {
  id: string;
  logement_id: string | null;
  locataire_id: string | null;
  date_debut: string | null;
  irl_reference: number | null;
  loyer_initial: number | null;
  revision_loyer: string | null;
  loyer: number;
  charges: number | null;
  date_derniere_revision: string | null;
  statut: string;
};

type RevisionRow = {
  id: string;
  bail_id: string | null;
  loyer_avant: number;
  loyer_apres: number;
  irl_ancien: number;
  irl_nouveau: number;
  date_revision: string;
  statut: string;
  lettre_envoyee: boolean | null;
  date_envoi_lettre?: string | null;
  created_at?: string | null;
};

function formatMoney(n: number) {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;
}

function formatDateFr(d: string) {
  const x = new Date(d.includes("T") ? d : `${d}T12:00:00`);
  if (Number.isNaN(x.getTime())) return d;
  return x.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function RevisionsIrlPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<LocavioPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [irl, setIrl] = useState<IrlApi>({ valeur: 143.46, trimestre: "T4 2024" });
  const [baux, setBaux] = useState<BailRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [logementsMap, setLogementsMap] = useState<Map<string, string>>(new Map());
  const [locatairesMap, setLocatairesMap] = useState<Map<string, string>>(new Map());
  const [locatairesEmailMap, setLocatairesEmailMap] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState("");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [filtreLogement, setFiltreLogement] = useState("");
  const [pendingLetters, setPendingLetters] = useState<Array<{ bailId: string; revisionId: string; label: string }>>(
    [],
  );
  const [missingIrlDraft, setMissingIrlDraft] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setError("");
    const { proprietaireId: pid } = await getCurrentProprietaireId();
    if (!pid) {
      setLoading(false);
      return;
    }
    const pl = await getOwnerPlan(pid);
    setPlan(pl);
    if (pl === "free") {
      setLoading(false);
      return;
    }

    const [{ data: bRows }, { data: lRows }, { data: locRows }, { data: rRows }] = await Promise.all([
      supabase
        .from("baux")
        .select(
          "id, logement_id, locataire_id, date_debut, irl_reference, loyer_initial, revision_loyer, loyer, charges, date_derniere_revision, statut",
        )
        .eq("proprietaire_id", pid),
      supabase.from("logements").select("id, nom").eq("proprietaire_id", pid),
      supabase.from("locataires").select("id, nom, prenom, email").eq("proprietaire_id", pid),
      supabase.from("revisions_irl").select("*").eq("proprietaire_id", pid).order("created_at", { ascending: false }),
    ]);

    const lm = new Map<string, string>();
    for (const l of lRows ?? []) lm.set(String(l.id), String((l as { nom?: string }).nom ?? "Logement"));
    const cm = new Map<string, string>();
    const em = new Map<string, string>();
    for (const c of locRows ?? []) {
      const nom = `${(c as { prenom?: string }).prenom ?? ""} ${(c as { nom?: string }).nom ?? ""}`.trim();
      cm.set(String(c.id), nom || "Locataire");
      em.set(String(c.id), String((c as { email?: string | null }).email ?? "").trim());
    }
    setLogementsMap(lm);
    setLocatairesMap(cm);
    setLocatairesEmailMap(em);
    const bList = (bRows ?? []) as BailRow[];
    const rList = (rRows ?? []) as RevisionRow[];
    setBaux(bList);
    setRevisions(rList);

    const pend: Array<{ bailId: string; revisionId: string; label: string }> = [];
    for (const r of rList) {
      if (String(r.statut ?? "").toLowerCase() !== "validee" || r.lettre_envoyee) continue;
      const bail = bList.find((b) => b.id === r.bail_id);
      if (!bail) continue;
      const logementNom = lm.get(String(bail.logement_id ?? "")) ?? "Logement";
      const locNom = cm.get(String(bail.locataire_id ?? "")) ?? "";
      const label = locNom ? `${logementNom} — ${locNom}` : logementNom;
      pend.push({ bailId: bail.id, revisionId: String(r.id), label });
    }
    setPendingLetters(pend);

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/irl");
        const j = (await res.json()) as IrlApi;
        if (!cancelled && j?.valeur != null && j?.trimestre) setIrl(j);
      } catch {
        /* fallback déjà en state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const revMeta = useMemo(() => {
    const proposee = new Set(
      revisions
        .filter((r) => String(r.statut ?? "").toLowerCase() === "proposee")
        .map((r) => String(r.bail_id)),
    );
    const pourRefus = revisions.map((r) => ({
      bail_id: String(r.bail_id ?? ""),
      statut: String(r.statut ?? ""),
      date_revision: String(r.date_revision ?? "").slice(0, 10),
    }));
    return { proposee, pourRefus };
  }, [revisions]);

  const eligibles = useMemo(
    () =>
      detecterBauxEligibles(baux as never, irl.valeur, {
        bailIdsAvecRevisionProposee: revMeta.proposee,
        revisionsPourRefus: revMeta.pourRefus,
      }) as BailRow[],
    [baux, irl.valeur, revMeta],
  );

  const bauxSansIrlReference = useMemo(
    () =>
      detecterBauxEligibles(baux as never, irl.valeur, {
        bailIdsAvecRevisionProposee: revMeta.proposee,
        revisionsPourRefus: revMeta.pourRefus,
        omitIrlReferenceCheck: true,
      }).filter((b) => {
        const n = Number((b as BailRow).irl_reference ?? 0);
        return !Number.isFinite(n) || n <= 0;
      }) as BailRow[],
    [baux, irl.valeur, revMeta],
  );

  const logementsOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const r of revisions) {
      const bid = r.bail_id;
      if (!bid) continue;
      const bail = baux.find((b) => b.id === bid);
      if (bail?.logement_id) ids.add(String(bail.logement_id));
    }
    return [...ids].map((id) => ({ id, label: logementsMap.get(id) ?? id }));
  }, [revisions, baux, logementsMap]);

  const historiqueFiltre = useMemo(() => {
    if (!filtreLogement) return revisions;
    return revisions.filter((r) => {
      const bail = baux.find((b) => b.id === r.bail_id);
      return bail && String(bail.logement_id) === filtreLogement;
    });
  }, [revisions, filtreLogement, baux]);

  async function onValider(bail: BailRow) {
    setActionKey(`v-${bail.id}`);
    setError("");
    try {
      const res = await fetch("/api/revisions-irl/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId: bail.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Validation impossible.");
        return;
      }
      invalidateHeaderAlertsCache();
      await loadData();
      toast.success("Révision validée.");
    } finally {
      setActionKey(null);
    }
  }

  async function onIgnorer(bail: BailRow) {
    setActionKey(`i-${bail.id}`);
    setError("");
    try {
      const res = await fetch("/api/revisions-irl/refuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bailId: bail.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Action impossible.");
        return;
      }
      invalidateHeaderAlertsCache();
      await loadData();
      toast.success("Révision ignorée.");
    } finally {
      setActionKey(null);
    }
  }

  async function onSaveIrlReference(bailId: string) {
    const raw = (missingIrlDraft[bailId] ?? "").trim().replace(",", ".");
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Indiquez un indice IRL valide (nombre > 0).");
      return;
    }
    setActionKey(`irl-${bailId}`);
    setError("");
    try {
      const { proprietaireId: pid } = await getCurrentProprietaireId();
      if (!pid) {
        setError("Session propriétaire introuvable.");
        return;
      }
      const { error: upErr } = await supabase
        .from("baux")
        .update({ irl_reference: n })
        .eq("id", bailId)
        .eq("proprietaire_id", pid);
      if (upErr) {
        setError(formatSubmitError(upErr));
        return;
      }
      setMissingIrlDraft((prev) => {
        const next = { ...prev };
        delete next[bailId];
        return next;
      });
      invalidateHeaderAlertsCache();
      await loadData();
      toast.success("IRL de référence enregistré.");
    } catch (e) {
      setError(formatSubmitError(e));
    } finally {
      setActionKey(null);
    }
  }

  async function onEnvoyerLettre(
    revisionId: string,
    opts?: { resend?: boolean; tenantEmail?: string },
  ) {
    if (opts?.resend) {
      const em = (opts.tenantEmail ?? "").trim();
      const msg = em ? `Renvoyer la lettre à ${em} ?` : "Renvoyer la lettre au locataire ?";
      if (!window.confirm(msg)) return;
    }
    setActionKey(`s-${revisionId}`);
    setError("");
    try {
      const res = await fetch(`/api/revisions-irl/${revisionId}/send`, { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Envoi impossible.");
        return;
      }
      toast.success(opts?.resend ? "Lettre renvoyée." : "Lettre envoyée par email.");
      invalidateHeaderAlertsCache();
      await loadData();
    } finally {
      setActionKey(null);
    }
  }

  if (!loading && plan === "free") {
    return <PlanFreeModuleUpsell variant="revisions-irl" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <nav className="text-sm" style={{ color: PC.muted }}>
        <Link href="/" className="inline-flex items-center gap-1.5 transition hover:underline" style={{ color: PC.muted }}>
          <IconBuilding className="h-4 w-4" />
          Accueil
        </Link>
        <span className="px-1">/</span>
        <span style={{ color: PC.text }}>Révision IRL</span>
      </nav>

      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl" style={{ color: PC.text }}>
          Révision des loyers (IRL)
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: PC.muted }}>
          Calculez et appliquez la révision annuelle de vos loyers basée sur l&apos;Indice de Référence des Loyers publié
          par l&apos;INSEE.
        </p>
        <div
          className="inline-flex rounded-full px-3 py-1.5 text-xs font-medium md:text-sm"
          style={{ backgroundColor: PC.primaryBg15, color: PC.primaryLight, border: `1px solid ${PC.borderPrimary50}` }}
        >
          IRL en vigueur : {irl.valeur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          ({irl.trimestre})
        </div>
      </header>

      {error ? (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ ...panelCard, borderColor: PC.red600, color: PC.red200 }}>
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Révisions disponibles
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: PC.muted }}>
            Chargement…
          </p>
        ) : (
          <>
            {bauxSansIrlReference.length > 0 ? (
              <div className="mb-4 space-y-3">
                {bauxSansIrlReference.map((bail) => {
                  const logementNom = logementsMap.get(String(bail.logement_id ?? "")) ?? "Logement";
                  const locNom = locatairesMap.get(String(bail.locataire_id ?? "")) ?? "Locataire";
                  const busy = actionKey === `irl-${bail.id}`;
                  return (
                    <div key={`irl-${bail.id}`} className="rounded-xl text-sm" style={CARD}>
                      <p className="font-medium" style={{ color: PC.text }}>
                        {logementNom}
                        <span className="font-normal" style={{ color: PC.muted }}>
                          {" "}
                          — {locNom}
                        </span>
                      </p>
                      <p className="mt-2 text-xs leading-relaxed" style={{ color: PC.warning }}>
                        IRL de référence manquant — renseignez l&apos;indice INSEE à la date de début du bail ci-dessous
                        puis enregistrez.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="ex. 143.46"
                          className="min-w-[8rem] max-w-[12rem] rounded-lg border px-2 py-1.5 text-sm outline-none"
                          style={{ borderColor: PC.border, backgroundColor: PC.inputBg, color: PC.text }}
                          value={missingIrlDraft[bail.id] ?? ""}
                          onChange={(e) =>
                            setMissingIrlDraft((prev) => ({ ...prev, [bail.id]: e.target.value }))
                          }
                        />
                        <BtnPrimary size="small" disabled={busy} loading={busy} onClick={() => void onSaveIrlReference(bail.id)}>
                          Enregistrer
                        </BtnPrimary>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {eligibles.length === 0 && bauxSansIrlReference.length === 0 ? (
              <div className="rounded-xl p-6 text-sm leading-relaxed" style={CARD}>
                <p style={{ color: PC.muted }}>
                  Aucune révision disponible pour le moment. Les révisions sont proposées automatiquement à chaque date
                  anniversaire de vos baux.
                </p>
              </div>
            ) : eligibles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-1">
            {eligibles.map((bail) => {
              const irlRef = Number(bail.irl_reference ?? 0);
              const calc = calculerNouveauLoyer(Number(bail.loyer ?? 0), irlRef, irl.valeur);
              const chargesBail = Number(bail.charges ?? 0);
              const chargesOk = Number.isFinite(chargesBail) && chargesBail >= 0 ? chargesBail : 0;
              const totalAvecCharges = calc.nouveauLoyer + chargesOk;
              const anniv = getDerniereDateAnniversaireBail(String(bail.date_debut ?? ""));
              const logementNom = logementsMap.get(String(bail.logement_id ?? "")) ?? "Logement";
              const locNom = locatairesMap.get(String(bail.locataire_id ?? "")) ?? "Locataire";
              const busyV = actionKey === `v-${bail.id}`;
              const busyI = actionKey === `i-${bail.id}`;
              return (
                <div key={bail.id} className="rounded-xl" style={CARD}>
                  <p className="font-medium" style={{ color: PC.text }}>
                    {logementNom}
                    <span className="font-normal" style={{ color: PC.muted }}>
                      {" "}
                      — {locNom}
                    </span>
                  </p>
                  <div className="mt-3 grid gap-2 text-sm" style={{ color: PC.muted }}>
                    <div>
                      Loyer actuel : <span style={{ color: PC.text }}>{formatMoney(Number(bail.loyer))}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Nouveau loyer calculé :{" "}
                        <span style={{ color: PC.text }}>{formatMoney(calc.nouveauLoyer)}</span>
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: PC.successBg10,
                          color: PC.success,
                        }}
                      >
                        {calc.variationEuro >= 0 ? "+" : ""}
                        {formatMoney(calc.variationEuro)} / {formatPct(calc.variationPct)}
                      </span>
                    </div>
                    <div>
                      Total avec charges :{" "}
                      <span style={{ color: PC.text }}>{formatMoney(totalAvecCharges)}</span>
                      {chargesOk > 0 ? (
                        <span>
                          {" "}
                          (dont {formatMoney(chargesOk)} de charges)
                        </span>
                      ) : null}
                    </div>
                    <div>
                      IRL référence → IRL actuel : {irlRef.toFixed(2)} → {irl.valeur.toFixed(2)}
                    </div>
                    <div>
                      Date anniversaire du bail :{" "}
                      {anniv ? (
                        <span style={{ color: PC.text }}>{formatDateFr(formatDateIsoLocal(anniv))}</span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <BtnPrimary
                      disabled={busyV || busyI}
                      loading={busyV}
                      onClick={() => void onValider(bail)}
                    >
                      Valider la révision
                    </BtnPrimary>
                    <BtnSecondary disabled={busyV || busyI} loading={busyI} onClick={() => void onIgnorer(bail)}>
                      Ignorer
                    </BtnSecondary>
                  </div>
                </div>
              );
            })}
          </div>
            ) : null}
          </>
        )}
      </section>

      {pendingLetters.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
            Envoyer la lettre de révision
          </h2>
          <p className="text-sm" style={{ color: PC.muted }}>
            Après validation, vous pouvez transmettre la lettre officielle au locataire par e-mail (PDF joint).
          </p>
          <div className="flex flex-col gap-3">
            {pendingLetters.map((p) => (
              <div
                key={p.revisionId}
                className="flex flex-col gap-2 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
                style={CARD}
              >
                <span className="text-sm" style={{ color: PC.text }}>
                  {p.label}
                </span>
                <BtnEmail
                  disabled={actionKey === `s-${p.revisionId}`}
                  loading={actionKey === `s-${p.revisionId}`}
                  onClick={() => void onEnvoyerLettre(p.revisionId)}
                >
                  Envoyer par email
                </BtnEmail>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
            Historique des révisions
          </h2>
          <label className="flex flex-col gap-1 text-xs" style={{ color: PC.muted }}>
            Filtrer par logement
            <select
              className="rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: PC.border, backgroundColor: PC.inputBg, color: PC.text }}
              value={filtreLogement}
              onChange={(e) => setFiltreLogement(e.target.value)}
            >
              <option value="">Tous</option>
              {logementsOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl" style={{ ...panelCard, padding: 0 }}>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${PC.borderRow}` }}>
                {["Logement", "Locataire", "Date", "Loyer avant → après", "Variation", "Statut", "Lettre"].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium" style={{ color: PC.muted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historiqueFiltre.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center" style={{ color: PC.muted }}>
                    Aucune entrée.
                  </td>
                </tr>
              ) : (
                historiqueFiltre.map((r) => {
                  const bail = baux.find((b) => b.id === r.bail_id);
                  const locataireId = bail?.locataire_id ? String(bail.locataire_id) : "";
                  const tenantEmail = locataireId ? locatairesEmailMap.get(locataireId) ?? "" : "";
                  const logementNom = bail ? logementsMap.get(String(bail.logement_id ?? "")) ?? "—" : "—";
                  const locNom = bail ? locatairesMap.get(String(bail.locataire_id ?? "")) ?? "—" : "—";
                  const varEur = Math.round((Number(r.loyer_apres) - Number(r.loyer_avant)) * 100) / 100;
                  const varPct =
                    Number(r.loyer_avant) > 0
                      ? Math.round(
                          ((Number(r.loyer_apres) - Number(r.loyer_avant)) / Number(r.loyer_avant)) * 10000,
                        ) / 100
                      : 0;
                  const st = String(r.statut ?? "").toLowerCase();
                  const lettreOk = Boolean(r.lettre_envoyee);
                  const dateEnvoiRaw = r.date_envoi_lettre ?? r.created_at ?? "";
                  const sendBusy = actionKey === `s-${r.id}`;
                  const badgeStyle =
                    st === "validee"
                      ? { bg: PC.successBg10, fg: PC.success }
                      : st === "refusee"
                        ? { bg: PC.dangerBg15, fg: PC.danger }
                        : { bg: PC.warningBg15, fg: PC.warning };

                  let lettreCell: ReactNode;
                  if (lettreOk) {
                    lettreCell = (
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: PC.successBg10, color: PC.success }}
                        >
                          Envoyée le {dateEnvoiRaw ? formatDateFr(String(dateEnvoiRaw)) : "—"}
                        </span>
                        <BtnEmail
                          size="small"
                          disabled={sendBusy}
                          loading={sendBusy}
                          icon={<IconArrowPath className="!h-3.5 !w-3.5 shrink-0" />}
                          onClick={() => void onEnvoyerLettre(r.id, { resend: true, tenantEmail })}
                        >
                          Renvoyer
                        </BtnEmail>
                      </div>
                    );
                  } else if (st === "validee") {
                    lettreCell = (
                      <BtnEmail size="small" disabled={sendBusy} loading={sendBusy} onClick={() => void onEnvoyerLettre(r.id)}>
                        Envoyer par email
                      </BtnEmail>
                    );
                  } else {
                    lettreCell = <span style={{ color: PC.muted }}>—</span>;
                  }

                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${PC.borderRow}` }}>
                      <td className="px-3 py-2.5" style={{ color: PC.text }}>
                        {logementNom}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: PC.text }}>
                        {locNom}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: PC.muted }}>
                        {formatDateFr(String(r.date_revision))}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: PC.text }}>
                        {formatMoney(Number(r.loyer_avant))} → {formatMoney(Number(r.loyer_apres))}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: PC.text }}>
                        {varEur >= 0 ? "+" : ""}
                        {formatMoney(varEur)} ({formatPct(varPct)})
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
                          style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.fg }}
                        >
                          {st || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">{lettreCell}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
