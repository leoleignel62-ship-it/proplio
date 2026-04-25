"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = publicPages.includes(pathname);
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [proprietaireId, setProprietaireId] = useState<string | null>(null);
  const [onboardingFreeDone, setOnboardingFreeDone] = useState(true);
  const [onboardingPaidDone, setOnboardingPaidDone] = useState(true);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [forceOpenOnboarding, setForceOpenOnboarding] = useState(false);

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
        onboarding_paid_done?: boolean | null;
      };
      setProprietaireId(ownerData.id ?? null);
      setPlan(normalizePlan(ownerData.plan));
      setOnboardingFreeDone(Boolean(ownerData.onboarding_free_done));
      setOnboardingPaidDone(Boolean(ownerData.onboarding_paid_done));
      setOnboardingReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPublicPage]);

  useEffect(() => {
    if (isPublicPage) return;
    const handler = () => setForceOpenOnboarding(true);
    window.addEventListener("proplio:onboarding:open", handler);
    return () => window.removeEventListener("proplio:onboarding:open", handler);
  }, [isPublicPage]);

  const shouldShowOnboarding = useMemo(() => {
    if (isPublicPage || !onboardingReady || !proprietaireId) return false;
    if (forceOpenOnboarding) return true;
    if (plan === "free") return !onboardingFreeDone;
    return !onboardingPaidDone;
  }, [
    forceOpenOnboarding,
    isPublicPage,
    onboardingFreeDone,
    onboardingPaidDone,
    onboardingReady,
    plan,
    proprietaireId,
  ]);

  async function handleCloseOnboarding() {
    if (!proprietaireId) return;
    const patch = plan === "free" ? { onboarding_free_done: true } : { onboarding_paid_done: true };
    await supabase.from("proprietaires").update(patch).eq("id", proprietaireId);
    if (plan === "free") setOnboardingFreeDone(true);
    else setOnboardingPaidDone(true);
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
              proprietaireId={proprietaireId}
              onClose={handleCloseOnboarding}
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
