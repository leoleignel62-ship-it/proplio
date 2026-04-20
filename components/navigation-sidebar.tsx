"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  IconBuilding,
  IconChart,
  IconClipboard,
  IconCog,
  IconContract,
  IconDocument,
  IconHome,
  IconUsers,
} from "@/components/proplio-icons";
import { supabase } from "@/lib/supabase";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: IconChart },
  { href: "/logements", label: "Logements", icon: IconBuilding },
  { href: "/locataires", label: "Locataires", icon: IconUsers },
  { href: "/quittances", label: "Quittances", icon: IconDocument },
  { href: "/baux", label: "Baux", icon: IconContract },
  { href: "/etats-des-lieux", label: "États des lieux", icon: IconClipboard },
  { href: "/parametres", label: "Paramètres", icon: IconCog },
] as const;

function NavLink({
  href,
  label,
  Icon,
  isActive,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        isActive
          ? "flex items-center gap-3 rounded-xl bg-proplio-primary px-3 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_-2px_rgb(124_58_237/0.35)]"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-proplio-muted transition hover:bg-proplio-card hover:text-proplio-text"
      }
    >
      <Icon className={isActive ? "text-white" : "text-proplio-secondary"} />
      {label}
    </Link>
  );
}

export function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setEmail(user.email ?? null);
      const { data: row } = await supabase
        .from("proprietaires")
        .select("prenom, nom")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !row) return;
      const n = `${row.prenom ?? ""} ${row.nom ?? ""}`.trim();
      setOwnerName(n || null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const initials = useMemo(() => {
    if (ownerName) {
      const parts = ownerName.split(/\s+/).filter(Boolean);
      const a = parts[0]?.[0] ?? "";
      const b = parts[1]?.[0] ?? "";
      return (a + b).toUpperCase() || a.toUpperCase() || "?";
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
  }, [ownerName, email]);

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-proplio-border bg-proplio-sidebar md:flex">
        <div className="flex flex-1 flex-col p-5">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-proplio-primary/20 text-proplio-primary">
              <IconHome className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-proplio-text">Proplio</span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                isActive={pathname === item.href}
              />
            ))}
          </nav>

          <div className="mt-auto border-t border-proplio-border pt-5">
            <div className="flex items-center gap-3 rounded-xl border border-proplio-border bg-proplio-card/80 px-3 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-proplio-primary/25 text-xs font-semibold text-proplio-secondary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                {ownerName ? (
                  <p className="truncate text-sm font-medium text-proplio-text">{ownerName}</p>
                ) : null}
                {email ? <p className="truncate text-xs text-proplio-muted">{email}</p> : null}
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl px-3 py-2 text-left text-xs text-proplio-muted transition hover:bg-proplio-card hover:text-proplio-text"
              onClick={onLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="border-b border-proplio-border bg-proplio-sidebar px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-proplio-primary/20 text-proplio-primary">
            <IconHome className="h-5 w-5" />
          </span>
          <span className="font-semibold text-proplio-text">Proplio</span>
        </Link>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "flex shrink-0 items-center gap-2 rounded-xl bg-proplio-primary px-3 py-2 text-sm font-medium text-white"
                    : "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-proplio-muted hover:bg-proplio-card hover:text-proplio-text"
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-proplio-border py-2 text-sm text-proplio-muted hover:bg-proplio-card hover:text-proplio-text"
          onClick={onLogout}
        >
          Déconnexion
        </button>
      </div>
    </>
  );
}
