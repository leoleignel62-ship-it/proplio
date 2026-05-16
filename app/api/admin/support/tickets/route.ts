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

    const { data: tickets, error } = await supabaseAdmin
      .from("support_tickets")
      .select(
        `
        id, sujet, description, priorite, statut, created_at, updated_at, proprietaire_id,
        proprietaire:proprietaires(id, nom, prenom, email)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ticketIds = (tickets ?? []).map((t) => String(t.id));
    const unreadByTicket = new Map<string, number>();

    if (ticketIds.length > 0) {
      const { data: unreadMessages } = await supabaseAdmin
        .from("support_messages")
        .select("ticket_id")
        .in("ticket_id", ticketIds)
        .eq("auteur", "proprietaire")
        .eq("lu", false);

      for (const row of unreadMessages ?? []) {
        const tid = String(row.ticket_id);
        unreadByTicket.set(tid, (unreadByTicket.get(tid) ?? 0) + 1);
      }
    }

    const enriched = (tickets ?? []).map((t) => ({
      ...t,
      unread_count: unreadByTicket.get(String(t.id)) ?? 0,
    }));

    return NextResponse.json({ tickets: enriched });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
