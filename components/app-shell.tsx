"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { PC } from "@/lib/proplio-colors";

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

  useEffect(() => {
    if (isPublicPage) return;
    void ensureProprietaireRow();
  }, [isPublicPage]);

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
