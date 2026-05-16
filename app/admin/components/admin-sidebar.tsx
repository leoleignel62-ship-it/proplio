"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, Flag, LayoutDashboard, MessageCircle, Users } from "lucide-react";
import { SupportNavNotificationDot } from "@/components/support-nav-notification-dot";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, exact: false },
  { href: "/admin/support", label: "Support", icon: MessageCircle, exact: false },
  { href: "/admin/blog", label: "Blog", icon: FileText, exact: false },
  { href: "/admin/flags", label: "Feature Flags", icon: Flag, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [supportUnreadTotal, setSupportUnreadTotal] = useState(0);

  const loadSupportUnread = useCallback(async () => {
    const res = await fetch("/api/admin/support/unread");
    if (!res.ok) {
      setSupportUnreadTotal(0);
      return;
    }
    const body = (await res.json()) as {
      nb_tickets_nouveaux?: number;
      nb_messages_non_lus?: number;
    };
    const total = (body.nb_tickets_nouveaux ?? 0) + (body.nb_messages_non_lus ?? 0);
    setSupportUnreadTotal(total);
  }, []);

  useEffect(() => {
    void loadSupportUnread();
  }, [loadSupportUnread, pathname]);

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r border-white/10 px-3 py-6 md:w-64"
      style={{ backgroundColor: "#1a0533" }}
    >
      <div className="mb-8 px-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Locavio</p>
        <p className="text-lg font-bold text-white">Administration</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(pathname, href, exact);
          const showDot = href === "/admin/support" && supportUnreadTotal > 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition"
              style={{
                backgroundColor: active ? "#7c3aed" : "transparent",
                color: active ? "#ffffff" : "rgba(255,255,255,0.75)",
              }}
            >
              <Icon size={18} strokeWidth={2} aria-hidden />
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>{label}</span>
                {showDot ? <SupportNavNotificationDot /> : null}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/"
        className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-center text-sm text-white/80 transition hover:bg-white/5"
      >
        Retour à l&apos;app
      </Link>
    </aside>
  );
}
