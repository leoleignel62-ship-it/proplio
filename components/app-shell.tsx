"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { OnboardingModal, type OnboardingStep } from "@/components/onboarding-modal";
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
const ONBOARDING_SNOOZE_MS = 24 * 60 * 60 * 1000;
const ONBOARDING_WAITING_STEP_KEY = "onboarding_waiting_step";
const ONBOARDING_CHECK_EVENT = "onboarding:check";
const PLAN_LEVEL: Record<ProplioPlan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  expert: 3,
};

const FREE_BASE_STEPS = [
  {
    key: "profile",
    emoji: "👤",
    title: "Complétez votre profil",
    description: "Ajoutez votre nom, adresse et signature pour personnaliser vos documents.",
    href: "/parametres",
  },
  {
    key: "logements",
    emoji: "🏠",
    title: "Créez votre logement",
    description: "Ajoutez votre bien immobilier pour commencer à le gérer.",
    href: "/logements",
  },
  {
    key: "locataires",
    emoji: "👥",
    title: "Ajoutez votre locataire",
    description: "Renseignez les informations de votre locataire.",
    href: "/locataires",
  },
  {
    key: "quittances",
    emoji: "📄",
    title: "Générez votre première quittance",
    description: "Créez et envoyez votre quittance en quelques clics.",
    href: "/quittances",
  },
] as const;

type StepProgress = {
  profile: boolean;
  logements: boolean;
  locataires: boolean;
  quittances: boolean;
};

function makeSnoozeStorageKey(ownerId: string, plan: ProplioPlan): string {
  return `proplio:onboarding:snooze-until:${ownerId}:${plan === "free" ? "free" : "paid"}`;
}

function buildOnboardingSteps(plan: ProplioPlan, progress: StepProgress): OnboardingStep[] {
  if (plan !== "free") return [];
  return [...FREE_BASE_STEPS].map((step) => ({ ...step, done: Boolean(progress[step.key as keyof StepProgress]) }));
}

