import { NextResponse } from "next/server";
import { normalizePlan } from "@/lib/plan-limits";
import { executeRappelSolde } from "@/lib/saisonnier-rappels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { reservation_id?: unknown };
    const reservationId = typeof body.reservation_id === "string" ? body.reservation_id : null;
    if (!reservationId) {
      return NextResponse.json({ error: "Paramètre reservation_id requis." }, { status: 400 });
    }

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

    const { data: reservation, error: rErr } = await supabase
      .from("reservations")
      .select("id, source, statut, voyageur_id")
      .eq("id", reservationId)
      .eq("proprietaire_id", proprietaire.id)
      .maybeSingle();
    if (rErr || !reservation) {
      return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
    }
    if (String(reservation.source) !== "direct" || String(reservation.statut) !== "confirmee" || !reservation.voyageur_id) {
      return NextResponse.json({ error: "Réservation non éligible pour ce rappel." }, { status: 400 });
    }

    const result = await executeRappelSolde(supabaseAdmin, reservationId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
