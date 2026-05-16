import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePriorite } from "@/lib/support/types";
import { getAuthenticatedProprietaire } from "@/lib/support/session";
import {
  notifyAdminNewTicket,
  notifyOwnerTicketConfirmation,
} from "@/lib/support/mail";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthenticatedProprietaire();
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const supabase = await createSupabaseServerClient();
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id, sujet, description, priorite, statut, created_at, updated_at")
      .eq("proprietaire_id", session.proprietaire.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const ticketIds = (tickets ?? []).map((t) => String(t.id));
    const unreadByTicket = new Map<string, number>();

    if (ticketIds.length > 0) {
      const { data: unreadMessages } = await supabase
        .from("support_messages")
        .select("ticket_id")
        .in("ticket_id", ticketIds)
        .eq("auteur", "admin")
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

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedProprietaire();
    if (!session.ok) {
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const body = (await request.json()) as {
      sujet?: string;
      description?: string;
      priorite?: string;
    };

    const sujet = String(body.sujet ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priorite = normalizePriorite(body.priorite);

    if (!sujet || !description) {
      return NextResponse.json({ error: "Sujet et description sont obligatoires." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        proprietaire_id: session.proprietaire.id,
        sujet,
        description,
        priorite,
        statut: "ouvert",
      })
      .select("id, sujet, description, priorite, statut, created_at, updated_at")
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: error?.message ?? "Création impossible." }, { status: 500 });
    }

    const proprietaireNom = `${session.proprietaire.prenom} ${session.proprietaire.nom}`.trim() || "Propriétaire";

    await notifyAdminNewTicket({
      sujet,
      description,
      priorite,
      proprietaireNom,
      proprietaireEmail: session.proprietaire.email,
    });

    if (session.proprietaire.email) {
      await notifyOwnerTicketConfirmation(
        {
          to: session.proprietaire.email,
          prenom: session.proprietaire.prenom,
          sujet,
        },
        request,
      );
    }

    return NextResponse.json({ ticket: { ...ticket, unread_count: 0 } });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
