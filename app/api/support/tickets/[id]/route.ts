import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeStatut, type SupportStatut } from "@/lib/support/types";
import { getAuthenticatedProprietaire } from "@/lib/support/session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function loadTicketForOwner(ticketId: string, proprietaireId: string) {
  const supabase = await createSupabaseServerClient();
  console.log("[support/ticket GET] owner — récupération ticket", { ticketId, proprietaireId });
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("id, sujet, description, priorite, statut, created_at, updated_at, proprietaire_id")
    .eq("id", ticketId)
    .eq("proprietaire_id", proprietaireId)
    .maybeSingle();

  console.log("[support/ticket GET] owner — résultat ticket", {
    found: Boolean(ticket),
    ticketId: ticket?.id ?? null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
  });

  if (error || !ticket) {
    const errMsg = error?.message ?? "Ticket introuvable.";
    console.log("[support/ticket GET] owner — échec ticket", { error: errMsg });
    return { ticket: null, messages: null, error: errMsg };
  }

  console.log("[support/ticket GET] owner — récupération messages", { ticketId });
  const { data: messages, error: messagesError } = await supabase
    .from("support_messages")
    .select("id, ticket_id, auteur, contenu, lu, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  console.log("[support/ticket GET] owner — résultat messages", {
    count: messages?.length ?? 0,
    error: messagesError
      ? { message: messagesError.message, code: messagesError.code, details: messagesError.details }
      : null,
  });

  if (messagesError) {
    console.log("[support/ticket GET] owner — échec messages", { error: messagesError.message });
    return { ticket: null, messages: null, error: messagesError.message };
  }

  await supabase
    .from("support_messages")
    .update({ lu: true })
    .eq("ticket_id", ticketId)
    .eq("auteur", "admin")
    .eq("lu", false);

  return { ticket, messages: messages ?? [], error: null };
}

async function loadTicketForAdmin(ticketId: string) {
  console.log("[support/ticket GET] admin — récupération ticket", { ticketId });
  const { data: ticket, error } = await supabaseAdmin
    .from("support_tickets")
    .select(
      `
      id, sujet, description, priorite, statut, created_at, updated_at, proprietaire_id,
      proprietaire:proprietaires(id, nom, prenom, email)
    `,
    )
    .eq("id", ticketId)
    .maybeSingle();

  console.log("[support/ticket GET] admin — résultat ticket", {
    found: Boolean(ticket),
    ticketId: ticket?.id ?? null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
  });

  if (error || !ticket) {
    const errMsg = error?.message ?? "Ticket introuvable.";
    console.log("[support/ticket GET] admin — échec ticket", { error: errMsg });
    return { ticket: null, messages: null, error: errMsg };
  }

  console.log("[support/ticket GET] admin — récupération messages", { ticketId });
  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("support_messages")
    .select("id, ticket_id, auteur, contenu, lu, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  console.log("[support/ticket GET] admin — résultat messages", {
    count: messages?.length ?? 0,
    error: messagesError
      ? { message: messagesError.message, code: messagesError.code, details: messagesError.details }
      : null,
  });

  if (messagesError) {
    console.log("[support/ticket GET] admin — échec messages", { error: messagesError.message });
    return { ticket: null, messages: null, error: messagesError.message };
  }

  await supabaseAdmin
    .from("support_messages")
    .update({ lu: true })
    .eq("ticket_id", ticketId)
    .eq("auteur", "proprietaire")
    .eq("lu", false);

  return { ticket, messages: messages ?? [], error: null };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const ticketId = String(id).trim();
    console.log("[support/ticket GET] début", { ticketId });
    if (!ticketId) {
      console.log("[support/ticket GET] erreur — identifiant invalide");
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const adminAuth = await assertAdminUser();
    console.log("[support/ticket GET] auth", { isAdmin: adminAuth.ok });
    if (adminAuth.ok) {
      const { ticket, messages, error } = await loadTicketForAdmin(ticketId);
      if (!ticket) {
        console.log("[support/ticket GET] admin — réponse 404", { error });
        return NextResponse.json({ error }, { status: 404 });
      }
      console.log("[support/ticket GET] admin — succès", { messageCount: messages?.length ?? 0 });
      return NextResponse.json({ ticket, messages });
    }

    const session = await getAuthenticatedProprietaire();
    if (!session.ok) {
      console.log("[support/ticket GET] owner — auth échouée", {
        status: session.status,
        error: session.error,
      });
      return NextResponse.json({ error: session.error }, { status: session.status });
    }

    const { ticket, messages, error } = await loadTicketForOwner(ticketId, session.proprietaire.id);
    if (!ticket) {
      console.log("[support/ticket GET] owner — réponse 404", { error });
      return NextResponse.json({ error }, { status: 404 });
    }

    console.log("[support/ticket GET] owner — succès", { messageCount: messages?.length ?? 0 });
    return NextResponse.json({ ticket, messages });
  } catch (err) {
    console.log("[support/ticket GET] exception", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const adminAuth = await assertAdminUser();
    if (!adminAuth.ok) {
      return NextResponse.json({ error: "Accès refusé." }, { status: adminAuth.status });
    }

    const { id } = await context.params;
    const ticketId = String(id).trim();
    const body = (await request.json()) as { statut?: string };
    const statut = normalizeStatut(body.statut) as SupportStatut;

    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .update({ statut, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .select("id, sujet, description, priorite, statut, created_at, updated_at, proprietaire_id")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Mise à jour impossible." }, { status: 500 });
    }

    return NextResponse.json({ ticket: data });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
