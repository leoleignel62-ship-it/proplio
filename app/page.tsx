import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardQuickLinks } from "@/components/dashboard-quick-links";
import { IconBuilding, IconContract, IconDocument, IconUsers } from "@/components/proplio-icons";
import { PC } from "@/lib/proplio-colors";

type DashboardStats = {
  logements: number;
  locataires: number;
  quittancesEnvoyeesCeMois: number;
  bauxActifs: number;
};

type ActivityItem = {
  id: string;
  text: string;
  at: string;
};

async function getCount(table: string, ownerId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("proprietaire_id", ownerId);

  if (error) return 0;
  return count ?? 0;
}

async function getBauxActifsCount(ownerId: string) {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("baux")
    .select("id", { count: "exact", head: true })
    .eq("proprietaire_id", ownerId)
    .eq("statut", "actif");

  if (error) return 0;
  return count ?? 0;
}

async function getQuittancesEnvoyeesCeMois(ownerId: string) {
  const supabase = await createSupabaseServerClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("quittances")
    .select("id", { count: "exact", head: true })
    .eq("proprietaire_id", ownerId)
    .eq("envoyee", true)
    .gte("created_at", startOfMonth.toISOString());

  if (error) return 0;
  return count ?? 0;
}

async function getDashboardStats(ownerId: string): Promise<DashboardStats> {
  const [logements, locataires, quittancesEnvoyeesCeMois, bauxActifs] = await Promise.all([
    getCount("logements", ownerId),
    getCount("locataires", ownerId),
    getQuittancesEnvoyeesCeMois(ownerId),
    getBauxActifsCount(ownerId),
  ]);

  return {
    logements,
    locataires,
    quittancesEnvoyeesCeMois,
    bauxActifs,
  };
}

