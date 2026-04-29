"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IconBank,
  IconOffice,
  IconCalendar,
  IconChart,
  IconClipboard,
  IconCog,
  IconContract,
  IconDocument,
  LogoFull,
  IconTrendingUp,
  IconUsers,
} from "@/components/locavio-icons";
import { detecterBauxEligibles } from "@/lib/irl-revision";
import { useModeLocation, type ModeLocation } from "@/lib/mode-location";
import {
  bellAlertAcompte,
  bellAlertSolde,
  montantSoldeRestant,
  type SaisonnierRappelReservationRow,
} from "@/lib/saisonnier-rappel-conditions";
import { normalizePlan, PLAN_UPGRADE_PATH, type LocavioPlan } from "@/lib/plan-limits";
import { BtnEmail, BtnNeutral, BtnPrimary } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/locavio-colors";
import { supabase } from "@/lib/supabase";

const SIDEBAR_STARTER_ONLY_TOOLTIP = "Disponible à partir du plan Starter";

/** Ligne de séparation sidebar (#ffffff08). */
const SIDEBAR_SEP_COLOR = "#ffffff08";

const sectionLabelStyle: CSSProperties = {
  color: "#5a5a6a",
  fontSize: "10px",
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  padding: "8px 16px",
};

const logementsNavItem = { href: "/logements", label: "Logements", icon: IconOffice } as const;

const navigationModeClassique = [
  { href: "/", label: "Dashboard", icon: IconChart },
  { href: "/locataires", label: "Locataires", icon: IconUsers },
  { href: "/quittances", label: "Quittances", icon: IconDocument },
  { href: "/baux", label: "Baux", icon: IconContract },
  { href: "/revisions-irl", label: "Révision IRL", icon: IconTrendingUp },
  { href: "/etats-des-lieux", label: "États des lieux", icon: IconClipboard },
] as const;

const navigationModeSaisonnier = [
  { href: "/saisonnier/dashboard", label: "Dashboard", icon: IconChart },
  { href: "/saisonnier/voyageurs", label: "Voyageurs", icon: IconUsers },
  { href: "/saisonnier/reservations", label: "Réservations", icon: IconCalendar },
  { href: "/saisonnier/contrats", label: "Contrats de séjour", icon: IconContract },
  { href: "/saisonnier/etats-des-lieux", label: "États des lieux", icon: IconClipboard },
  { href: "/saisonnier/taxes-sejour", label: "Taxe de séjour", icon: IconBank },
] as const;

const navigationSettings = [{ href: "/parametres", label: "Paramètres", icon: IconCog }] as const;

type NavModeItem = (typeof navigationModeClassique)[number] | (typeof navigationModeSaisonnier)[number];
type NavSettingsItem = (typeof navigationSettings)[number];
type NavSidebarItem = NavModeItem | NavSettingsItem | typeof logementsNavItem;

function NavSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0" style={sectionLabelStyle}>
      {children}
    </p>
  );
}

function NavSeparatorLine({ className = "" }: { className?: string }) {
  return <div className={`w-full ${className}`.trim()} style={{ borderTop: `1px solid ${SIDEBAR_SEP_COLOR}` }} aria-hidden />;
}

function pathIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ModeLocationPill({
  mode,
  onSelectClassique,
  onSelectSaisonnier,
  className = "",
}: {
  mode: ModeLocation;
  onSelectClassique: () => void;
  onSelectSaisonnier: () => void;
  className?: string;
}) {
  const pillInactive = PC.cardHover;
  const pillActive = "#7c3aed";
  return (
    <div
      className={`w-full rounded-full p-1 ${className}`.trim()}
      style={{ backgroundColor: PC.inputBg, border: `1px solid ${PC.border}` }}
      role="group"
      aria-label="Mode de location"
    >
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          data-tour-id="mode-classique"
          className="rounded-full py-2.5 text-xs font-semibold transition-all duration-200 ease-out"
          style={{
            backgroundColor: mode === "classique" ? pillActive : pillInactive,
            color: mode === "classique" ? PC.white : PC.muted,
            boxShadow: mode === "classique" ? PC.activeRing : "none",
          }}
          onClick={onSelectClassique}
        >
          Classique
        </button>
        <button
          type="button"
          data-tour-id="mode-saisonnier"
          className="rounded-full py-2.5 text-xs font-semibold transition-all duration-200 ease-out"
          style={{
            backgroundColor: mode === "saisonnier" ? pillActive : pillInactive,
            color: mode === "saisonnier" ? PC.white : PC.muted,
            boxShadow: mode === "saisonnier" ? PC.activeRing : "none",
          }}
          onClick={onSelectSaisonnier}
        >
          Saisonnier
        </button>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  isActive,
  onNavigate,
  starterOnlyLock = false,
  tourId,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  isActive: boolean;
  onNavigate?: () => void;
  /** Plan Free : lien cliquable vers la page upsell, avec 🔒 + tooltip. */
  starterOnlyLock?: boolean;
  tourId?: string;
}) {
  const [hover, setHover] = useState(false);

  const activeStyle: CSSProperties = {
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    color: PC.secondary,
    boxShadow: `inset 2px 0 0 0 ${PC.primaryLight}`,
  };

  const idleStyle: CSSProperties = {
    color: hover ? PC.text : PC.muted,
    backgroundColor: hover ? "rgba(124, 58, 237, 0.05)" : "transparent",
  };

  return (
    <Link
      href={href}
      data-tour-id={tourId}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-[background-color,color] duration-200 ease-out"
      style={isActive ? activeStyle : idleStyle}
      title={starterOnlyLock ? SIDEBAR_STARTER_ONLY_TOOLTIP : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onNavigate?.()}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        style={{ color: isActive ? PC.primaryLight : hover ? PC.secondary : PC.muted }}
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
  const router = useRouter();
  const { mode, setMode } = useModeLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerPlan, setOwnerPlan] = useState<LocavioPlan | null>(null);
  const [saisonnierUpsellOpen, setSaisonnierUpsellOpen] = useState(false);

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

  useEffect(() => {
    if (ownerPlan === "free" && mode === "saisonnier") {
      setMode("classique");
    }
  }, [ownerPlan, mode, setMode]);

  /** Toggle aligné sur l’URL : /saisonnier/… → Saisonnier, sinon Classique. */
  useEffect(() => {
    const isSaisonnierPath = pathname === "/saisonnier" || pathname.startsWith("/saisonnier/");
    if (isSaisonnierPath) {
      if (ownerPlan !== "free") {
        setMode("saisonnier");
      }
    } else {
      setMode("classique");
    }
  }, [pathname, ownerPlan, setMode]);

  const navigationModeItems = mode === "saisonnier" ? navigationModeSaisonnier : navigationModeClassique;

  function isSidebarStarterOnlyLocked(href: string): boolean {
    if (ownerPlan !== "free") return false;
    if (href === "/baux" || href === "/revisions-irl" || href === "/etats-des-lieux") return true;
    if (mode === "saisonnier" && href.startsWith("/saisonnier")) return true;
    return false;
  }

  function renderNavItem(item: NavSidebarItem, closeMobile?: () => void) {
    const locked = isSidebarStarterOnlyLocked(item.href);
    const href = locked && item.href.startsWith("/saisonnier") ? PLAN_UPGRADE_PATH : item.href;
    const tourIdMap: Record<string, string> = {
      "/": "dashboard",
      "/logements": "logements",
      "/locataires": "locataires",
      "/quittances": "quittances",
      "/baux": "baux",
      "/etats-des-lieux": "etats-des-lieux",
      "/revisions-irl": "revisions-irl",
      "/saisonnier/reservations": "saisonnier-reservations",
      "/saisonnier/voyageurs": "saisonnier-voyageurs",
      "/saisonnier/contrats": "saisonnier-contrats",
      "/saisonnier/taxes-sejour": "saisonnier-taxes",
    };
    return (
      <NavLink
        key={`${mode}-${item.href}`}
        href={href}
        label={item.label}
        Icon={item.icon}
        isActive={pathIsActive(pathname, item.href)}
        onNavigate={closeMobile}
        starterOnlyLock={locked}
        tourId={tourIdMap[item.href]}
      />
    );
  }

  function selectClassiqueMode() {
    setMode("classique");
    router.push("/");
  }

  function selectSaisonnierMode() {
    if (ownerPlan === "free") {
      setSaisonnierUpsellOpen(true);
      return;
    }
    setMode("saisonnier");
    router.push("/saisonnier/dashboard");
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
    backgroundColor: "#08080f",
    backgroundImage: "radial-gradient(circle at 15% 5%, rgba(124,58,237,0.18), transparent 38%)",
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
    backgroundColor: PC.glassBg,
    border: `1px solid ${PC.glassBorder}`,
    WebkitBackdropFilter: PC.glassBlur,
    backdropFilter: PC.glassBlur,
    boxShadow: PC.cardShadow,
    transition: "all 200ms ease-out",
  };

  const avatarRingStyle: CSSProperties = {
    background: PC.gradientPrimary,
    color: PC.white,
    fontWeight: 700,
  };

  function sidebarScrollableNav(closeMobile?: () => void) {
    return (
      <>
        <NavSectionLabel>Mes biens</NavSectionLabel>
        {renderNavItem(logementsNavItem, closeMobile)}
        <NavSeparatorLine className="my-2" />

        <div className="w-full shrink-0 px-0 pb-3 pt-1">
          <ModeLocationPill
            mode={ownerPlan === "free" ? "classique" : mode}
            onSelectClassique={() => {
              selectClassiqueMode();
              closeMobile?.();
            }}
            onSelectSaisonnier={() => {
              selectSaisonnierMode();
              closeMobile?.();
            }}
          />
        </div>

        <NavSectionLabel>{mode === "saisonnier" ? "Gestion saisonnière" : "Gestion classique"}</NavSectionLabel>
        <div className="space-y-1">
          {navigationModeItems.map((item) => renderNavItem(item, closeMobile))}
        </div>
      </>
    );
  }

  function sidebarZoneFooter(closeMobile?: () => void) {
    return (
      <div
        className="shrink-0 pt-4"
        style={{
          borderTop: `1px solid ${SIDEBAR_SEP_COLOR}`,
          paddingBottom: closeMobile ? "calc(env(safe-area-inset-bottom, 20px) + 16px)" : undefined,
        }}
      >
        <div className="space-y-1">
          {navigationSettings.map((item) => renderNavItem(item, closeMobile))}
        </div>
        <div className="mt-5">
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
    );
  }

  return (
    <>
      <aside className="hidden flex-col md:flex" style={asideStyle}>
        <div className="flex h-full min-h-0 flex-col p-5">
          <Link href="/" className="mb-6 flex shrink-0 items-center gap-2.5">
            <LogoFull className="h-9 w-auto" />
          </Link>

          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">{sidebarScrollableNav()}</nav>
            {sidebarZoneFooter()}
          </div>
        </div>
      </aside>

      {saisonnierUpsellOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ backgroundColor: PC.overlay }}
          role="dialog"
          aria-modal
          aria-labelledby="saisonnier-upsell-title"
        >
          <div
            className="max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}` }}
          >
            <h2 id="saisonnier-upsell-title" className="text-lg font-semibold" style={{ color: PC.text }}>
              Location saisonnière
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Le mode saisonnier est disponible à partir du plan Starter.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <BtnNeutral onClick={() => setSaisonnierUpsellOpen(false)}>Fermer</BtnNeutral>
              <BtnPrimary
                onClick={() => {
                  setSaisonnierUpsellOpen(false);
                  router.push(PLAN_UPGRADE_PATH);
                }}
              >
                Voir les abonnements
              </BtnPrimary>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header desktop : notifications uniquement */}
      <header
        className="fixed left-0 right-0 top-0 z-40 hidden h-[60px] md:left-64 md:block md:px-6"
        style={{ backgroundColor: PC.sidebar, borderBottom: `1px solid ${PC.border}` }}
      >
        <div className="flex h-full items-center justify-end pr-1">
          <NotificationBellDropdown />
        </div>
      </header>

      {/* Barre mobile : menu | cloche */}
      <div
        className="fixed left-0 right-0 top-0 z-[45] flex min-h-[52px] items-center justify-between gap-2 px-2 py-2 md:hidden"
        style={mobileBarStyle}
      >
        <button
          type="button"
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl transition"
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
        <div className="flex h-11 shrink-0 items-center justify-end">
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
            <div className="flex h-full min-h-0 flex-col p-5">
              <div className="mb-6 flex shrink-0 items-center justify-between gap-2">
                <Link
                  href="/"
                  className="flex min-w-0 items-center gap-2.5"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogoFull className="h-9 w-auto" />
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

              <div className="flex min-h-0 flex-1 flex-col">
                <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                  {sidebarScrollableNav(() => setMobileOpen(false))}
                </nav>
                {sidebarZoneFooter(() => setMobileOpen(false))}
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
  revisionsIrlDisponibles: Array<{ bailId: string; logementNom: string }>;
  rappelsAcompteSaisonnier: Array<{
    reservationId: string;
    montant: number;
    voyageur: string;
    logement: string;
    dates: string;
  }>;
  rappelsSoldeSaisonnier: Array<{
    reservationId: string;
    montant: number;
    voyageur: string;
    logement: string;
    dates: string;
  }>;
};

