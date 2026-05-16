import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await assertAdminUser();
    if (!auth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: auth.status });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: nbTicketsNouveaux, error: ticketsError } = await supabaseAdmin
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("statut", "ouvert")
      .gte("created_at", since);

    if (ticketsError) {
      return NextResponse.json({ error: ticketsError.message }, { status: 500 });
    }

    const { count: nbMessagesNonLus, error: messagesError } = await supabaseAdmin
      .from("support_messages")
      .select("*", { count: "exact", head: true })
      .eq("auteur", "proprietaire")
      .eq("lu", false);

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 });
    }

    return NextResponse.json({
      nb_tickets_nouveaux: nbTicketsNouveaux ?? 0,
      nb_messages_non_lus: nbMessagesNonLus ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
