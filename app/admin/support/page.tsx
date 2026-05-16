"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { SupportStatut } from "@/lib/support/types";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";
const CARD_BORDER = "rgba(124, 58, 237, 0.12)";

type ProprietaireInfo = {
  id?: string;
  nom?: string;
  prenom?: string;
  email?: string;
};

type TicketRow = {
  id: string;
  sujet: string;
  description: string;
  priorite: string;
  statut: string;
  created_at: string;
  unread_count?: number;
  proprietaire?: ProprietaireInfo | ProprietaireInfo[] | null;
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

function getProprietaire(ticket: TicketRow): ProprietaireInfo | null {
  const p = ticket.proprietaire;
  if (!p) return null;
  if (Array.isArray(p)) return p[0] ?? null;
  return p;
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

export default function AdminSupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState<"" | SupportStatut>("");
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalStatut, setModalStatut] = useState<SupportStatut>("ouvert");
  const [reply, setReply] = useState("");
  const [savingStatut, setSavingStatut] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/support/tickets");
    if (!res.ok) {
      toast.error("Impossible de charger les tickets.");
      setTickets([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { tickets: TicketRow[] };
    setTickets(body.tickets ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!statutFilter) return tickets;
    return tickets.filter((t) => t.statut === statutFilter);
  }, [tickets, statutFilter]);

  async function openTicket(ticket: TicketRow) {
    setSelected(ticket);
    setModalStatut(
      ticket.statut === "en_cours" || ticket.statut === "resolu" ? (ticket.statut as SupportStatut) : "ouvert",
    );
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
    const st = body.ticket.statut;
    setModalStatut(st === "en_cours" || st === "resolu" ? (st as SupportStatut) : "ouvert");
    void load();
  }

  async function updateStatut(statut: SupportStatut) {
    if (!selected) return;
    setSavingStatut(true);
    const res = await fetch(`/api/support/tickets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    setSavingStatut(false);
    if (!res.ok) {
      toast.error("Échec de la mise à jour du statut.");
      return;
    }
    const body = (await res.json()) as { ticket: TicketRow };
    setSelected((s) => (s ? { ...s, ...body.ticket } : s));
    setTickets((prev) => prev.map((t) => (t.id === body.ticket.id ? { ...t, statut: body.ticket.statut } : t)));
    toast.success("Statut mis à jour.");
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setSendingReply(true);
    const res = await fetch(`/api/support/tickets/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: reply.trim(), auteur: "admin" }),
    });
    setSendingReply(false);
    if (!res.ok) {
      toast.error("Échec de l'envoi.");
      return;
    }
    const body = (await res.json()) as { message: MessageRow };
    setMessages((prev) => [...prev, body.message]);
    setReply("");
    toast.success("Réponse envoyée.");
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: TEXT }}>
          <MessageCircle size={26} style={{ color: ACCENT }} aria-hidden />
          Support
        </h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>
          Tickets de support des propriétaires
        </p>
      </header>

      <div className="mb-4">
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value as "" | SupportStatut)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
          style={{ borderColor: CARD_BORDER }}
        >
          <option value="">Tous les statuts</option>
          <option value="ouvert">Ouvert</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: CARD_BORDER }}>
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm" style={{ color: MUTED }}>
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr
                  className="border-b text-xs uppercase tracking-wide"
                  style={{ color: MUTED, borderColor: CARD_BORDER }}
                >
                  <th className="px-4 py-3">Propriétaire</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Sujet</th>
                  <th className="px-4 py-3">Priorité</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const p = getProprietaire(row);
                  const nom = `${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim() || "—";
                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b hover:bg-violet-50/40"
                      style={{ borderColor: "rgba(124,58,237,0.06)" }}
                      onClick={() => void openTicket(row)}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>
                        {nom}
                        {(row.unread_count ?? 0) > 0 ? (
                          <span
                            className="ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{ backgroundColor: ACCENT }}
                          >
                            {row.unread_count}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3" style={{ color: MUTED }}>
                        {p?.email ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3" style={{ color: TEXT }}>
                        {row.sujet}
                      </td>
                      <td className="px-4 py-3">
                        {row.priorite === "urgente" ? (
                          <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                          >
                            Urgente
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: MUTED }}>
                            Normale
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge statut={row.statut} />
                      </td>
                      <td className="px-4 py-3" style={{ color: MUTED }}>
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div
            className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            style={{ border: `1px solid ${CARD_BORDER}` }}
          >
            <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: CARD_BORDER }}>
              <div className="min-w-0 pr-4">
                <h2 className="text-lg font-semibold" style={{ color: TEXT }}>
                  {selected.sujet}
                </h2>
                {(() => {
                  const p = getProprietaire(selected);
                  return (
                    <p className="mt-1 text-sm" style={{ color: MUTED }}>
                      {`${p?.prenom ?? ""} ${p?.nom ?? ""}`.trim()} · {p?.email ?? "—"}
                    </p>
                  );
                })()}
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Fermer">
                <X size={20} style={{ color: MUTED }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="text-sm font-medium" style={{ color: TEXT }}>
                  Statut
                  <select
                    value={modalStatut}
                    onChange={(e) => {
                      const v = e.target.value as SupportStatut;
                      setModalStatut(v);
                      void updateStatut(v);
                    }}
                    disabled={savingStatut}
                    className="ml-2 rounded-lg border px-2 py-1 text-sm"
                    style={{ borderColor: CARD_BORDER }}
                  >
                    <option value="ouvert">Ouvert</option>
                    <option value="en_cours">En cours</option>
                    <option value="resolu">Résolu</option>
                  </select>
                </label>
                <StatutBadge statut={selected.statut} />
                {selected.priorite === "urgente" ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
                  >
                    Priorité urgente
                  </span>
                ) : null}
              </div>

              <p className="mb-4 text-sm font-medium" style={{ color: TEXT }}>
                Description initiale
              </p>
              <p
                className="mb-6 rounded-lg p-3 text-sm whitespace-pre-wrap"
                style={{ backgroundColor: "#f8f7ff", color: MUTED }}
              >
                {selected.description}
              </p>

              <p className="mb-3 text-sm font-medium" style={{ color: TEXT }}>
                Conversation
              </p>
              {detailLoading ? (
                <p className="flex items-center gap-2 text-sm" style={{ color: MUTED }}>
                  <Loader2 size={16} className="animate-spin" /> Chargement…
                </p>
              ) : (
                <ul className="space-y-3">
                  {messages.map((m) => {
                    const isAdmin = m.auteur === "admin";
                    return (
                      <li key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[80%] rounded-xl px-3 py-2 text-sm"
                          style={{
                            backgroundColor: isAdmin ? "rgba(124,58,237,0.12)" : "#f3f4f6",
                            color: TEXT,
                          }}
                        >
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: MUTED }}>
                            {isAdmin ? "Admin" : "Propriétaire"}
                          </p>
                          <p className="whitespace-pre-wrap">{m.contenu}</p>
                          <p className="mt-1 text-[10px]" style={{ color: MUTED }}>
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
              <label className="mb-2 block text-sm font-medium" style={{ color: TEXT }}>
                Réponse admin
              </label>
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="min-h-[72px] flex-1 resize-y rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: CARD_BORDER }}
                  placeholder="Votre message…"
                  disabled={sendingReply || detailLoading}
                />
                <button
                  type="button"
                  disabled={sendingReply || detailLoading || !reply.trim()}
                  onClick={() => void sendReply()}
                  className="inline-flex h-fit items-center gap-2 self-end rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Répondre
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}