async function loadHeaderAlerts(): Promise<HeaderAlertMetrics> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      quittancesNonEnvoyeesMois: 0,
      bauxUrgents: [],
      edlManquants: [],
      revisionsIrlDisponibles: [],
      rappelsAcompteSaisonnier: [],
      rappelsSoldeSaisonnier: [],
    };
  }

  const { data: proprietaire } = await supabase
    .from("proprietaires")
    .select("id, plan")
    .eq("user_id", user.id)
    .maybeSingle();
  const ownerId = proprietaire?.id as string | undefined;
  const ownerPlan = normalizePlan((proprietaire as { plan?: string | null } | null)?.plan);
  if (!ownerId) {
    return {
      quittancesNonEnvoyeesMois: 0,
      bauxUrgents: [],
      edlManquants: [],
      revisionsIrlDisponibles: [],
      rappelsAcompteSaisonnier: [],
      rappelsSoldeSaisonnier: [],
    };
  }

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
    revRes,
  ] = await Promise.all([
    supabase.from("quittances").select("envoyee, mois, annee").eq("proprietaire_id", ownerId),
    supabase
      .from("baux")
      .select(
        "id, date_debut, date_fin, statut, locataire_id, logement_id, irl_reference, loyer_initial, revision_loyer, loyer, date_derniere_revision",
      )
      .eq("proprietaire_id", ownerId)
      .eq("statut", "actif"),
    supabase.from("logements").select("id, nom").eq("proprietaire_id", ownerId),
    supabase.from("locataires").select("id, nom, prenom").eq("proprietaire_id", ownerId),
    supabase.from("etats_des_lieux").select("bail_id, type").eq("proprietaire_id", ownerId),
    supabase.from("revisions_irl").select("bail_id, statut, date_revision").eq("proprietaire_id", ownerId),
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

  const revData = revRes.error ? [] : (revRes.data ?? []);
  const proposeeBailIds = new Set(
    revData
      .filter((r) => String(r.statut ?? "").toLowerCase() === "proposee")
      .map((r) => String(r.bail_id)),
  );
  const revisionsIrlDisponibles = detecterBauxEligibles(
    (bRows ?? []) as never,
    0,
    { bailIdsAvecRevisionProposee: proposeeBailIds, revisionsPourRefus: revData as never },
  ).map((b) => ({
    bailId: String(b.id),
    logementNom: logementsMap.get(String(b.logement_id ?? "")) ?? "Logement",
  }));

  const todayIso = new Date().toISOString().slice(0, 10);
  let rappelsAcompteSaisonnier: HeaderAlertMetrics["rappelsAcompteSaisonnier"] = [];
  let rappelsSoldeSaisonnier: HeaderAlertMetrics["rappelsSoldeSaisonnier"] = [];

  if (ownerPlan !== "free") {
    const { data: resaRows } = await supabase
      .from("reservations")
      .select(
        "id, voyageur_id, date_arrivee, date_depart, montant_acompte, tarif_total, tarif_menage, taxe_sejour_total, delai_solde_jours, acompte_recu, solde_recu, voyageurs(prenom, nom), logements(nom)",
      )
      .eq("proprietaire_id", ownerId)
      .eq("source", "direct")
      .eq("statut", "confirmee")
      .not("voyageur_id", "is", null)
      .gte("date_arrivee", todayIso);

    for (const raw of resaRows ?? []) {
      const rec = raw as Record<string, unknown>;
      const vg = rec.voyageurs;
      const lg = rec.logements;
      const vj = Array.isArray(vg)
        ? (vg[0] as { prenom?: string; nom?: string })
        : (vg as { prenom?: string; nom?: string } | null);
      const lj = Array.isArray(lg) ? (lg[0] as { nom?: string }) : (lg as { nom?: string } | null);
      const row: SaisonnierRappelReservationRow = {
        id: String(rec.id),
        proprietaire_id: ownerId,
        source: "direct",
        statut: "confirmee",
        voyageur_id: rec.voyageur_id ? String(rec.voyageur_id) : null,
        date_arrivee: String(rec.date_arrivee),
        date_depart: String(rec.date_depart),
        heure_arrivee: null,
        heure_depart: null,
        nb_voyageurs: null,
        tarif_total: Number(rec.tarif_total),
        tarif_menage: Number(rec.tarif_menage ?? 0),
        taxe_sejour_total: Number(rec.taxe_sejour_total ?? 0),
        montant_acompte: Number(rec.montant_acompte ?? 0),
        delai_solde_jours: rec.delai_solde_jours != null ? Number(rec.delai_solde_jours) : null,
        acompte_recu: rec.acompte_recu === true ? true : false,
        solde_recu: rec.solde_recu === true ? true : false,
        rappel_acompte_envoye: null,
        rappel_solde_envoye: null,
      };
      const voyageurLabel = `${vj?.prenom ?? ""} ${vj?.nom ?? ""}`.trim() || "Voyageur";
      const logementNom = String(lj?.nom ?? "Logement");
      const dates = `${row.date_arrivee} → ${row.date_depart}`;
      if (bellAlertAcompte(row)) {
        rappelsAcompteSaisonnier.push({
          reservationId: row.id,
          montant: Number(rec.montant_acompte ?? 0),
          voyageur: voyageurLabel,
          logement: logementNom,
          dates,
        });
      }
      if (bellAlertSolde(row)) {
        rappelsSoldeSaisonnier.push({
          reservationId: row.id,
          montant: montantSoldeRestant(row),
          voyageur: voyageurLabel,
          logement: logementNom,
          dates,
        });
      }
    }
  }

  return {
    quittancesNonEnvoyeesMois,
    bauxUrgents,
    edlManquants,
    revisionsIrlDisponibles,
    rappelsAcompteSaisonnier,
    rappelsSoldeSaisonnier,
  };
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
        const empty: HeaderAlertMetrics = {
          quittancesNonEnvoyeesMois: 0,
          bauxUrgents: [],
          edlManquants: [],
          revisionsIrlDisponibles: [],
          rappelsAcompteSaisonnier: [],
          rappelsSoldeSaisonnier: [],
        };
        headerAlertsCache = empty;
        return empty;
      });
  }
  return headerAlertsInflight;
}

