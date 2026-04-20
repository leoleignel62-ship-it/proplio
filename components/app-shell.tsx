"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    if (isAuthPage) return;
    void ensureProprietaireRow();
  }, [isAuthPage]);

  if (isAuthPage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-proplio-bg p-4">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-proplio-bg md:flex-row">
      <NavigationSidebar />
      <main className="flex-1 p-4 md:p-8 md:pl-6">{children}</main>
    </div>
  );
}
