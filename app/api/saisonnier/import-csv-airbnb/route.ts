import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/plan-limits";

export const runtime = "nodejs";

type CsvRow = Record<string, string>;

function stripBom(input: string): string {
  return input.replace(/^\uFEFF/, "");
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
  const headers = parseCsvLine(lines[0]!).map((h) => stripBom(h.trim()));
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

function parseFlexibleDateToIso(value: string): string | null {
  const v = value.trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const yyyy = m[3]!;
  if (a > 12 && b >= 1 && b <= 12) {
    return `${yyyy}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  if (b > 12 && a >= 1 && a <= 12) {
    return `${yyyy}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }
  return `${yyyy}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
}

function parseDecimal(value: string): number {
  const n = Number(value.trim() || "0");
  return Number.isFinite(n) ? n : 0;
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

    const body = (await request.json()) as { csv?: string; logement_id?: string };
    const csvText = String(body.csv ?? "");
    const logementId = String(body.logement_id ?? "").trim();
    if (!csvText.trim()) {
      return NextResponse.json({ error: "Contenu CSV manquant." }, { status: 400 });
    }
    if (!logementId) {
      return NextResponse.json({ error: "logement_id requis." }, { status: 400 });
    }
    const rows = parseCsv(csvText);
    if (!rows.length) {
      return NextResponse.json({ error: "Le fichier CSV est vide ou invalide." }, { status: 400 });
    }

    const { data: logement, error: logementErr } = await supabase
      .from("logements")
      .select("id")
      .eq("id", logementId)
      .eq("proprietaire_id", ownerId)
      .maybeSingle();
    if (logementErr || !logement) {
      return NextResponse.json({ error: "Logement introuvable." }, { status: 404 });
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
    const todayIso = new Date().toISOString().slice(0, 10);

    for (const row of rows) {
      const type = String(row["Type"] ?? "").trim();
      const code = String(row["Code de confirmation"] ?? "").trim();
      if (!code) continue;
      if (type.normalize("NFC") !== "Réservation") continue;
      if (type.includes("Annulation") || type.includes("Résolution")) continue;
      if (existingCodes.has(code)) {
        skipped += 1;
        continue;
      }

      const dateArrivee = parseFlexibleDateToIso(String(row["Date de début"] ?? ""));
      const dateDepart = parseFlexibleDateToIso(String(row["Date de fin"] ?? ""));
      console.log(
        "[import-csv] dates:",
        String(row["Date de début"] ?? ""),
        "->",
        String(row["Date de fin"] ?? ""),
      );
      if (!dateArrivee || !dateDepart) continue;

      const nuits = Math.max(1, Number.parseInt(String(row["Nuits"] ?? "1"), 10) || 1);
      const revenusBruts = parseDecimal(String(row["Revenus bruts"] ?? "0"));
      const fraisMenage = parseDecimal(String(row["Frais de ménage"] ?? "0"));
      const taxeSejour = parseDecimal(String(row["Taxes reversées par Airbnb"] ?? "0"));
      const fraisService = parseDecimal(String(row["Frais de service"] ?? "0"));
      const voyageur = String(row["Voyageur"] ?? "").trim();
      const tarifNuit = nuits > 0 ? Math.round((revenusBruts / nuits) * 100) / 100 : 0;
      const statut = dateDepart < todayIso ? "terminee" : "confirmee";
      const notes = [
        `Voyageur: ${voyageur || "Inconnu"}`,
        `Code Airbnb: ${code}`,
        `Frais de service Airbnb: ${fraisService.toFixed(2)}€`,
        `Taxe séjour reversée: ${taxeSejour.toFixed(2)}€`,
      ].join("\n");

      const reservation = {
        proprietaire_id: ownerId,
        logement_id: logementId,
        voyageur_id: null,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
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
      };

      try {
        const { error: insertErr } = await supabase.from("reservations").insert(reservation);
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
      } catch {
        continue;
      }

      imported += 1;
      existingCodes.add(code);
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