export function invalidateHeaderAlertsCache() {
  headerAlertsCache = null;
  headerAlertsInflight = null;
}

export async function refreshHeaderAlerts(): Promise<HeaderAlertMetrics> {
  invalidateHeaderAlertsCache();
  const data = await loadHeaderAlerts();
  headerAlertsCache = data;
  headerAlertsInflight = Promise.resolve(data);
  return data;
}

function NotificationBellDropdown({ panelZClass }: { panelZClass?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<HeaderAlertMetrics>({
    quittancesNonEnvoyeesMois: 0,
    bauxUrgents: [],
    edlManquants: [],
    revisionsIrlDisponibles: [],
    rappelsAcompteSaisonnier: [],
    rappelsSoldeSaisonnier: [],
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

  const badgeCount =
    alerts.quittancesNonEnvoyeesMois +
    alerts.bauxUrgents.length +
    alerts.edlManquants.length +
    alerts.revisionsIrlDisponibles.length +
    alerts.rappelsAcompteSaisonnier.length +
    alerts.rappelsSoldeSaisonnier.length;
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
                {alerts.revisionsIrlDisponibles.map((item) => (
                  <Link
                    key={item.bailId}
                    href="/revisions-irl"
                    className="mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ color: PC.primaryLight, backgroundColor: PC.primaryBg15 }}
                    onClick={() => setOpen(false)}
                  >
                    <span>📈</span>
                    <span>Révision de loyer disponible pour {item.logementNom}</span>
                  </Link>
                ))}
                {alerts.rappelsAcompteSaisonnier.map((item) => (
                  <div
                    key={`acompte-${item.reservationId}`}
                    className="mb-1 rounded-lg px-3 py-2 text-sm"
                    style={{ color: PC.warning, backgroundColor: PC.warningBg15 }}
                  >
                    <div className="flex items-start gap-2">
                      <span>💰</span>
                      <span>
                        Acompte attendu de{" "}
                        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(item.montant)}€ —{" "}
                        {item.voyageur} · {item.logement} · {item.dates}
                      </span>
                    </div>
                    <BtnEmail
                      size="small"
                      className="mt-2 w-full"
                      onClick={() => {
                        void (async () => {
                          const res = await fetch("/api/saisonnier/send-rappel-acompte", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reservation_id: item.reservationId }),
                          });
                          if (res.ok) {
                            const fresh = await refreshHeaderAlerts();
                            setAlerts(fresh);
                            toast.success("Rappel d'acompte envoyé.");
                          }
                        })();
                      }}
                    >
                      Renvoyer
                    </BtnEmail>
                  </div>
                ))}
                {alerts.rappelsSoldeSaisonnier.map((item) => (
                  <div
                    key={`solde-${item.reservationId}`}
                    className="mb-1 rounded-lg px-3 py-2 text-sm"
                    style={{ color: PC.primaryLight, backgroundColor: PC.primaryBg15 }}
                  >
                    <div className="flex items-start gap-2">
                      <span>💳</span>
                      <span>
                        Solde attendu de{" "}
                        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(item.montant)}€ —{" "}
                        {item.voyageur} · {item.logement} · {item.dates}
                      </span>
                    </div>
                    <BtnEmail
                      size="small"
                      className="mt-2 w-full"
                      onClick={() => {
                        void (async () => {
                          const res = await fetch("/api/saisonnier/send-rappel-solde", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reservation_id: item.reservationId }),
                          });
                          if (res.ok) {
                            const fresh = await refreshHeaderAlerts();
                            setAlerts(fresh);
                            toast.success("Rappel de solde envoyé.");
                          }
                        })();
                      }}
                    >
                      Renvoyer
                    </BtnEmail>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
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
        border: `1px solid ${h ? "rgba(239, 68, 68, 0.4)" : PC.border}`,
        backgroundColor: h ? "rgba(239, 68, 68, 0.12)" : "transparent",
        color: h ? "#fca5a5" : PC.muted,
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

