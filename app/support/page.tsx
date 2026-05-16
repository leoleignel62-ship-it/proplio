"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, Plus, Send, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/locavio-colors";
import type { SupportPriorite, SupportStatut } from "@/lib/support/types";

const ACCENT = "#7c3aed";
const CARD_BORDER = "rgba(124, 58, 237, 0.12)";

type TicketRow = {
  id: string;
  sujet: string;
  description: string;
  priorite: string;
  statut: string;
  created_at: string;
  unread_count?: number;
};

type MessageRow = {
  id: string;
  auteur: string;
  contenu: string;
  created_at: string;
};

const STATUT_BADGE: Record<SupportStatut, { bg: string; color: string; label: string }> = {
  ouvert: { bg: "#dbeafe", color: "#1d4ed8", label: "Ouvert" },
  en_cours: { bg: "#ffedd5", color: "#c2410c", label: "En cours" },
  resolu: { bg: "#dcfce7", color: "#15803d", label: "Résolu" },
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatutBadge({ statut }: { statut: string }) {
  const key = (statut === "en_cours" || statut === "resolu" ? statut : "ouvert") as SupportStatut;
  const s = STATUT_BADGE[key];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export default function SupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sujet, setSujet] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<SupportPriorite>("normale");
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/support/tickets");
    if (!res.ok) {
      toast.error("Impossible de charger vos tickets.");
      setTickets([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { tickets: TicketRow[] };
    setTickets(body.tickets ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!sujet.trim() || !description.trim()) {
      toast.error("Renseignez le sujet et la description.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sujet: sujet.trim(), description: description.trim(), priorite }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(err?.error ?? "Échec de l'envoi.");
      return;
    }
    toast.success("Ticket envoyé. Vous recevrez une confirmation par e-mail.");
    setSujet("");
    setDescription("");
    setPriorite("normale");
    void loadTickets();
  }

  async function openTicket(ticket: TicketRow) {
    setSelected(ticket);
    setMessages([]);
    setReply("");
    setDetailLoading(true);
    const res = await fetch(`/api/support/tickets/${ticket.id}`);
    setDetailLoading(false);
    if (!res.ok) {
      toast.error("Impossible de charger le ticket.");
      setSelected(null);
      return;
    }
    const body = (await res.json()) as { ticket: TicketRow; messages: MessageRow[] };
    setSelected(body.ticket);
    setMessages(body.messages ?? []);
    void loadTickets();
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSendingReply(true);
    const res = await fetch(`/api/support/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: reply.trim(), auteur: "proprietaire" }),
    });
    setSendingReply(false);
    if (!res.ok) {
      toast.error("Échec de l'envoi du message.");
      return;
    }
    const body = (await res.json()) as { message: MessageRow };
    setMessages((prev) => [...prev, body.message]);
    setReply("");
    toast.success("Message envoyé.");
  }

  return (
    <section className="locavio-page-wrap mx-auto max-w-4xl space-y-8" style={{ color: PC.text }}>
      <header>
        <h1 className="locavio-page-title flex items-center gap-2">
          <MessageCircle size={28} style={{ color: ACCENT }} aria-hidden />
          Support
        </h1>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          Contactez notre équipe pour toute question ou assistance
        </p>
      </header>

      <div
        className="rounded-xl border bg-white p-6 shadow-sm"
        style={{ borderColor: CARD_BORDER }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold" style={{ color: PC.text }}>
          <Plus size={18} style={{ color: ACCENT }} aria-hidden />
          Nouveau ticket
        </h2>
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="support-sujet">
              Sujet
            </label>
            <input
              id="support-sujet"
              type="text"
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: CARD_BORDER, backgroundColor: PC.inputBg }}
              placeholder="Résumé de votre demande"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="support-description">
              Description
            </label>
            <textarea
              id="support-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: CARD_BORDER, backgroundColor: PC.inputBg }}
              placeholder="Décrivez votre problème ou votre question…"
              disabled={submitting}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-sm font-medium" htmlFor="support-priorite">
                Priorité
              </label>
              <select
                id="support-priorite"
                value={priorite}
                onChange={(e) => setPriorite(e.target.value as SupportPriorite)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: CARD_BORDER, backgroundColor: PC.inputBg }}
                disabled={submitting}
              >
                <option value="normale">Normale</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Envoyer
            </button>
          </div>
        </form>
      </div>

      <div
        className="rounded-xl border bg-white p-6 shadow-sm"
        style={{ borderColor: CARD_BORDER }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: PC.text }}>
          Mes tickets
        </h2>
        {loading ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : tickets.length === 0 ? (
          <p className="text-sm" style={{ color: PC.muted }}>
            Aucun ticket pour le moment.
          </p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: CARD_BORDER }}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatutBadge statut={t.statut} />
                    {t.priorite === "urgente" ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                      >
                        Urgente
                      </span>
                    ) : null}
                    {(t.unread_count ?? 0) > 0 ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {t.unread_count} non lu{(t.unread_count ?? 0) > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate font-medium" style={{ color: PC.text }}>
                    {t.sujet}
                  </p>
                  <p className="text-xs" style={{ color: PC.muted }}>
                    {formatDate(t.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void openTicket(t)}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:bg-violet-50"
                  style={{ borderColor: CARD_BORDER, color: ACCENT }}
                >
                  Voir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl"
            style={{ border: `1px solid ${CARD_BORDER}` }}
          >
            <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: CARD_BORDER }}>
              <div className="min-w-0 pr-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatutBadge statut={selected.statut} />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: PC.text }}>
                  {selected.sujet}
                </h3>
                <p className="mt-1 text-xs" style={{ color: PC.muted }}>
                  {formatDate(selected.created_at)}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Fermer">
                <X size={20} style={{ color: PC.muted }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-4 rounded-lg p-3 text-sm" style={{ backgroundColor: PC.inputBg, color: PC.muted }}>
                {selected.description}
              </p>
              {detailLoading ? (
                <p className="flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
                  <Loader2 size={16} className="animate-spin" /> Chargement des messages…
                </p>
              ) : messages.length === 0 ? (
                <p className="text-sm" style={{ color: PC.muted }}>
                  Aucun message pour l&apos;instant. Notre équipe vous répondra bientôt.
                </p>
              ) : (
                <ul className="space-y-3">
                  {messages.map((m) => {
                    const isAdmin = m.auteur === "admin";
                    return (
                      <li
                        key={m.id}
                        className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
                          style={{
                            backgroundColor: isAdmin ? PC.inputBg : "rgba(124,58,237,0.12)",
                            color: PC.text,
                          }}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: PC.muted }}>
                            {isAdmin ? "Locavio" : "Vous"}
                          </p>
                          <p className="whitespace-pre-wrap">{m.contenu}</p>
                          <p className="mt-1 text-[10px]" style={{ color: PC.muted }}>
                            {formatDate(m.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: CARD_BORDER }}>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={2}
                  placeholder="Votre réponse…"
                  className="min-h-[44px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: CARD_BORDER, backgroundColor: PC.inputBg }}
                  disabled={sendingReply || detailLoading}
                />
                <button
                  type="button"
                  disabled={sendingReply || detailLoading || !reply.trim()}
                  onClick={() => void sendReply()}
                  className="flex shrink-0 items-center justify-center rounded-lg px-3 text-white disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                  aria-label="Envoyer"
                >
                  {sendingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
