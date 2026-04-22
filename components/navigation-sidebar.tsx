"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from "react";
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
import { normalizePlan, type ProplioPlan } from "@/lib/plan-limits";
import { PC } from "@/lib/proplio-colors";
import { supabase } from "@/lib/supabase";

const SIDEBAR_STARTER_ONLY_TOOLTIP = "Disponible à partir du plan Starter";

const navigationMain = [
  { href: "/", label: "Dashboard", icon: IconChart },
  { href: "/logements", label: "Logements", icon: IconBuilding },
  { href: "/locataires", label: "Locataires", icon: IconUsers },
  { href: "/quittances", label: "Quittances", icon: IconDocument },
  { href: "/baux", label: "Baux", icon: IconContract },
  { href: "/etats-des-lieux", label: "États des lieux", icon: IconClipboard },
] as const;

const navigationSettings = [{ href: "/parametres", label: "Paramètres", icon: IconCog }] as const;

const navigationItems = [...navigationMain, ...navigationSettings] as const;

function NavLink({
  href,
  label,
  Icon,
  isActive,
  onNavigate,
  starterOnlyLock = false,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  isActive: boolean;
  onNavigate?: () => void;
  /** Plan Free : lien cliquable vers la page upsell, avec 🔒 + tooltip. */
  starterOnlyLock?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const activeStyle: CSSProperties = {
    backgroundColor: PC.primaryBg15,
    color: PC.text,
    boxShadow: `inset 2px 0 0 0 ${PC.primary}`,
  };

  const idleStyle: CSSProperties = {
    color: hover ? PC.text : PC.muted,
    backgroundColor: hover ? "rgba(255, 255, 255, 0.05)" : "transparent",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-[background-color,color] duration-200 ease-out"
      style={isActive ? activeStyle : idleStyle}
      title={starterOnlyLock ? SIDEBAR_STARTER_ONLY_TOOLTIP : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNavigate?.()}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        style={{ color: isActive ? PC.primaryLight : PC.secondary }}
      />
      {starterOnlyLock ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <span>{label}</span>
          <span aria-hidden>🔒</span>
        </span>
      ) : (
        label
      )}
    </Link>
  );
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path fill="currentColor" d="M4 7h16v2H4V7Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        fill="currentColor"
        d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.7 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.3 1.42 1.41Z"
      />
    </svg>
  );
}

