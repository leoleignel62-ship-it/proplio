"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { IconHome } from "@/components/locavio-icons";
import { parseChambresDetails, totalLoyersChambres } from "@/lib/colocation";
import { PC } from "@/lib/locavio-colors";
import { panelCard } from "@/lib/locavio-field-styles";
import { BtnPrimary, BtnSecondary, StatusBadge } from "@/components/ui";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

type Logement = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  code_postal: string;
  type: string;
  surface: number;
  loyer: number;
  charges: number;
  est_colocation: boolean;
  nombre_chambres?: number | null;
  chambres_details?: unknown;
  verrouille?: boolean | null;
};

type Locataire = {
  id: string;
  nom: string;
  prenom: string;
  colocation_chambre_index: number | null;
};

type Quittance = { id: string; mois: number; annee: number; total: number; envoyee: boolean; locataire_id: string };
type Bail = { id: string; type_bail: string; date_debut: string; date_fin: string; statut: string; locataire_id: string };
type Edl = { id: string; type: string | null; type_etat: string | null; date_etat: string | null; statut: string };

const tabs = ["locataires", "quittances", "baux", "etats-des-lieux"] as const;
type TabId = (typeof tabs)[number];

function tabButtonLabel(tab: TabId): string {
  if (tab === "etats-des-lieux") return "États des lieux";
  return tab[0].toUpperCase() + tab.slice(1);
}

const HEADER_CARD = {
  backgroundColor: "#13131a",
  border: "1px solid #ffffff08",
  borderRadius: 12,
} as const;

const TAB_ACTIVE_BG = "#7c3aed15";

function IconRuler({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" />
    </svg>
  );
}

function IconEuroBadge({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.756a4.5 4.5 0 1 0 0 8.488M7.5 10.5h4.125M7.5 13.5h6.375" />
    </svg>
  );
}

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.125-7.5 11.25-7.5 11.25S4.5 17.625 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function InfoBadge({
  icon,
  children,
  iconColor = PC.muted,
}: {
  icon: ReactNode;
  children: ReactNode;
  iconColor?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: PC.text, border: "1px solid #ffffff08" }}
    >
      <span style={{ color: iconColor }}>{icon}</span>
      {children}
    </span>
  );
}

