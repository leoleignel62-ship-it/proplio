"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import type { SaisonnierReservationOption } from "@/components/etat-des-lieux-saisonnier/saisonnier-edl-wizard";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

const SaisonnierEdlWizard = dynamic(
  () =>
    import("@/components/etat-des-lieux-saisonnier/saisonnier-edl-wizard").then((m) => ({
      default: m.SaisonnierEdlWizard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm" style={{ color: PC.muted }}>
          Chargement de l&apos;éditeur…
        </p>
      </div>
    ),
  },
);

export default function SaisonnierEdlDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const id = typeof routeParams?.id === "string" ? routeParams.id : null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<ProplioPlan | null>(null);
  const [reservations, setReservations] = useState<SaisonnierReservationOption[]>([]);

  const loadReservations = useCallback(async () => {
    const { proprietaireId, error: pe } = await getCurrentProprietaireId();
    if (pe || !proprietaireId) {
      setError(pe ? formatSubmitError(pe) : "Session invalide.");
      return;
    }
    const plan = await getOwnerPlan(proprietaireId);
    setCurrentPlan(plan);
    if (plan === "free") {
      setLoading(false);
      return;
    }
    const { data, error: re } = await supabase
      .from("reservations")
      .select("id, logement_id, voyageur_id, date_arrivee, date_depart, logements(nom), voyageurs(prenom, nom)")
      .eq("proprietaire_id", proprietaireId)
      .neq("source", "blocage")
      .order("date_arrivee", { ascending: false });
    if (re) setError(formatSubmitError(re));
    const resaList = (data ?? []).map((r) => {
      const rec = r as Record<string, unknown>;
      const vg = rec.voyageurs;
      const lg = rec.logements;
      const voyageursJoin = Array.isArray(vg) ? (vg[0] as Record<string, unknown>) : (vg as Record<string, unknown> | null);
      const logementsJoin = Array.isArray(lg) ? (lg[0] as Record<string, unknown>) : (lg as Record<string, unknown> | null);
      return {
        id: String(rec.id),
        logement_id: rec.logement_id ? String(rec.logement_id) : null,
        voyageur_id: rec.voyageur_id ? String(rec.voyageur_id) : null,
        voyageurLabel: `${String(voyageursJoin?.prenom ?? "")} ${String(voyageursJoin?.nom ?? "")}`.trim() || "Voyageur",
        logementLabel: String(logementsJoin?.nom ?? "Logement"),
        date_arrivee: String(rec.date_arrivee ?? ""),
        date_depart: String(rec.date_depart ?? ""),
      } satisfies SaisonnierReservationOption;
    });
    setReservations(resaList);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  if (!loading && currentPlan === "free") {
    return <PlanFreeModuleUpsell variant="etats-des-lieux" />;
  }

  if (loading || !id) {
    return (
      <section className="proplio-page-wrap p-8 text-sm" style={{ ...panelCard, color: PC.muted }}>
        Chargement…
      </section>
    );
  }

  if (error) {
    return (
      <section className="proplio-page-wrap p-8 text-sm" style={{ color: PC.danger }}>
        {error}
      </section>
    );
  }

  return (
    <section className="proplio-page-wrap min-h-[60vh]">
      <SaisonnierEdlWizard
        reservations={reservations}
        initialEdlId={id}
        onClose={() => router.push("/saisonnier/etats-des-lieux")}
        onSaved={() => void loadReservations()}
      />
    </section>
  );
}