function countDone(steps: OnboardingStep[]): number {
  return steps.reduce((acc, step) => acc + (step.done ? 1 : 0), 0);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.includes(pathname);
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [onboardingFreeDone, setOnboardingFreeDone] = useState(true);
  const [onboardingPlanVu, setOnboardingPlanVu] = useState<string | null>(null);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [forceOpenOnboarding, setForceOpenOnboarding] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [suppressedUntil, setSuppressedUntil] = useState(0);
  const [waitingStep, setWaitingStep] = useState<string | null>(null);

  const normalizedOnboardingPlanVu = normalizePlan(onboardingPlanVu);
  const isPaidUpgradeNeedingWelcome =
    plan !== "free" &&
    (onboardingPlanVu == null || PLAN_LEVEL[plan] > PLAN_LEVEL[normalizedOnboardingPlanVu]);
  const onboardingDbDone = plan === "free" ? onboardingFreeDone : !isPaidUpgradeNeedingWelcome;
  const onboardingPending = onboardingReady && Boolean(proprietaireId) && !onboardingDbDone;

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
        onboarding_free_done?: boolean | null;
        onboarding_plan_vu?: string | null;
      };
      setProprietaireId(ownerData.id ?? null);
      setPlan(normalizePlan(ownerData.plan));
      setOnboardingFreeDone(Boolean(ownerData.onboarding_free_done));
      setOnboardingPlanVu(ownerData.onboarding_plan_vu ?? null);
      setOnboardingReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublicPage]);

  useEffect(() => {
    if (!proprietaireId) return;
    const key = makeSnoozeStorageKey(proprietaireId, plan);
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    const parsed = raw ? Number(raw) : 0;
    setSuppressedUntil(Number.isFinite(parsed) ? parsed : 0);
    setWaitingStep(window.localStorage.getItem(ONBOARDING_WAITING_STEP_KEY));
  }, [plan, proprietaireId]);

  const fetchStepProgress = useCallback(async (): Promise<StepProgress | null> => {
    if (!proprietaireId || !onboardingPending || plan !== "free") return null;
    const [ownerResult, logementsResult, locatairesResult, quittancesResult] =
      await Promise.all([
        supabase.from("proprietaires").select("nom, prenom, adresse").eq("id", proprietaireId).maybeSingle(),
        supabase.from("logements").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase.from("locataires").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
        supabase.from("quittances").select("id", { count: "exact", head: true }).eq("proprietaire_id", proprietaireId),
      ]);
    const owner = ownerResult.data as { nom?: string | null; prenom?: string | null; adresse?: string | null } | null;
    return {
      profile: Boolean(owner?.nom?.trim()) && Boolean(owner?.prenom?.trim()) && Boolean(owner?.adresse?.trim()),
      logements: Number(logementsResult.count ?? 0) >= 1,
      locataires: Number(locatairesResult.count ?? 0) >= 1,
      quittances: Number(quittancesResult.count ?? 0) >= 1,
    };
  }, [onboardingPending, plan, proprietaireId]);

  const refreshOnboardingSteps = useCallback(async () => {
    const progress = await fetchStepProgress();
    if (!progress) return null;
    const nextSteps = buildOnboardingSteps(plan, progress);
    setOnboardingSteps(nextSteps);
    return progress;
  }, [fetchStepProgress, plan]);

  useEffect(() => {
    if (!onboardingPending) return;
    if (plan !== "free") {
      setOnboardingOpen(true);
      return;
    }
    void (async () => {
      await refreshOnboardingSteps();
      const canAutoOpenInitially = Date.now() >= suppressedUntil && !waitingStep;
      if (canAutoOpenInitially) setOnboardingOpen(true);
    })();
  }, [onboardingPending, plan, refreshOnboardingSteps, suppressedUntil, waitingStep]);

  useEffect(() => {
    if (!onboardingPending || plan !== "free") return;
    void (async () => {
      const progress = await refreshOnboardingSteps();
      if (!progress || !waitingStep) return;
      const waitingDone = Boolean(progress[waitingStep as keyof StepProgress]);
      if (!waitingDone) return;
      window.localStorage.removeItem(ONBOARDING_WAITING_STEP_KEY);
      setWaitingStep(null);
      setOnboardingOpen(true);
      setForceOpenOnboarding(false);
    })();
  }, [onboardingPending, pathname, plan, refreshOnboardingSteps, waitingStep]);

  useEffect(() => {
    if (isPublicPage || !onboardingPending || plan !== "free") return;
    const handleOnboardingCheck = () => {
      void (async () => {
        const previousSteps = onboardingSteps;
        const progress = await refreshOnboardingSteps();
        if (!progress) return;
        const nextSteps = buildOnboardingSteps(plan, progress);
        const hasNewCompletion = countDone(nextSteps) > countDone(previousSteps);
        if (!hasNewCompletion) return;
        window.localStorage.removeItem(ONBOARDING_WAITING_STEP_KEY);
        setWaitingStep(null);
        setOnboardingOpen(true);
        setForceOpenOnboarding(false);
      })();
    };
    window.addEventListener(ONBOARDING_CHECK_EVENT, handleOnboardingCheck);
    return () => window.removeEventListener(ONBOARDING_CHECK_EVENT, handleOnboardingCheck);
  }, [isPublicPage, onboardingPending, onboardingSteps, plan, refreshOnboardingSteps]);

  useEffect(() => {
    if (isPublicPage) return;
    const handler = () => {
      setForceOpenOnboarding(true);
      setOnboardingOpen(true);
      if (plan === "free") {
        void refreshOnboardingSteps();
      }
    };
    window.addEventListener("proplio:onboarding:open", handler);
    return () => window.removeEventListener("proplio:onboarding:open", handler);
  }, [isPublicPage, plan, refreshOnboardingSteps]);

  const shouldShowOnboarding = useMemo(() => {
    if (isPublicPage || !onboardingPending) return false;
    return onboardingOpen || forceOpenOnboarding;
  }, [
    forceOpenOnboarding,
    isPublicPage,
    onboardingOpen,
    onboardingPending,
  ]);

  async function handleCompleteOnboarding() {
    if (!proprietaireId) return;
    const patch = plan === "free" ? { onboarding_free_done: true } : { onboarding_plan_vu: plan };
    await supabase.from("proprietaires").update(patch).eq("id", proprietaireId);
    if (plan === "free") setOnboardingFreeDone(true);
    else setOnboardingPlanVu(plan);
    setForceOpenOnboarding(false);
    setOnboardingOpen(false);
    window.localStorage.removeItem(ONBOARDING_WAITING_STEP_KEY);
    setWaitingStep(null);
  }

  function handleDismissOnboarding() {
    if (!proprietaireId) return;
    const nextSuppressedUntil = Date.now() + ONBOARDING_SNOOZE_MS;
    setSuppressedUntil(nextSuppressedUntil);
    window.localStorage.setItem(makeSnoozeStorageKey(proprietaireId, plan), String(nextSuppressedUntil));
    setOnboardingOpen(false);
    setForceOpenOnboarding(false);
  }

  function handleNavigateFromOnboarding(step: OnboardingStep) {
    window.localStorage.setItem(ONBOARDING_WAITING_STEP_KEY, step.key);
    setWaitingStep(step.key);
    setOnboardingOpen(false);
    setForceOpenOnboarding(false);
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
              steps={onboardingSteps}
              onDismiss={handleDismissOnboarding}
              onComplete={handleCompleteOnboarding}
              onNavigateStep={handleNavigateFromOnboarding}
            />
          ) : null}
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
