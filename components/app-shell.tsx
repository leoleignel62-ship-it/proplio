"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { GuidedTour } from "@/components/guided-tour";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ToastProvider } from "@/components/ui/toast";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { normalizePlan, type LocavioPlan } from "@/lib/plan-limits";
import { PC } from "@/lib/locavio-colors";
import { supabase } from "@/lib/supabase";

const publicPages = [
  "/landing",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/mentions-legales",
  "/cgu",
  "/politique-de-confidentialite",
  "/qui-sommes-nous",
  "/candidature",
];

const shellStyle = { backgroundColor: PC.bg, backgroundImage: PC.gradientBg, color: PC.text } as const;
const GUIDED_TOUR_FREE_DONE_KEY = "guided_tour_free_done";
const GUIDED_TOUR_PAID_DONE_KEY = "guided_tour_paid_done";
const START_GUIDED_TOUR_FREE_EVENT = "start:guided-tour-free";
const START_GUIDED_TOUR_PAID_EVENT = "start:guided-tour-paid";
const PLAN_LEVEL: Record<LocavioPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  expert: 3,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.includes(pathname) || pathname.startsWith("/candidature/");
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onboardingPlanVu, setOnboardingPlanVu] = useState<string | null>(null);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState<"free" | "paid" | null>(null);

  const normalizedOnboardingPlanVu = onboardingPlanVu == null ? null : normalizePlan(onboardingPlanVu);
  const isPaidPlan = plan !== "free";
  const isPaidDowngrade =
    isPaidPlan &&
    normalizedOnboardingPlanVu != null &&
    PLAN_LEVEL[plan] < PLAN_LEVEL[normalizedOnboardingPlanVu];
  const needsPaidWelcome =
    isPaidPlan &&
    (normalizedOnboardingPlanVu == null || (!isPaidDowngrade && normalizedOnboardingPlanVu !== plan));
  const onboardingPending = onboardingReady && Boolean(proprietaireId) && needsPaidWelcome;

  useEffect(() => {
    if (isPublicPage) return;
    let cancelled = false;
    void (async () => {
      const { data: owner, error } = await ensureProprietaireRow();
      if (cancelled) return;
      if (error || !owner) {
        setOnboardingReady(true);
        return;
      }

      const ownerData = owner as {
        id?: string | null;
        user_id?: string | null;
        plan?: string | null;
        onboarding_plan_vu?: string | null;
      };
      setProprietaireId(ownerData.id ?? null);
      setUserId(ownerData.user_id ?? null);
      setPlan(normalizePlan(ownerData.plan));
      setOnboardingPlanVu(ownerData.onboarding_plan_vu ?? null);
      setOnboardingReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublicPage]);

  useEffect(() => {
    if (onboardingPending) {
      setOnboardingOpen(true);
    }
  }, [onboardingPending]);

  const shouldShowOnboarding = useMemo(() => {
    if (isPublicPage || !onboardingPending) return false;
    return onboardingOpen;
  }, [isPublicPage, onboardingOpen, onboardingPending]);

  useEffect(() => {
    if (isPublicPage || !onboardingReady || !userId) return;

    async function loadGuidedTourStatus() {
      const cachedFree = window.localStorage.getItem(GUIDED_TOUR_FREE_DONE_KEY);
      const cachedPaid = window.localStorage.getItem(GUIDED_TOUR_PAID_DONE_KEY);

      if (cachedFree !== null && cachedPaid !== null) {
        return {
          freeDone: cachedFree === "true",
          paidDone: cachedPaid === "true",
        };
      }

      const { data } = await supabase
        .from("proprietaires")
        .select("guided_tour_free_done, guided_tour_paid_done")
        .eq("user_id", userId)
        .single();

      const freeDone = Boolean(
        (data as { guided_tour_free_done?: boolean | null } | null)?.guided_tour_free_done ?? false,
      );
      const paidDone = Boolean(
        (data as { guided_tour_paid_done?: boolean | null } | null)?.guided_tour_paid_done ?? false,
      );

      window.localStorage.setItem(GUIDED_TOUR_FREE_DONE_KEY, freeDone ? "true" : "false");
      window.localStorage.setItem(GUIDED_TOUR_PAID_DONE_KEY, paidDone ? "true" : "false");

      return { freeDone, paidDone };
    }

    let cancelled = false;
    void (async () => {
      const status = await loadGuidedTourStatus();
      if (cancelled) return;
      if (plan === "free" && !status.freeDone) {
        setShowGuidedTour("free");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPublicPage, onboardingReady, plan, userId]);

  useEffect(() => {
    if (isPublicPage) return;
    const startFreeTour = () => setShowGuidedTour("free");
    const startPaidTour = () => setShowGuidedTour("paid");
    window.addEventListener(START_GUIDED_TOUR_FREE_EVENT, startFreeTour);
    window.addEventListener(START_GUIDED_TOUR_PAID_EVENT, startPaidTour);
    return () => {
      window.removeEventListener(START_GUIDED_TOUR_FREE_EVENT, startFreeTour);
      window.removeEventListener(START_GUIDED_TOUR_PAID_EVENT, startPaidTour);
    };
  }, [isPublicPage]);

  async function handleCompleteOnboarding() {
    if (!proprietaireId) return;
    const patch = { onboarding_plan_vu: plan };
    await supabase.from("proprietaires").update(patch).eq("id", proprietaireId);
    setOnboardingPlanVu(plan);
    setOnboardingOpen(false);
    if (window.localStorage.getItem(GUIDED_TOUR_PAID_DONE_KEY) !== "true") {
      window.setTimeout(() => setShowGuidedTour("paid"), 500);
    }
  }

  if (isPublicPage) {
    return (
      <ToastProvider>
        <main className="min-h-screen" style={shellStyle}>{children}</main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen" style={shellStyle}>
        <NavigationSidebar />
        <main className="p-4 pt-[60px] md:ml-64 md:p-8 md:pt-[84px] md:pl-6">
          {children}
          {proprietaireId ? (
            <OnboardingModal
              open={shouldShowOnboarding}
              plan={plan}
              onComplete={handleCompleteOnboarding}
            />
          ) : null}
          <GuidedTour
            open={showGuidedTour !== null}
            tourType={showGuidedTour ?? "free"}
            currentPlan={plan}
            userId={userId}
            onClose={() => setShowGuidedTour(null)}
          />
          <footer className="mt-10 pb-4 text-center text-xs" style={{ color: PC.tertiary }}>
            © 2026 Locavio ·{" "}
            <a href="/mentions-legales" className="hover:underline">
              Mentions légales
            </a>{" "}
            ·{" "}
            <a href="/cgu" className="hover:underline">
              CGU
            </a>{" "}
            ·{" "}
            <a href="/politique-de-confidentialite" className="hover:underline">
              Politique de confidentialité
            </a>
          </footer>
        </main>
      </div>
    </ToastProvider>
  );
}
