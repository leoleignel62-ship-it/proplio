"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";
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

const C = {
  sidebar: "#13131A",
  card: "#1A1A24",
  border: "#2D2D3D",
  text: "#F1F1F5",
  muted: "#9090A8",
  primary: "#7C3AED",
  secondary: "#A78BFA",
  white: "#FFFFFF",
} as const;

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
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  isActive: boolean;
}) {
  const activeStyle: CSSProperties = {
    backgroundColor: C.primary,
    color: C.white,
    boxShadow: "0 4px 14px -2px rgba(124, 58, 237, 0.35)",
  };
  const idleStyle: CSSProperties = { color: C.muted };

  return (
    <Link
      href={href}
      className={
        isActive
          ? "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-[#1A1A24] hover:text-[#F1F1F5]"
      }
      style={isActive ? activeStyle : idleStyle}
    >
      <Icon
        className={isActive ? "text-white" : undefined}
        style={isActive ? undefined : { color: C.secondary }}
      />
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

  const asideStyle: CSSProperties = {
    backgroundColor: C.sidebar,
    borderRight: `1px solid ${C.border}`,
  };

  const mobileBarStyle: CSSProperties = {
    backgroundColor: C.sidebar,
    borderBottom: `1px solid ${C.border}`,
  };

  const profileCardStyle: CSSProperties = {
    backgroundColor: "rgba(26, 26, 36, 0.8)",
    border: `1px solid ${C.border}`,
  };

  const avatarRingStyle: CSSProperties = {
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    color: C.secondary,
  };

  const logoBadgeStyle: CSSProperties = {
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    color: C.primary,
  };

  return (
    <>
      <aside
        className="hidden min-h-screen w-64 shrink-0 flex-col md:flex"
        style={asideStyle}
      >
        <div className="flex flex-1 flex-col p-5">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={logoBadgeStyle}
            >
              <IconHome className="h-6 w-6" />
            </span>
            <span className="text-lg font-semibold tracking-tight" style={{ color: C.text }}>
              Proplio
            </span>
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

          <div className="mt-auto pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={profileCardStyle}>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={avatarRingStyle}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                {ownerName ? (
                  <p className="truncate text-sm font-medium" style={{ color: C.text }}>
                    {ownerName}
                  </p>
                ) : null}
                {email ? (
                  <p className="truncate text-xs" style={{ color: C.muted }}>
                    {email}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[#1A1A24] hover:text-[#F1F1F5]"
              style={{ color: C.muted }}
              onClick={onLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="px-4 py-3 md:hidden" style={mobileBarStyle}>
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={logoBadgeStyle}
          >
            <IconHome className="h-5 w-5" />
          </span>
          <span className="font-semibold" style={{ color: C.text }}>
            Proplio
          </span>
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
                    ? "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                    : "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-[#1A1A24] hover:text-[#F1F1F5]"
                }
                style={
                  isActive
                    ? { backgroundColor: C.primary, color: C.white }
                    : { color: C.muted }
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
          className="mt-3 w-full rounded-xl py-2 text-sm hover:bg-[#1A1A24] hover:text-[#F1F1F5]"
          style={{ border: `1px solid ${C.border}`, color: C.muted }}
          onClick={onLogout}
        >
          Déconnexion
        </button>
      </div>
    </>
  );
}
