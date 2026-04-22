"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ContentTopHeader, NavigationSidebar } from "@/components/navigation-sidebar";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { PC } from "@/lib/proplio-colors";

const authPages = ["/login", "/register", "/forgot-password", "/reset-password"];

const shellStyle = { backgroundColor: PC.bg, color: PC.text } as const;

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
    <div className="min-h-screen" style={shellStyle}>
      <NavigationSidebar />
      <ContentTopHeader />
      <main className="p-4 pt-[60px] md:ml-64 md:p-8 md:pt-[84px] md:pl-6">{children}</main>
    </div>
  );
}
