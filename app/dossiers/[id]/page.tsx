"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { BtnSecondary } from "@/components/ui";
import { formatBytes, NOTE_COLORS, TYPE_DOCUMENT_LABELS } from "@/lib/candidature";
import { PC } from "@/lib/locavio-colors";
import { getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

type DossierData = {
  id: string;
  logement_concerne: string;
  loyer_reference: number;
  statut: string;
  candidature_tokens?: Array<{
    id: string;
    token: string;
    email_candidat: string;
    prenom_candidat: string;
    nom_candidat: string;
    expire_at: string;
    soumis_at?: string;
  }>;
  candidature_formulaires?: Array<{
    type_contrat?: string;
    employeur?: string;
    anciennete_mois?: number;
    revenus_nets_mensuels?: number;
    a_garant?: boolean;
    type_garant?: string;
    revenus_garant?: number;
    situation?: string;
    nb_personnes_foyer?: number;
    score?: number;
    note?: string;
    details_score?: Record<string, { points?: number; max?: number }>;
  }>;
  candidature_documents?: Array<{ id: string; nom_fichier: string; type_document: string; taille_fichier: number }>;
};

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<LocavioPlan | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { proprietaireId: ownerId } = await getCurrentProprietaireId();
      const plan = ownerId ? await getOwnerPlan(ownerId) : "free";
      if (cancelled) return;
      setCurrentPlan(plan);
      if (plan === "free") {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("candidature_dossiers")
        .select(
          "id, logement_concerne, loyer_reference, statut, candidature_tokens(*), candidature_formulaires(*), candidature_documents(id, nom_fichier, type_document, taille_fichier)",
        )
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        setDossier((data as DossierData) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const token = dossier?.candidature_tokens?.[0];
  const form = dossier?.candidature_formulaires?.[0];
  const note = form?.note ?? "E";
  const noteColor = NOTE_COLORS[note] ?? { bg: PC.cardHover, color: PC.text };
  const score = Number(form?.score ?? 0);
  const candidateUrl =
    token && typeof window !== "undefined" ? `${window.location.origin}/candidature/${token.token}` : "";
  const details = (form?.details_score ?? {}) as Record<string, { points?: number; max?: number }>;
  const detailRows = useMemo<Array<[string, { points?: number; max?: number } | undefined]>>(
    () => [
      ["Ratio loyer", details.ratio_loyer],
      ["Contrat", details.contrat],
      ["Ancienneté", details.anciennete],
      ["Garant", details.garant],
      ["Situation", details.situation],
    ],
    [details],
  );

  async function copyLink() {
    if (candidateUrl) await navigator.clipboard.writeText(candidateUrl);
  }

  if (!loading && currentPlan === "free") return <PlanFreeModuleUpsell variant="dossiers" />;
  if (loading) return <section className="locavio-page-wrap">Chargement...</section>;
  if (!dossier) return <section className="locavio-page-wrap">Dossier introuvable.</section>;

  return (
    <section className="locavio-page-wrap space-y-5">
      <div className="locavio-card rounded-xl p-5">
        <h1 className="locavio-page-title text-2xl">Dossier candidature</h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>Logement concerné : {dossier.logement_concerne}</p>
        <p className="text-sm" style={{ color: PC.muted }}>Loyer de référence : {Number(dossier.loyer_reference).toFixed(2)} €</p>
        <p className="text-sm" style={{ color: PC.muted }}>Candidat : {token?.prenom_candidat} {token?.nom_candidat} ({token?.email_candidat})</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <BtnSecondary onClick={() => void copyLink()}>Copier le lien</BtnSecondary>
          <span className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: PC.primaryBg15, color: PC.secondary }}>
            Expire le {token?.expire_at ? new Date(token.expire_at).toLocaleDateString("fr-FR") : "—"}
          </span>
        </div>
      </div>

      {form ? (
        <div className="locavio-card rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">Score solvabilité</h2>
          <div className="flex items-center gap-3">
            <div className="h-3 w-full rounded-full" style={{ backgroundColor: PC.cardHover }}>
              <div className="h-3 rounded-full" style={{ width: `${Math.min(100, score)}%`, backgroundColor: noteColor.color }} />
            </div>
            <span className="text-sm">{score}/100</span>
          </div>
          <span className="inline-flex rounded-full px-3 py-1 text-sm font-semibold" style={{ backgroundColor: noteColor.bg, color: noteColor.color }}>
            Note {note}
          </span>
          <div className="grid gap-2 text-sm">
            {detailRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: PC.cardHover }}>
                <span>{label}</span>
                <span>{value?.points ?? 0} / {value?.max ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {form ? (
        <div className="locavio-card rounded-xl p-5">
          <h2 className="text-lg font-semibold">Informations candidat</h2>
          <div className="mt-3 grid gap-1 text-sm" style={{ color: PC.muted }}>
            <p>Type contrat : {form.type_contrat ?? "—"}</p>
            <p>Employeur : {form.employeur ?? "—"}</p>
            <p>Ancienneté : {form.anciennete_mois ?? "—"} mois</p>
            <p>Revenus nets : {form.revenus_nets_mensuels ?? "—"} €</p>
            <p>Garant : {form.a_garant ? "Oui" : "Non"} {form.type_garant ? `(${form.type_garant})` : ""}</p>
            <p>Situation : {form.situation ?? "—"} • Foyer : {form.nb_personnes_foyer ?? "—"}</p>
          </div>
        </div>
      ) : null}

      <div className="locavio-card rounded-xl p-5">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="mt-3 space-y-2">
          {(dossier.candidature_documents ?? []).map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: PC.cardHover }}>
              <div>
                <p className="text-sm">{doc.nom_fichier}</p>
                <p className="text-xs" style={{ color: PC.muted }}>{TYPE_DOCUMENT_LABELS[doc.type_document] ?? doc.type_document} • {formatBytes(Number(doc.taille_fichier ?? 0))}</p>
              </div>
              <a className="locavio-btn-secondary text-xs" href={`/api/candidature/document/${doc.id}`}>Télécharger</a>
            </div>
          ))}
          {(dossier.candidature_documents ?? []).length === 0 ? <p className="text-sm" style={{ color: PC.muted }}>Aucun document uploadé.</p> : null}
        </div>
      </div>
    </section>
  );
}
