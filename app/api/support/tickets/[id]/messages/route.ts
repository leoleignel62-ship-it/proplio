import { NextResponse } from "next/server";
import { assertAdminUser } from "@/lib/admin/assert-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedProprietaire } from "@/lib/support/session";
import { notifyAdminOwnerMessage, notifyOwnerAdminReply } from "@/lib/support/mail";
import type { SupportAuteur } from "@/lib/support/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type TicketContext = {
  id: string;
  sujet: string;
  proprietaire_id: string;
  proprietaire?: { nom?: string; prenom?: string; email?: string } | { nom?: string; prenom?: string; email?: string }[] | null;
};

function normalizeProprietaire(
  proprietaire: TicketContext["proprietaire"],
): { nom?: string; prenom?: string; email?: string } | null {
  if (!proprietaire) return null;
  if (Array.isArray(proprietaire)) return proprietaire[0] ?? null;
  return proprietaire;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const ticketId = String(id).trim();
    if (!ticketId) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const body = (await request.json()) as { contenu?: string; auteur?: string };
    const contenu = String(body.contenu ?? "").trim();
    if (!contenu) {
      return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
    }

    const adminAuth = await assertAdminUser();
    let auteur: SupportAuteur;
    let ticket: TicketContext | null = null;

    if (adminAuth.ok) {
      if (body.auteur !== "admin") {
        return NextResponse.json({ error: "Auteur invalide pour un admin." }, { status: 400 });
      }
      auteur = "admin";

      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select(
          `
          id, sujet, proprietaire_id,
          proprietaire:proprietaires(nom, prenom, email)
        `,
        )
        .eq("id", ticketId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
      }
      ticket = data as TicketContext;
    } else {
      if (body.auteur !== "proprietaire") {
        return NextResponse.json({ error: "Auteur invalide." }, { status: 400 });
      }
      auteur = "proprietaire";

      const session = await getAuthenticatedProprietaire();
      if (!session.ok) {
        return NextResponse.json({ error: session.error }, { status: session.status });
      }

      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, sujet, proprietaire_id")
        .eq("id", ticketId)
        .eq("proprietaire_id", session.proprietaire.id)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
      }

      ticket = {
        ...data,
        proprietaire: {
          nom: session.proprietaire.nom,
          prenom: session.proprietaire.prenom,
          email: session.proprietaire.email,
        },
      };
    }

    const db = adminAuth.ok ? supabaseAdmin : await createSupabaseServerClient();
    const { data: message, error: insertError } = await db
      .from("support_messages")
      .insert({
        ticket_id: ticketId,
        auteur,
        contenu,
        lu: false,
      })
      .select("id, ticket_id, auteur, contenu, lu, created_at")
      .single();

    if (insertError || !message) {
      return NextResponse.json({ error: insertError?.message ?? "Envoi impossible." }, { status: 500 });
    }

    await db
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    const proprio = normalizeProprietaire(ticket?.proprietaire);
    const proprietaireNom = `${proprio?.prenom ?? ""} ${proprio?.nom ?? ""}`.trim() || "Propriétaire";
    const proprietaireEmail = String(proprio?.email ?? "").trim();
    const sujet = String(ticket?.sujet ?? "Support");

    if (auteur === "admin") {
      if (proprietaireEmail) {
        await notifyOwnerAdminReply(
          {
            to: proprietaireEmail,
            prenom: String(proprio?.prenom ?? ""),
            sujet,
            contenu,
          },
          request,
        );
      }
    } else {
      await notifyAdminOwnerMessage({
        sujet,
        contenu,
        proprietaireNom,
        proprietaireEmail,
      });
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
