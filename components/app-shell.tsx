"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];

const shellStyle = { backgroundColor: "#0F0F13" as const };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    if (isAuthPage) return;
    void ensureProprietaireRow();
  }, [isAuthPage]);

  if (isAuthPage) {
    return (
      <main
        className="flex min-h-screen items-center justify-center p-4"
        style={shellStyle}
      >
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={shellStyle}>
      <NavigationSidebar />
      <main className="flex-1 p-4 md:p-8 md:pl-6">{children}</main>
    </div>
  );
}
