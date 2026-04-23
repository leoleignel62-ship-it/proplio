"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";
import { DocumentsTab } from "@/components/logement/documents-tab";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { supabase } from "@/lib/supabase";

type Logement = {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  code_postal: string;
  type: string;
  surface: number;
  est_colocation: boolean;
  nombre_chambres?: number | null;
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

const tabs = ["locataires", "quittances", "baux", "etats-des-lieux", "documents"] as const;
type TabId = (typeof tabs)[number];

function tabButtonLabel(tab: TabId): string {
  if (tab === "etats-des-lieux") return "États des lieux";
  if (tab === "documents") return "Documents 📁";
  return tab[0].toUpperCase() + tab.slice(1);
}

export default function LogementDetailPage() {
  const params = useParams<{ id: string }>();
  const logementId = params.id;
  const [activeTab, setActiveTab] = useState<TabId>("locataires");
  const [logement, setLogement] = useState<Logement | null>(null);
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [quittances, setQuittances] = useState<Quittance[]>([]);
  const [baux, setBaux] = useState<Bail[]>([]);
  const [edls, setEdls] = useState<Edl[]>([]);
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { proprietaireId } = await getCurrentProprietaireId();
      if (!proprietaireId || cancelled) return;
      const [logRes, locRes, quitRes, bauxRes, edlRes, ownerPlan] = await Promise.all([
        supabase
          .from("logements")
          .select("id, nom, adresse, ville, code_postal, type, surface, est_colocation, nombre_chambres, verrouille")
          .eq("id", logementId)
          .eq("proprietaire_id", proprietaireId)
          .maybeSingle(),
        supabase.from("locataires").select("id, nom, prenom, colocation_chambre_index").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId),
        supabase.from("quittances").select("id, mois, annee, total, envoyee, locataire_id").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
        supabase.from("baux").select("id, type_bail, date_debut, date_fin, statut, locataire_id").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
        supabase.from("etats_des_lieux").select("id, type, type_etat, date_etat, statut").eq("proprietaire_id", proprietaireId).eq("logement_id", logementId).order("created_at", { ascending: false }),
        getOwnerPlan(proprietaireId),
      ]);
      if (cancelled) return;
      setPlan(ownerPlan);
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

  const chambres = useMemo(() => Math.max(1, Number(logement?.nombre_chambres || 1)), [logement?.nombre_chambres]);
  const chambreMap = useMemo(() => {
    const map = new Map<number, Locataire>();
    for (const loc of locataires) {
      if (loc.colocation_chambre_index) map.set(loc.colocation_chambre_index, loc);
    }
    return map;
  }, [locataires]);

  if (loading) return <section className="proplio-page-wrap text-sm" style={{ color: PC.muted }}>Chargement…</section>;
  if (!logement) return <section className="proplio-page-wrap text-sm" style={{ color: PC.muted }}>Logement introuvable.</section>;
  if (logement.verrouille) {
    return (
      <section className="proplio-page-wrap text-sm" style={{ color: PC.warning }}>
        🔒 Passez à un plan supérieur pour accéder à ce logement.
      </section>
    );
  }

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <nav className="text-sm" style={{ color: PC.muted }}>
        <Link href="/logements" style={{ color: PC.secondary }}>Logements</Link> &gt; {logement.nom}
      </nav>
      <header className="rounded-xl p-5" style={panelCard}>
        <h1 className="text-3xl font-semibold">{logement.nom}</h1>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          {logement.adresse}, {logement.code_postal} {logement.ville}
        </p>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          {logement.type} · {Number(logement.surface || 0).toFixed(1)} m²
        </p>
        <div className="mt-4">
          <Link href="/logements" className="proplio-btn-secondary">Modifier le logement</Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className="rounded-lg px-3 py-2 text-sm"
            style={activeTab === tab ? { backgroundColor: PC.primary, color: PC.white } : { backgroundColor: PC.card, color: PC.muted, border: `1px solid ${PC.border}` }}
            onClick={() => setActiveTab(tab)}
          >
            {tabButtonLabel(tab)}
          </button>
        ))}
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
                        <Link href="/locataires" className="mt-3 inline-block proplio-btn-secondary">Voir le profil</Link>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-sm" style={{ color: PC.muted }}>Chambre disponible</p>
                        <Link href={`/locataires?logement_id=${logementId}`} className="mt-3 inline-block proplio-btn-primary">Assigner un locataire</Link>
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
            <Link href={`/quittances?logement_id=${logementId}`} className="proplio-btn-primary">Nouvelle quittance</Link>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {quittances.map((q) => (
              <div key={q.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <span>{q.mois}/{q.annee} · {q.total.toFixed(2)} €</span>
                <span style={{ color: q.envoyee ? PC.success : PC.warning }}>{q.envoyee ? "Envoyée" : "Non envoyée"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "baux" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/baux?logement_id=${logementId}`} className="proplio-btn-primary">Nouveau bail</Link>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {baux.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <span>{b.type_bail} · {new Date(b.date_debut).toLocaleDateString("fr-FR")} - {new Date(b.date_fin).toLocaleDateString("fr-FR")}</span>
                <span style={{ color: b.statut === "actif" ? PC.success : PC.muted }}>{b.statut === "actif" ? "Actif" : "Terminé"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "etats-des-lieux" ? (
        <section className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/etats-des-lieux?bail_logement_id=${logementId}`} className="proplio-btn-primary">Nouvel état des lieux</Link>
          </div>
          <div className="rounded-xl p-4" style={panelCard}>
            {edls.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b py-2 last:border-b-0" style={{ borderColor: PC.border }}>
                <Link href={`/etats-des-lieux/${e.id}`} style={{ color: PC.secondary }}>
                  {(e.type || e.type_etat || "État")} · {e.date_etat ? new Date(e.date_etat).toLocaleDateString("fr-FR") : "—"}
                </Link>
                <span style={{ color: e.statut === "termine" ? PC.success : PC.warning }}>{e.statut}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="space-y-3">
          <DocumentsTab logementId={logement.id} plan={plan} />
        </section>
      ) : null}
    </section>
  );
}
