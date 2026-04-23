"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { DashboardVueGlobaleCard } from "@/components/dashboard-vue-globale-card";
import {
  IconBank,
  IconCalendar,
  IconChart,
  IconEuroCircle,
} from "@/components/proplio-icons";
import { isProprietaireOnboardingIncomplete } from "@/lib/proprietaire-profile";
import { useModeLocation } from "@/lib/mode-location";
import {
  emptySaisonnierDash,
  getEncaisseClassiqueMoisCourant,
  getPortfolioKind,
  getSaisonnierDashboardSnapshot,
  type PortfolioKind,
  type SaisonnierDashData,
} from "@/lib/saisonnier-dashboard-metrics";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PC } from "@/lib/proplio-colors";

function StatCard({
  titre,
  valeur,
  description,
  icon: Icon,
  iconTint,
}: {
  titre: string;
  valeur: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  iconTint: string;
}) {
  return (
    <article
      className="relative overflow-hidden p-5 transition-shadow duration-200 ease-out"
      style={{
        backgroundColor: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 pr-2">
          <p className="text-[13px] font-medium leading-snug" style={{ color: PC.muted }}>
            {titre}
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-[-0.03em] sm:text-[34px]" style={{ color: PC.text }}>
            {valeur}
          </p>
          <p className="mt-2 text-sm font-normal leading-[1.6]" style={{ color: PC.muted }}>
            {description}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: `${iconTint}22`,
            color: iconTint,
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <Icon className="!h-5 !w-5 shrink-0" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function SaisonnierDashboardContent() {
  const { setMode } = useModeLocation();
  const [prenom, setPrenom] = useState("");
  const [showProfileOnboardingBanner, setShowProfileOnboardingBanner] = useState(false);
  const [saisonnier, setSaisonnier] = useState<SaisonnierDashData>(emptySaisonnierDash);
  const [portfolioKind, setPortfolioKind] = useState<PortfolioKind>("onlyClassique");
  const [encaisseClassiqueMois, setEncaisseClassiqueMois] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        const { data: proprietaire, error: propError } = await supabase
          .from("proprietaires")
          .select("id, prenom, nom, adresse")
          .eq("user_id", user.id)
          .maybeSingle();

        if (propError || cancelled) return;

        const name = (proprietaire?.prenom as string | undefined)?.trim() ?? "";
        if (!cancelled) setPrenom(name);

        const incomplete = isProprietaireOnboardingIncomplete({
          nom: String(proprietaire?.nom ?? ""),
          prenom: String(proprietaire?.prenom ?? ""),
          adresse: String(proprietaire?.adresse ?? ""),
        });
        if (!cancelled) setShowProfileOnboardingBanner(incomplete);

        const ownerId = proprietaire?.id as string | undefined;
        if (!ownerId || cancelled) return;

        const [snap, kind] = await Promise.all([
          getSaisonnierDashboardSnapshot(supabase, ownerId),
          getPortfolioKind(supabase, ownerId),
        ]);

        if (cancelled) return;
        setSaisonnier(snap);
        setPortfolioKind(kind);

        if (kind === "mixed") {
          const enc = await getEncaisseClassiqueMoisCourant(supabase, ownerId);
          if (!cancelled) setEncaisseClassiqueMois(enc);
        } else if (!cancelled) {
          setEncaisseClassiqueMois(0);
        }
      } catch {
        /* garder zéros */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmReservation = useCallback(async (id: string) => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("reservations").update({ statut: "confirmee" }).eq("id", id);
      if (error) return;
      setSaisonnier((prev) => ({
        ...prev,
        enAttente: prev.enAttente.filter((r) => r.id !== id),
        resaActives: prev.resaActives + 1,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  const dateLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      {showProfileOnboardingBanner ? (
        <div
          className="flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            backgroundColor: PC.primaryBg10,
            border: `1px solid ${PC.primaryBorder40}`,
            boxShadow: PC.cardShadow,
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: PC.text }}>
            👤 Complétez votre profil propriétaire pour que vos quittances et baux soient générés correctement.
          </p>
          <Link
            href="/parametres"
            className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition"
            style={{ backgroundColor: PC.primary, color: PC.white }}
          >
            Compléter mon profil
          </Link>
        </div>
      ) : null}

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">{`Bonjour${prenom ? ` ${prenom}` : ""}`}</h1>
          <p className="proplio-page-subtitle capitalize">{dateLong}</p>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            Tableau de bord — location saisonnière
          </p>
        </div>
      </header>

      {portfolioKind === "mixed" ? (
        <DashboardVueGlobaleCard
          encaisseClassiqueMois={encaisseClassiqueMois}
          revenusSaisonnierMois={saisonnier.revenusMois}
          otherModeHref="/"
          otherModeLabel="Ouvrir l’espace classique →"
          onNavigateOther={() => setMode("classique")}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titre="Revenus du mois"
          valeur={`${saisonnier.revenusMois.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
          description="Réservations terminées ou en cours (quote-part mois)."
          icon={IconEuroCircle}
          iconTint={PC.success}
        />
        <StatCard
          titre="Taux d'occupation"
          valeur={`${Math.round(saisonnier.tauxOccupation)} %`}
          description="Nuits occupées / nuits disponibles (logements saisonniers)."
          icon={IconChart}
          iconTint={PC.primary}
        />
        <StatCard
          titre="Réservations actives"
          valeur={saisonnier.resaActives}
          description="Confirmées ou en cours."
          icon={IconCalendar}
          iconTint={PC.secondary}
        />
        <StatCard
          titre="Taxe de séjour"
          valeur={`${saisonnier.taxesAReverser.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`}
          description="Total non encore reversé."
          icon={IconBank}
          iconTint={PC.warning}
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-2" style={{ color: PC.text }}>
        <div className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <h3 className="text-base font-semibold">Prochains check-in</h3>
          <p className="mt-1 text-xs" style={{ color: PC.muted }}>
            Dans les 7 jours
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {saisonnier.checkins.length === 0 ? (
              <li style={{ color: PC.muted }}>Aucun check-in prévu.</li>
            ) : (
              saisonnier.checkins.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col rounded-lg px-3 py-2"
                  style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}
                >
                  <span className="font-medium">{row.logements?.nom ?? "Logement"}</span>
                  <span style={{ color: PC.muted }}>
                    {(row.voyageurs?.prenom ?? "?") + " " + (row.voyageurs?.nom ?? "")} ·{" "}
                    {new Date(row.date_arrivee).toLocaleDateString("fr-FR")} · {row.nb_voyageurs} pers.
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
          <h3 className="text-base font-semibold">Prochains check-out</h3>
          <p className="mt-1 text-xs" style={{ color: PC.muted }}>
            Dans les 7 jours
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {saisonnier.checkouts.length === 0 ? (
              <li style={{ color: PC.muted }}>Aucun check-out prévu.</li>
            ) : (
              saisonnier.checkouts.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col rounded-lg px-3 py-2"
                  style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}
                >
                  <span className="font-medium">{row.logements?.nom ?? "Logement"}</span>
                  <span style={{ color: PC.muted }}>
                    {new Date(row.date_depart).toLocaleDateString("fr-FR")}
                    {row.menage_prevu ? (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-xs" style={{ backgroundColor: PC.primaryBg15, color: PC.secondary }}>
                        Ménage prévu
                      </span>
                    ) : null}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-xl p-5" style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}>
        <h3 className="text-base font-semibold" style={{ color: PC.text }}>
          Réservations en attente
        </h3>
        <ul className="mt-3 divide-y" style={{ borderColor: PC.border }}>
          {saisonnier.enAttente.length === 0 ? (
            <li className="py-3 text-sm" style={{ color: PC.muted }}>
              Aucune réservation en attente.
            </li>
          ) : (
            saisonnier.enAttente.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium" style={{ color: PC.text }}>
                    {row.logements?.nom ?? "Logement"}
                  </span>
                  <span className="ml-2" style={{ color: PC.muted }}>
                    {(row.voyageurs?.prenom ?? "") + " " + (row.voyageurs?.nom ?? "")} ·{" "}
                    {new Date(row.date_arrivee).toLocaleDateString("fr-FR")} →{" "}
                    {new Date(row.date_depart).toLocaleDateString("fr-FR")} · {row.tarif_total.toFixed(0)} €
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: PC.primary, color: PC.white }}
                  onClick={() => void confirmReservation(row.id)}
                >
                  Confirmer
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </>
  );
}
