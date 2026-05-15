"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { canAccessSaisonnier, getOwnerPlan } from "@/lib/plan-limits";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { PC } from "@/lib/locavio-colors";

export default function SaisonnierLogementsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { proprietaireId, error } = await getCurrentProprietaireId();
      if (cancelled) return;
      if (error || !proprietaireId) {
        setChecking(false);
        return;
      }
      const plan = await getOwnerPlan(proprietaireId);
      if (cancelled) return;
      if (canAccessSaisonnier(plan)) {
        setAllowed(true);
        router.replace("/logements");
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <section className="locavio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }

  if (!allowed) {
    return <PlanFreeModuleUpsell variant="saisonnier" requiredPlan="pro" />;
  }

  return null;
}