export function NavigationSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerPlan, setOwnerPlan] = useState<ProplioPlan | null>(null);

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
        .select("prenom, nom, plan")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!row) {
        setOwnerPlan("free");
        return;
      }
      const n = `${row.prenom ?? ""} ${row.nom ?? ""}`.trim();
      setOwnerName(n || null);
      setOwnerPlan(normalizePlan((row as { plan?: string | null }).plan));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function isSidebarStarterOnlyLocked(href: string): boolean {
    return ownerPlan === "free" && (href === "/baux" || href === "/etats-des-lieux");
  }

  function renderNavItem(item: (typeof navigationItems)[number], closeMobile?: () => void) {
    return (
      <NavLink
        key={item.href}
        href={item.href}
        label={item.label}
        Icon={item.icon}
        isActive={pathname === item.href}
        onNavigate={closeMobile}
        starterOnlyLock={isSidebarStarterOnlyLocked(item.href)}
      />
    );
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: "16rem",
    overflow: "hidden",
    zIndex: 30,
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
    backgroundColor: PC.primary,
    color: PC.white,
    fontWeight: 700,
  };

  const logoBadgeStyle: CSSProperties = {
    backgroundColor: PC.primaryBg20,
    color: PC.primary,
  };

  return (
    <>
      <aside className="hidden flex-col md:flex" style={asideStyle}>
        <div className="flex h-full flex-col p-5">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={logoBadgeStyle}>
              <IconHome className="h-6 w-6" style={{ color: PC.primary }} />
            </span>
            <span className="text-lg font-semibold tracking-tight" style={{ color: PC.text }}>
              Proplio
            </span>
          </Link>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {navigationMain.map((item) => renderNavItem(item))}
            <div className="my-3 border-t border-white/[0.06]" aria-hidden />
            {navigationSettings.map((item) => renderNavItem(item))}
          </nav>

          <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${PC.border}` }}>
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

      {/* Barre mobile : hamburger | logo | cloche — fixe en haut au scroll */}
      <div
        className="fixed left-0 right-0 top-0 z-[45] flex min-h-[52px] items-center justify-between gap-2 px-3 py-2 md:hidden"
        style={mobileBarStyle}
      >
        <div className="flex w-11 shrink-0 items-center justify-start">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition"
            style={{
              backgroundColor: PC.primaryBg10,
              border: `2px solid ${PC.borderPrimary50}`,
              color: PC.text,
              boxShadow: PC.cardShadow,
            }}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <HamburgerIcon />
          </button>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-1">
          <Link href="/" className="flex max-w-full items-center justify-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={logoBadgeStyle}>
              <IconHome className="h-5 w-5" style={{ color: PC.primary }} />
            </span>
            <span className="truncate text-center font-semibold" style={{ color: PC.text }}>
              Proplio
            </span>
          </Link>
        </div>
        <div className="flex h-11 min-w-[44px] shrink-0 items-center justify-end">
          <NotificationBellDropdown panelZClass="z-[110]" />
        </div>
      </div>

      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-[100] md:hidden"
            style={{ backgroundColor: PC.overlay }}
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-nav-drawer"
            className="fixed left-0 top-0 z-[101] flex h-screen w-64 max-w-[85vw] flex-col md:hidden"
            style={{
              backgroundColor: PC.sidebar,
              borderRight: `1px solid ${PC.border}`,
              boxShadow: "8px 0 32px rgba(0, 0, 0, 0.45)",
            }}
          >
            <div className="flex h-full flex-col p-5">
              <div className="mb-6 flex items-center justify-between gap-2">
                <Link
                  href="/"
                  className="flex min-w-0 items-center gap-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={logoBadgeStyle}>
                    <IconHome className="h-6 w-6" style={{ color: PC.primary }} />
                  </span>
                  <span className="truncate text-lg font-semibold tracking-tight" style={{ color: PC.text }}>
                    Proplio
                  </span>
                </Link>
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition"
                  style={{
                    backgroundColor: PC.card,
                    border: `1px solid ${PC.border}`,
                    color: PC.text,
                  }}
                  aria-label="Fermer le menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
                {navigationMain.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
                <div className="my-3 border-t border-white/[0.06]" aria-hidden />
                {navigationSettings.map((item) => renderNavItem(item, () => setMobileOpen(false)))}
              </nav>

              <div
                className="mt-5 pt-5"
                style={{
                  borderTop: `1px solid ${PC.border}`,
                  paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 16px)",
                }}
              >
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
        </>
      ) : null}
    </>
  );
}

type HeaderAlertMetrics = {
  quittancesNonEnvoyeesMois: number;
  bauxUrgents: Array<{ id: string; locataireNom: string; dateFin: string }>;
  edlManquants: Array<{ bailId: string; logementNom: string }>;
};

async function loadHeaderAlerts(): Promise<HeaderAlertMetrics> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { quittancesNonEnvoyeesMois: 0, bauxUrgents: [], edlManquants: [] };

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownerId = proprietaire?.id as string | undefined;
  if (!ownerId) return { quittancesNonEnvoyeesMois: 0, bauxUrgents: [], edlManquants: [] };

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [
    { data: qRows },
    { data: bRows },
    { data: logementsRows },
    { data: locRows },
    { data: edlRows },
  ] = await Promise.all([
    supabase.from("quittances").select("envoyee, mois, annee").eq("proprietaire_id", ownerId),
    supabase
      .from("baux")
      .select("id, date_debut, date_fin, statut, locataire_id, logement_id")
      .eq("proprietaire_id", ownerId)
      .eq("statut", "actif"),
    supabase.from("logements").select("id, nom").eq("proprietaire_id", ownerId),
    supabase.from("locataires").select("id, nom, prenom").eq("proprietaire_id", ownerId),
    supabase.from("etats_des_lieux").select("bail_id, type").eq("proprietaire_id", ownerId),
  ]);

  const quittancesNonEnvoyeesMois = (qRows ?? []).filter(
    (q) => !q.envoyee && Number(q.mois) === currentMonth && Number(q.annee) === currentYear,
  ).length;

  const locatairesMap = new Map<string, string>();
  for (const loc of locRows ?? []) {
    const fullName = `${loc.prenom ?? ""} ${loc.nom ?? ""}`.trim();
    locatairesMap.set(String(loc.id), fullName || "Locataire");
  }
  const logementsMap = new Map<string, string>();
  for (const logement of logementsRows ?? []) {
    logementsMap.set(String(logement.id), String(logement.nom ?? "Logement"));
  }

  const bauxUrgents: Array<{ id: string; locataireNom: string; dateFin: string }> = [];
  for (const bail of bRows ?? []) {
    const end = new Date(String(bail.date_fin));
    if (Number.isNaN(end.getTime())) continue;
    if (end >= now && end <= in30) {
      bauxUrgents.push({
        id: String(bail.id),
        locataireNom: locatairesMap.get(String(bail.locataire_id ?? "")) ?? "Locataire",
        dateFin: end.toLocaleDateString("fr-FR"),
      });
    }
  }

  const edlEntreeBailIds = new Set(
    (edlRows ?? [])
      .filter((edl) => String(edl.type ?? "").toLowerCase() === "entree")
      .map((edl) => String(edl.bail_id)),
  );
  const edlManquants: Array<{ bailId: string; logementNom: string }> = [];
  for (const bail of bRows ?? []) {
    const start = new Date(String(bail.date_debut));
    if (Number.isNaN(start.getTime())) continue;
    if (start >= last7Days && start <= now && !edlEntreeBailIds.has(String(bail.id))) {
      edlManquants.push({
        bailId: String(bail.id),
        logementNom: logementsMap.get(String(bail.logement_id ?? "")) ?? "Logement",
      });
    }
  }

  return { quittancesNonEnvoyeesMois, bauxUrgents, edlManquants };
}

let headerAlertsCache: HeaderAlertMetrics | null = null;
let headerAlertsInflight: Promise<HeaderAlertMetrics> | null = null;

function ensureHeaderAlertsLoaded(): Promise<HeaderAlertMetrics> {
  if (headerAlertsCache) return Promise.resolve(headerAlertsCache);
  if (!headerAlertsInflight) {
    headerAlertsInflight = loadHeaderAlerts()
      .then((data) => {
        headerAlertsCache = data;
        return data;
      })
      .catch(() => {
        headerAlertsInflight = null;
        const empty: HeaderAlertMetrics = { quittancesNonEnvoyeesMois: 0, bauxUrgents: [], edlManquants: [] };
        headerAlertsCache = empty;
        return empty;
      });
  }
  return headerAlertsInflight;
}

function NotificationBellDropdown({ panelZClass }: { panelZClass?: string }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<HeaderAlertMetrics>({
    quittancesNonEnvoyeesMois: 0,
    bauxUrgents: [],
    edlManquants: [],
  });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void ensureHeaderAlertsLoaded().then(setAlerts);
  }, []);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const badgeCount = alerts.quittancesNonEnvoyeesMois + alerts.bauxUrgents.length + alerts.edlManquants.length;
  const hasAnyAlert = badgeCount > 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg transition"
        style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
          <path
            fill="#FFFFFF"
            d="M12 3a6 6 0 0 0-6 6v3.382l-.894 1.789A1 1 0 0 0 6 16h12a1 1 0 0 0 .894-1.447L18 12.382V9a6 6 0 0 0-6-6Zm0 18a3 3 0 0 0 2.816-2H9.184A3 3 0 0 0 12 21Z"
          />
        </svg>
        {badgeCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 min-w-5 rounded-full px-1.5 text-center text-[10px] font-semibold"
            style={{ backgroundColor: PC.danger, color: PC.white, lineHeight: "18px" }}
          >
            {badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-2 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-xl ${panelZClass ?? ""}`}
          style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, boxShadow: PC.cardShadow }}
        >
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${PC.border}` }}>
            <p className="text-sm font-semibold" style={{ color: PC.text }}>Notifications</p>
          </div>
          <div className="max-h-[min(420px,70vh)] overflow-y-auto p-2">
            {!hasAnyAlert ? (
              <div className="rounded-lg px-3 py-2 text-sm" style={{ color: PC.success, backgroundColor: PC.successBg10 }}>
                Tout est en ordre !
              </div>
            ) : (
              <>
                {alerts.quittancesNonEnvoyeesMois > 0 ? (
                  <Link href="/quittances" className="mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: PC.warning, backgroundColor: PC.warningBg15 }} onClick={() => setOpen(false)}>
                    <span>⚠</span>
                    <span>{alerts.quittancesNonEnvoyeesMois} quittance(s) à envoyer ce mois</span>
                  </Link>
                ) : null}
                {alerts.bauxUrgents.map((bail) => (
                  <Link key={bail.id} href="/baux" className="mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: PC.danger, backgroundColor: PC.dangerBg15 }} onClick={() => setOpen(false)}>
                    <span>⏱</span>
                    <span>Le bail de {bail.locataireNom} expire le {bail.dateFin}</span>
                  </Link>
                ))}
                {alerts.edlManquants.map((item) => (
                  <Link key={item.bailId} href="/etats-des-lieux" className="mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-sm" style={{ color: PC.warning, backgroundColor: PC.warningBg15 }} onClick={() => setOpen(false)}>
                    <span>📝</span>
                    <span>État des lieux d&apos;entrée manquant pour {item.logementNom}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ContentTopHeader() {
  return (
    <header
      className="fixed right-0 top-0 z-40 hidden h-[60px] items-center justify-end px-4 md:left-64 md:flex md:px-8"
      style={{ backgroundColor: PC.sidebar, borderBottom: `1px solid ${PC.border}` }}
    >
      <NotificationBellDropdown />
    </header>
  );
}

function LogoutRowMuted() {
  const [h, setH] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      className="mt-3 flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200 ease-out"
      style={{
        borderRadius: 10,
        border: `1px solid ${h ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.22)"}`,
        backgroundColor: h ? "rgba(239, 68, 68, 0.12)" : "transparent",
        color: h ? "#fca5a5" : "rgba(248, 113, 113, 0.85)",
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
        <path
          d="M10 5a1 1 0 0 0 0 2h4v10h-4a1 1 0 1 0 0 2h5a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-5Zm-4.293 6.293a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 1 0 1.414-1.414L8.828 13H13a1 1 0 1 0 0-2H8.828l.793-.793a1 1 0 1 0-1.414-1.414l-2.5 2.5Z"
          fill="currentColor"
        />
      </svg>
      Déconnexion
    </button>
  );
}