export default function LogementDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const logementId = params.id;
  const [activeTab, setActiveTab] = useState<TabId>("locataires");
  const [logement, setLogement] = useState<Logement | null>(null);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [quittances, setQuittances] = useState<Quittance[]>([]);
  const [baux, setBaux] = useState<Bail[]>([]);
  const [edls, setEdls] = useState<Edl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { proprietaireId } = await getCurrentProprietaireId();
      if (!proprietaireId || cancelled) return;
      const [logRes, locRes, quitRes, bauxRes, edlRes] = await Promise.all([
        supabase
          .from("logements")
          .select(
            "id, nom, adresse, ville, code_postal, type, surface, loyer, charges, est_colocation, nombre_chambres, chambres_details, verrouille",
          )
          .eq("id", logementId)
          .eq("proprietaire_id", proprietaireId)
          .maybeSingle(),
        supabase.from("locataires").select("id, nom, prenom, colocation_chambre_index").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId),
        supabase.from("quittances").select("id, mois, annee, total, envoyee, locataire_id").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
        supabase.from("baux").select("id, type_bail, date_debut, date_fin, statut, locataire_id").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
        supabase.from("etats_des_lieux").select("id, type, type_etat, date_etat, statut").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setLogement((logRes.data as Logement | null) ?? null);
      setLocataires((locRes.data as Locataire[]) ?? []);
      setQuittances((quitRes.data as Quittance[]) ?? []);
      setBaux((bauxRes.data as Bail[]) ?? []);
      setEdls((edlRes.data as Edl[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [logementId]);

  const loyerMensuelAffiche = useMemo(() => {
    if (!logement) return 0;
    const charges = Number(logement.charges || 0);
    if (logement.est_colocation) {
      return totalLoyersChambres(parseChambresDetails(logement.chambres_details)) + charges;
    }
    return Number(logement.loyer || 0) + charges;
  }, [logement]);

  const locatairesSorted = useMemo(
    () =>
      [...locataires].sort((a, b) => {
        const ai = a.colocation_chambre_index ?? 999;
        const bi = b.colocation_chambre_index ?? 999;
        return ai - bi;
      }),
    [locataires],
  );

  const chambres = useMemo(() => Math.max(1, Number(logement?.nombre_chambres || 1)), [logement?.nombre_chambres]);
  const chambreMap = useMemo(() => {
    const map = new Map<number, Locataire>();
    for (const loc of locataires) {
      if (loc.colocation_chambre_index) map.set(loc.colocation_chambre_index, loc);
    }
    return map;
  }, [locataires]);

  if (loading) return <section className="locavio-page-wrap text-sm" style={{ color: PC.muted }}>Chargement…</section>;
  if (!logement) return <section className="locavio-page-wrap text-sm" style={{ color: PC.muted }}>Logement introuvable.</section>;
  if (logement.verrouille) {
    return (
      <section className="locavio-page-wrap text-sm" style={{ color: PC.warning }}>
        🔒 Passez à un plan supérieur pour accéder à ce logement.
      </section>
    );
  }

  const tenantVacant = locataires.length === 0;
  const primaryLoc = locatairesSorted[0];
  const initials = primaryLoc
    ? `${(primaryLoc.prenom?.[0] ?? "").toUpperCase()}${(primaryLoc.nom?.[0] ?? "").toUpperCase()}`.trim() || "?"
    : "—";
  const tenantName = tenantVacant
    ? null
    : locataires.length === 1
      ? `${primaryLoc!.prenom} ${primaryLoc!.nom}`.trim()
      : `${primaryLoc!.prenom} ${primaryLoc!.nom} (+${locataires.length - 1})`.trim();
  const tenantBadgeLabel = tenantVacant ? "Vacant" : locataires.length === 1 ? "Locataire actif" : "Locataires actifs";

  return (
    <section className="locavio-page-wrap space-y-6" style={{ color: PC.text }}>
      <nav className="text-sm" style={{ color: PC.muted }}>
        <Link href="/logements" style={{ color: PC.secondary }}>Logements</Link> &gt; {logement.nom}
      </nav>
      <header className="p-6 md:p-7" style={HEADER_CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: PC.text }}>
            {logement.nom}
          </h1>
          <BtnSecondary onClick={() => router.push("/logements")}>Modifier</BtnSecondary>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <InfoBadge icon={<IconHome className="h-4 w-4" />} iconColor={PC.secondary}>
            {logement.type || "—"}
          </InfoBadge>
          <InfoBadge icon={<IconRuler className="h-4 w-4" />}>
            {Number(logement.surface || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m²
          </InfoBadge>
          <InfoBadge icon={<IconEuroBadge className="h-4 w-4" />} iconColor={PC.success}>
            <span style={{ color: PC.success }}>
              {loyerMensuelAffiche.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
              /mois
            </span>
            <span className="font-normal opacity-80" style={{ color: PC.muted }}>
              {" "}
              (charges comprises)
            </span>
          </InfoBadge>
          <InfoBadge icon={<IconPin className="h-4 w-4" />}>{logement.ville}</InfoBadge>
        </div>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: PC.tertiary }}>
          {logement.adresse}, {logement.code_postal} {logement.ville}
        </p>
        <div className="my-5 h-px w-full" style={{ backgroundColor: "#ffffff08" }} aria-hidden />
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{
              backgroundColor: tenantVacant ? "rgba(148,148,159,0.2)" : PC.primaryBg40,
              color: tenantVacant ? PC.muted : PC.white,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            {tenantVacant ? (
              <p className="text-sm font-medium" style={{ color: PC.muted }}>
                Aucun locataire assigné
              </p>
            ) : (
              <p className="truncate text-sm font-medium" style={{ color: PC.text }} title={tenantName ?? undefined}>
                {tenantName}
              </p>
            )}
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              backgroundColor: tenantVacant ? PC.warningBg15 : PC.successBg10,
              color: tenantVacant ? PC.warning : PC.success,
            }}
          >
            {tenantBadgeLabel}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-1 border-b pb-px" style={{ borderColor: "#ffffff08" }}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              className="rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors"
              style={
                active
                  ? {
                      backgroundColor: TAB_ACTIVE_BG,
                      color: PC.white,
                      borderBottom: "2px solid #7c3aed",
                      marginBottom: "-1px",
                    }
                  : { color: PC.muted, backgroundColor: "transparent", borderBottom: "2px solid transparent" }
              }
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "#ffffff05";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tabButtonLabel(tab)}
            </button>
          );
        })}
      </div>

      {activeTab === "locataires" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {logement.est_colocation
            ? Array.from({ length: chambres }, (_, i) => i + 1).map((n) => {
                const loc = chambreMap.get(n);
                return (
                  <article key={n} className="rounded-xl p-4" style={panelCard}>
                    <h3 className="font-semibold">Chambre {n}</h3>
                    {loc ? (
                      <>
                        <p className="mt-1 text-sm">{loc.prenom} {loc.nom}</p>
                        <BtnSecondary className="mt-3" size="small" onClick={() => router.push("/locataires")}>
                          Ouvrir
                        </BtnSecondary>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm" style={{ color: PC.muted }}>Chambre disponible</p>
                        <BtnPrimary
                          className="mt-3"
                          size="small"
                          onClick={() => router.push(`/locataires?logement_id=${logementId}`)}
                        >
                          Assigner un locataire
                        </BtnPrimary>
                      </>
                    )}
                  </article>
                );
              })
            : (
              <article className="rounded-xl p-4" style={panelCard}>
                {locataires[0] ? (
                  <p>{locataires[0].prenom} {locataires[0].nom}</p>
                ) : (
                  <p style={{ color: PC.muted }}>Aucun locataire actif</p>
                )}
              </article>
            )}
        </div>
      ) : null}

      {activeTab === "quittances" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <BtnPrimary onClick={() => router.push(`/quittances?logement_id=${logementId}`)}>
              Nouvelle quittance
            </BtnPrimary>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {quittances.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <span>{q.mois}/{q.annee} · {q.total.toFixed(2)} €</span>
                <StatusBadge
                  status={q.envoyee ? "envoye" : "en_attente"}
                  label={q.envoyee ? "Envoyée" : "Non envoyée"}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "baux" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <BtnPrimary onClick={() => router.push(`/baux?logement_id=${logementId}`)}>Nouveau bail</BtnPrimary>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {baux.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <span>{b.type_bail} · {new Date(b.date_debut).toLocaleDateString("fr-FR")} - {new Date(b.date_fin).toLocaleDateString("fr-FR")}</span>
                <StatusBadge
                  status={b.statut === "actif" ? "actif" : "termine"}
                  label={b.statut === "actif" ? "Actif" : "Terminé"}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "etats-des-lieux" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <BtnPrimary onClick={() => router.push(`/etats-des-lieux?bail_logement_id=${logementId}`)}>
              Nouvel état des lieux
            </BtnPrimary>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {edls.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <Link href={`/etats-des-lieux/${e.id}`} style={{ color: PC.secondary }}>
                  {(e.type || e.type_etat || "État")} · {e.date_etat ? new Date(e.date_etat).toLocaleDateString("fr-FR") : "—"}
                </Link>
                <StatusBadge
                  status={e.statut === "termine" ? "termine" : "en_cours"}
                  label={e.statut === "termine" ? "Terminé" : "En cours"}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </section>
  );
}
