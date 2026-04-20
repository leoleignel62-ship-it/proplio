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
import { PC } from "@/lib/proplio-colors";
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
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  isActive: boolean;
}) {
  const [hover, setHover] = useState(false);

  const activeStyle: CSSProperties = {
    backgroundColor: PC.primary,
    color: PC.white,
    boxShadow: "0 4px 14px -2px rgba(124, 58, 237, 0.35)",
  };

  const idleStyle: CSSProperties = {
    color: hover ? PC.text : PC.muted,
    backgroundColor: hover ? PC.card : "transparent",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
      style={isActive ? activeStyle : idleStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        style={{ color: isActive ? PC.white : PC.secondary }}
      />
      {label}
    </Link>
  );
}

export function NavigationSidebar() {
  const pathname = usePathname();
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

  const asideStyle: CSSProperties = {
    backgroundColor: PC.sidebar,
    borderRight: `1px solid ${PC.border}`,
  };

  const mobileBarStyle: CSSProperties = {
    backgroundColor: PC.sidebar,
    borderBottom: `1px solid ${PC.border}`,
  };

  const profileCardStyle: CSSProperties = {
    backgroundColor: PC.cardAlpha80,
    border: `1px solid ${PC.border}`,
  };

  const avatarRingStyle: CSSProperties = {
    backgroundColor: PC.primaryBg25,
    color: PC.secondary,
  };

  const logoBadgeStyle: CSSProperties = {
    backgroundColor: PC.primaryBg20,
    color: PC.primary,
  };

  return (
    <>
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col md:flex" style={asideStyle}>
        <div className="flex flex-1 flex-col p-5">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={logoBadgeStyle}>
              <IconHome className="h-6 w-6" style={{ color: PC.primary }} />
            </span>
            <span className="text-lg font-semibold tracking-tight" style={{ color: PC.text }}>
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

          <div className="mt-auto pt-5" style={{ borderTop: `1px solid ${PC.border}` }}>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={profileCardStyle}>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={avatarRingStyle}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                {ownerName ? (
                  <p className="truncate text-sm font-medium" style={{ color: PC.text }}>
                    {ownerName}
                  </p>
                ) : null}
                {email ? (
                  <p className="truncate text-xs" style={{ color: PC.muted }}>
                    {email}
                  </p>
                ) : null}
              </div>
            </div>
            <LogoutRowMuted />
          </div>
        </div>
      </aside>

      <div className="px-4 py-3 md:hidden" style={mobileBarStyle}>
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={logoBadgeStyle}>
            <IconHome className="h-5 w-5" style={{ color: PC.primary }} />
          </span>
          <span className="font-semibold" style={{ color: PC.text }}>
            Proplio
          </span>
        </Link>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <MobileNavPill key={item.href} href={item.href} isActive={isActive} Icon={Icon} label={item.label} />
            );
          })}
        </nav>
        <MobileLogoutButton />
      </div>
    </>
  );
}

function LogoutRowMuted() {
  const [h, setH] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      className="mt-3 w-full rounded-xl px-3 py-2 text-left text-xs transition"
      style={{ color: h ? PC.text : PC.muted, backgroundColor: h ? PC.card : "transparent" }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}

function MobileNavPill({
  href,
  isActive,
  Icon,
  label,
}: {
  href: string;
  isActive: boolean;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
}) {
  const [h, setH] = useState(false);
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
      style={
        isActive
          ? { backgroundColor: PC.primary, color: PC.white }
          : {
              color: h ? PC.text : PC.muted,
              backgroundColor: h ? PC.card : "transparent",
            }
      }
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? PC.white : PC.secondary }} />
      {label}
    </Link>
  );
}

function MobileLogoutButton() {
  const [h, setH] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      className="mt-3 w-full rounded-xl py-2 text-sm transition"
      style={{
        border: `1px solid ${PC.border}`,
        color: h ? PC.text : PC.muted,
        backgroundColor: h ? PC.card : "transparent",
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Déconnexion
    </button>
  );
}
