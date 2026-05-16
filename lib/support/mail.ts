import { Resend } from "resend";
import {
  emailConfirmationTicket,
  emailMessageProprietaireAdmin,
  emailNouveauTicketAdmin,
  emailReponseAdmin,
} from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
export const SUPPORT_ADMIN_EMAIL = "admin@locavio.fr";
const FROM = "Locavio <noreply@locavio.fr>";

function siteUrl(request?: Request): string {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin) return origin.replace(/\/+$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://locavio.fr").replace(/\/+$/, "");
}

export function supportPageUrl(request?: Request): string {
  return `${siteUrl(request)}/support`;
}

export async function sendSupportEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY manquant." };
  }
  const to = Array.isArray(params.to) ? params.to : [params.to];
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: params.subject,
    html: params.html,
  });
  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true };
}

export async function notifyAdminNewTicket(
  params: {
    sujet: string;
    description: string;
    priorite: string;
    proprietaireNom: string;
    proprietaireEmail: string;
  },
): Promise<void> {
  await sendSupportEmail({
    to: SUPPORT_ADMIN_EMAIL,
    subject: `[Support] Nouveau ticket — ${params.sujet}`,
    html: emailNouveauTicketAdmin(params),
  });
}

export async function notifyOwnerTicketConfirmation(
  params: { to: string; prenom: string; sujet: string },
  request?: Request,
): Promise<void> {
  if (!params.to) return;
  await sendSupportEmail({
    to: params.to,
    subject: `Votre demande a bien été reçue — ${params.sujet}`,
    html: emailConfirmationTicket({
      prenom: params.prenom,
      sujet: params.sujet,
      supportUrl: supportPageUrl(request),
    }),
  });
}

export async function notifyOwnerAdminReply(
  params: { to: string; prenom: string; sujet: string; contenu: string },
  request?: Request,
): Promise<void> {
  if (!params.to) return;
  await sendSupportEmail({
    to: params.to,
    subject: `Réponse à votre ticket — ${params.sujet}`,
    html: emailReponseAdmin({
      prenom: params.prenom,
      sujet: params.sujet,
      contenu: params.contenu,
      supportUrl: supportPageUrl(request),
    }),
  });
}

export async function notifyAdminOwnerMessage(
  params: {
    sujet: string;
    contenu: string;
    proprietaireNom: string;
    proprietaireEmail: string;
  },
): Promise<void> {
  await sendSupportEmail({
    to: SUPPORT_ADMIN_EMAIL,
    subject: `[Support] Nouveau message — ${params.sujet}`,
    html: emailMessageProprietaireAdmin(params),
  });
}
