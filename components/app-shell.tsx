"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { GuidedTour } from "@/components/guided-tour";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ToastProvider } from "@/components/ui/toast";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { normalizePlan, type ProplioPlan } from "@/lib/plan-limits";
import { PC } from "@/lib/proplio-colors";
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
];

const shellStyle = { backgroundColor: PC.bg, color: PC.text } as const;
const GUIDED_TOUR_DONE_KEY = "guided_tour_done";
const START_GUIDED_TOUR_EVENT = "start:guided-tour";
const PLAN_LEVEL: Record<ProplioPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  expert: 3,
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.includes(pathname);
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [onboardingPlanVu, setOnboardingPlanVu] = useState<string | null>(null);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

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
        plan?: string | null;
        onboarding_plan_vu?: string | null;
      };
      setProprietaireId(ownerData.id ?? null);
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
    if (isPublicPage || !onboardingReady) return;
    if (window.localStorage.getItem(GUIDED_TOUR_DONE_KEY)) return;
    if (needsPaidWelcome) return;
    setShowGuidedTour(true);
  }, [isPublicPage, onboardingReady, needsPaidWelcome]);

  useEffect(() => {
    if (isPublicPage) return;
    const handler = () => setShowGuidedTour(true);
    window.addEventListener(START_GUIDED_TOUR_EVENT, handler);
    return () => window.removeEventListener(START_GUIDED_TOUR_EVENT, handler);
  }, [isPublicPage]);

  async function handleCompleteOnboarding() {
    if (!proprietaireId) return;
    const patch = { onboarding_plan_vu: plan };
    await supabase.from("proprietaires").update(patch).eq("id", proprietaireId);
    setOnboardingPlanVu(plan);
    setOnboardingOpen(false);
    window.setTimeout(() => setShowGuidedTour(true), 500);
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
            open={showGuidedTour}
            plan={plan}
            onClose={() => setShowGuidedTour(false)}
          />
          <footer className="mt-10 pb-4 text-center text-xs" style={{ color: PC.tertiary }}>
            © 2026 Proplio ·{" "}
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
