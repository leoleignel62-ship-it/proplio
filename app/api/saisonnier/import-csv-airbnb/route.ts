import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

function stripBom(input: string): string {
  return input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(content: string): CsvRow[] {
  const clean = stripBom(content).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]!).map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]!);
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function parseFrDateToIso(value: string): string | null {
  const v = value.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function parseDecimal(value: string): number {
  const n = Number(value.trim() || "0");
  return Number.isFinite(n) ? n : 0;
}

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  let common = 0;
  for (const t of ta) {
    if (tb.has(t)) common += 1;
  }
  return common * 10;
}

function findBestLogementMatch(
  csvName: string,
  logements: Array<{ id: string; nom: string }>,
): { id: string; nom: string } | null {
  const target = normalizeText(csvName);
  let best: { id: string; nom: string } | null = null;
  let bestScore = 0;
  for (const logement of logements) {
    const score = scoreMatch(target, normalizeText(logement.nom));
    if (score > bestScore) {
      best = logement;
      bestScore = score;
    }
  }
  return bestScore >= 10 ? best : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Utilisateur non authentifié." }, { status: 401 });
    }

    const { data: proprietaire, error: pErr } = await supabase
      .from("proprietaires")
      .select("id, plan")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pErr || !proprietaire) {
      return NextResponse.json({ error: "Profil propriétaire introuvable." }, { status: 400 });
    }
    if (normalizePlan((proprietaire as { plan?: string | null }).plan) === "free") {
      return NextResponse.json({ error: "Fonction réservée au plan Starter ou supérieur." }, { status: 403 });
    }
    const ownerId = String(proprietaire.id);

    const form = await request.formData();
    const csvFile = form.get("file");
    if (!(csvFile instanceof File)) {
      return NextResponse.json({ error: "Fichier CSV manquant." }, { status: 400 });
    }
    if (!csvFile.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Le fichier doit être au format .csv." }, { status: 400 });
    }

    const csvText = await csvFile.text();
    const rows = parseCsv(csvText);
    if (!rows.length) {
      return NextResponse.json({ error: "Le fichier CSV est vide ou invalide." }, { status: 400 });
    }

    const { data: logements, error: logementsErr } = await supabase
      .from("logements")
      .select("id, nom")
      .eq("proprietaire_id", ownerId);
    if (logementsErr) {
      return NextResponse.json({ error: logementsErr.message }, { status: 500 });
    }

    const { data: existingCodesRows, error: existingErr } = await supabase
      .from("reservations")
      .select("airbnb_confirmation_code")
      .eq("proprietaire_id", ownerId)
      .not("airbnb_confirmation_code", "is", null);
    if (existingErr) {
      return NextResponse.json(
        {
          error:
            "Impossible de lire la colonne airbnb_confirmation_code. Exécutez d'abord l'ALTER TABLE dans Supabase SQL Editor.",
        },
        { status: 500 },
      );
    }
    const existingCodes = new Set(
      (existingCodesRows ?? [])
        .map((r) => String((r as { airbnb_confirmation_code?: string | null }).airbnb_confirmation_code ?? "").trim())
        .filter(Boolean),
    );

    let imported = 0;
    let skipped = 0;
    const unmatched: Array<{ code: string; logement_nom: string; dates: string }> = [];
    const todayIso = new Date().toISOString().slice(0, 10);

    for (const row of rows) {
      const type = String(row["Type"] ?? "").trim();
      const code = String(row["Code de confirmation"] ?? "").trim();
      if (!code) continue;
      if (type !== "Réservation") continue;
      if (type.includes("Annulation") || type.includes("Résolution")) continue;
      if (existingCodes.has(code)) {
        skipped += 1;
        continue;
      }

      const dateArrivee = parseFrDateToIso(String(row["Date de début"] ?? ""));
      const dateDepart = parseFrDateToIso(String(row["Date de fin"] ?? ""));
      if (!dateArrivee || !dateDepart) continue;

      const nuits = Math.max(1, Number.parseInt(String(row["Nuits"] ?? "1"), 10) || 1);
      const revenusBruts = parseDecimal(String(row["Revenus bruts"] ?? "0"));
      const fraisMenage = parseDecimal(String(row["Frais de ménage"] ?? "0"));
      const taxeSejour = parseDecimal(String(row["Taxes reversées par Airbnb"] ?? "0"));
      const fraisService = parseDecimal(String(row["Frais de service"] ?? "0"));
      const voyageur = String(row["Voyageur"] ?? "").trim();
      const logementNomCsv = String(row["Logement"] ?? "").trim();
      const logementMatch = findBestLogementMatch(
        logementNomCsv,
        (logements ?? []).map((l) => ({ id: String(l.id), nom: String(l.nom ?? "") })),
      );
      if (!logementMatch) {
        unmatched.push({
          code,
          logement_nom: logementNomCsv || "(vide)",
          dates: `${dateArrivee} → ${dateDepart}`,
        });
      }

      const tarifNuit = nuits > 0 ? Math.round((revenusBruts / nuits) * 100) / 100 : 0;
      const statut = dateDepart < todayIso ? "terminee" : "confirmee";
      const notes = [
        `Voyageur: ${voyageur || "Inconnu"}`,
        `Code Airbnb: ${code}`,
        `Frais de service Airbnb: ${fraisService.toFixed(2)}€`,
        `Taxe séjour reversée: ${taxeSejour.toFixed(2)}€`,
      ].join("\n");

      const { error: insertErr } = await supabase.from("reservations").insert({
        proprietaire_id: ownerId,
        logement_id: logementMatch?.id ?? null,
        voyageur_id: null,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        nb_nuits: nuits,
        nb_voyageurs: 1,
        tarif_total: revenusBruts,
        tarif_nuit: tarifNuit,
        tarif_menage: fraisMenage,
        taxe_sejour_total: taxeSejour,
        montant_acompte: 0,
        source: "airbnb",
        statut,
        airbnb_confirmation_code: code,
        notes,
        heure_arrivee: "15:00",
        heure_depart: "11:00",
        acompte_recu: true,
        solde_recu: true,
        delai_solde_jours: 0,
      });
      if (insertErr) {
        if (String(insertErr.message ?? "").includes("airbnb_confirmation_code")) {
          return NextResponse.json(
            {
              error:
                "La colonne airbnb_confirmation_code est introuvable. Exécutez l'ALTER TABLE dans Supabase SQL Editor.",
            },
            { status: 500 },
          );
        }
        continue;
      }

      imported += 1;
      existingCodes.add(code);
    }

    return NextResponse.json({ imported, skipped, unmatched });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