async function getRecentActivity(ownerId: string): Promise<ActivityItem[]> {
  const supabase = await createSupabaseServerClient();
  const fmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const [qRes, bRes, lRes, locRes] = await Promise.all([
    supabase
      .from("quittances")
      .select("id, created_at, mois, annee, envoyee")
      .eq("proprietaire_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("baux")
      .select("id, created_at, statut")
      .eq("proprietaire_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("logements")
      .select("id, created_at, nom")
      .eq("proprietaire_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("locataires")
      .select("id, created_at, nom, prenom")
      .eq("proprietaire_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  type Ev = { id: string; text: string; t: number };
  const events: Ev[] = [];

  for (const row of qRes.data ?? []) {
    const t = new Date(row.created_at as string).getTime();
    const env = row.envoyee ? "envoyée" : "brouillon";
    events.push({
      id: `q-${row.id}`,
      text: `Quittance ${row.mois}/${row.annee} — ${env}`,
      t,
    });
  }
  for (const row of bRes.data ?? []) {
    const t = new Date(row.created_at as string).getTime();
    events.push({
      id: `b-${row.id}`,
      text: `Bail ${row.statut === "actif" ? "actif" : "terminé"} enregistré`,
      t,
    });
  }
  for (const row of lRes.data ?? []) {
    const t = new Date(row.created_at as string).getTime();
    events.push({
      id: `l-${row.id}`,
      text: `Logement « ${row.nom} » ajouté`,
      t,
    });
  }
  for (const row of locRes.data ?? []) {
    const t = new Date(row.created_at as string).getTime();
    events.push({
      id: `loc-${row.id}`,
      text: `Locataire ${row.prenom} ${row.nom}`.trim(),
      t,
    });
  }

  events.sort((a, b) => b.t - a.t);
  return events.slice(0, 5).map((e) => ({
    id: e.id,
    text: e.text,
    at: fmt.format(new Date(e.t)),
  }));
}

function StatCard({
  titre,
  valeur,
  description,
  icon: Icon,
  iconGradient,
}: {
  titre: string;
  valeur: number;
  description: string;
  icon: typeof IconBuilding;
  iconGradient: string;
}) {
  return (
    <article
      className="relative overflow-hidden p-5"
      style={{
        backgroundColor: PC.card,
        border: `1px solid ${PC.border}`,
        borderRadius: 12,
        boxShadow: PC.cardShadow,
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: PC.muted }}>
            {titre}
          </p>
          <p
            className="mt-2 text-2xl font-semibold tabular-nums sm:text-[26px]"
            style={{ color: PC.text }}
          >
            {valeur}
          </p>
          <p className="mt-2 text-sm" style={{ color: PC.muted }}>
            {description}
          </p>
        </div>
        <span
          className="flex shrink-0 items-center justify-center shadow-md"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: iconGradient,
            color: PC.white,
          }}
        >
          <Icon className="!h-4 !w-4 shrink-0" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let stats: DashboardStats = { logements: 0, locataires: 0, quittancesEnvoyeesCeMois: 0, bauxActifs: 0 };
  let prenom = "";
  let activity: ActivityItem[] = [];

  if (user) {
    const { data: proprietaire } = await supabase
      .from("proprietaires")
      .select("id, prenom")
      .eq("user_id", user.id)
      .maybeSingle();

    prenom = (proprietaire?.prenom as string)?.trim() || "";

    if (proprietaire?.id) {
      const ownerId = proprietaire.id as string;
      [stats, activity] = await Promise.all([getDashboardStats(ownerId), getRecentActivity(ownerId)]);
    }
  }

  const dateLong = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <section className="proplio-page-wrap space-y-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-[28px]"
            style={{ color: PC.text }}
          >
            Bonjour{prenom ? ` ${prenom}` : ""}
          </h1>
          <p className="mt-1 capitalize text-sm sm:text-base" style={{ color: PC.muted }}>
            {dateLong}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titre="Logements actifs"
          valeur={stats.logements}
          description="Biens enregistrés sur Proplio."
          icon={IconBuilding}
          iconGradient="linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)"
        />
        <StatCard
          titre="Locataires actifs"
          valeur={stats.locataires}
          description="Profils locataires suivis."
          icon={IconUsers}
          iconGradient="linear-gradient(135deg, #6366f1 0%, #4338ca 100%)"
        />
        <StatCard
          titre="Quittances ce mois"
          valeur={stats.quittancesEnvoyeesCeMois}
          description="Marquées comme envoyées."
          icon={IconDocument}
          iconGradient="linear-gradient(135deg, #10b981 0%, #047857 100%)"
        />
        <StatCard
          titre="Baux actifs"
          valeur={stats.bauxActifs}
          description="Contrats au statut actif."
          icon={IconContract}
          iconGradient="linear-gradient(135deg, #f59e0b 0%, #b45309 100%)"
        />
      </div>

      <section
        className="p-5 sm:p-6"
        style={{
          backgroundColor: PC.card,
          border: `1px solid ${PC.border}`,
          borderRadius: 12,
          boxShadow: PC.cardShadow,
        }}
      >
        <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
          Actions rapides
        </h2>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          Accédez aux flux les plus courants en un clic.
        </p>
        <DashboardQuickLinks />
      </section>

      <section
        className="overflow-hidden"
        style={{
          backgroundColor: PC.card,
          border: `1px solid ${PC.border}`,
          borderRadius: 12,
          boxShadow: PC.cardShadow,
        }}
      >
        <div
          className="px-5 py-5 sm:px-6 sm:pt-6"
          style={{ borderBottom: `1px solid ${PC.border}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: PC.text }}>
            Activité récente
          </h2>
          <p className="mt-1 text-sm" style={{ color: PC.muted }}>
            Les cinq derniers événements enregistrés.
          </p>
        </div>
        <ul>
          {activity.length === 0 ? (
            <li className="px-5 py-8 text-center text-sm" style={{ color: PC.muted }}>
              Aucune activité récente.
            </li>
          ) : (
            activity.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
                style={i > 0 ? { borderTop: `1px solid ${PC.border}` } : undefined}
              >
                <span className="text-sm" style={{ color: PC.text }}>
                  {item.text}
                </span>
                <span className="shrink-0 text-xs" style={{ color: PC.muted }}>
                  {item.at}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </section>
  );
}
