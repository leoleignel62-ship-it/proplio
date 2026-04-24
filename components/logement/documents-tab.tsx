"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DocumentLogementCategory } from "@/lib/documents-logement";
import { DOCUMENT_CATEGORIES, MAX_DOCUMENT_UPLOAD_BYTES } from "@/lib/documents-logement";
import type { ProplioPlan } from "@/lib/plan-limits";
import { BtnDanger, BtnPrimary, BtnSecondary, ConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/proplio-colors";
import { supabase } from "@/lib/supabase";

const CARD_BORDER = "1px solid #ffffff08";

type DocumentRow = {
  id: string;
  created_at: string;
  nom: string;
  categorie: string;
  taille_bytes: number | null;
  type_mime: string | null;
  storage_path: string;
};

const SECTIONS: Array<{ id: DocumentLogementCategory; title: string; emoji: string }> = [
  { id: "diagnostics", title: "Diagnostics", emoji: "📋" },
  { id: "assurances", title: "Assurances", emoji: "🔒" },
  { id: "contrats", title: "Contrats", emoji: "📄" },
  { id: "travaux", title: "Travaux", emoji: "🔧" },
  { id: "photos", title: "Photos", emoji: "🖼️" },
  { id: "autres", title: "Autres", emoji: "📁" },
];

function formatBytes(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;
  return `${(n / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

function formatDateFr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function fileKind(mime: string | null, nom: string): "pdf" | "image" | "other" {
  const m = (mime ?? "").toLowerCase();
  if (m === "application/pdf" || nom.toLowerCase().endsWith(".pdf")) return "pdf";
  if (m.startsWith("image/")) return "image";
  return "other";
}

function FileTypeIcon({ kind }: { kind: "pdf" | "image" | "other" }) {
  if (kind === "pdf") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-tight" style={{ backgroundColor: PC.dangerBg15, color: PC.red600 }}>
        PDF
      </span>
    );
  }
  if (kind === "image") {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ backgroundColor: "rgba(99, 102, 241, 0.15)", color: PC.accentBlue }}>
        IMG
      </span>
    );
  }
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold" style={{ backgroundColor: "rgba(148, 148, 159, 0.12)", color: PC.muted }}>
      DOC
    </span>
  );
}

export function DocumentsTab({ logementId, plan }: { logementId: string; plan: ProplioPlan }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(() => plan !== "free");
  const [error, setError] = useState("");
  const [uploadingCat, setUploadingCat] = useState<DocumentLogementCategory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputs = useRef<Partial<Record<DocumentLogementCategory, HTMLInputElement | null>>>({});

  const byCategory = useMemo(() => {
    const m = new Map<DocumentLogementCategory, DocumentRow[]>();
    for (const c of DOCUMENT_CATEGORIES) m.set(c, []);
    for (const r of rows) {
      const c = r.categorie as DocumentLogementCategory;
      if (!m.has(c)) continue;
      m.get(c)!.push(r);
    }
    return m;
  }, [rows]);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    const { data, error: qErr } = await supabase
      .from("documents_logement")
      .select("id, created_at, nom, categorie, taille_bytes, type_mime, storage_path")
      .eq("logement_id", logementId)
      .order("created_at", { ascending: false });

    if (qErr) {
      setError(qErr.message);
      setRows([]);
    } else {
      setRows((data as DocumentRow[]) ?? []);
    }
    setLoading(false);
  }, [logementId]);

  useEffect(() => {
    if (plan === "free") {
      setLoading(false);
      return;
    }
    void load();
  }, [plan, load]);

  const onPickFile = (cat: DocumentLogementCategory) => {
    fileInputs.current[cat]?.click();
  };

  const onFileChange = async (cat: DocumentLogementCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
      setError("Fichier trop volumineux (max. 10 Mo).");
      return;
    }
    setError("");
    setUploadingCat(cat);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("logement_id", logementId);
      fd.set("categorie", cat);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd, credentials: "include" });
      const j = (await res.json()) as { error?: string; document?: DocumentRow };
      if (!res.ok) {
        setError(j.error ?? "Échec de l’envoi.");
        return;
      }
      if (j.document) setRows((prev) => [j.document!, ...prev]);
      toast.success("Document ajouté.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setUploadingCat(null);
    }
  };

  const onDownload = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/documents/${id}`, { credentials: "include" });
      const j = (await res.json()) as { error?: string; url?: string };
      if (!res.ok || !j.url) {
        setError(j.error ?? "Impossible de télécharger.");
        return;
      }
      window.open(j.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Erreur réseau.");
    }
  };

  const onDelete = async (id: string) => {
    setError("");
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Suppression impossible.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
      toast.success("Document supprimé.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setDeletingId(null);
    }
  };

  if (plan === "free") {
    return (
      <div className="rounded-xl p-8 text-center" style={{ border: CARD_BORDER, backgroundColor: PC.card }}>
        <p className="text-sm" style={{ color: PC.muted }}>
          Disponible à partir du plan Starter
        </p>
        <BtnPrimary className="mt-4" onClick={() => router.push("/parametres/abonnement")}>
          Voir les abonnements
        </BtnPrimary>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg15, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm" style={{ color: PC.muted }}>
          Chargement des documents…
        </p>
      ) : null}

      {SECTIONS.map((section) => (
        <section
          key={section.id}
          className="rounded-xl p-4 transition-colors"
          style={{ border: CARD_BORDER, backgroundColor: PC.card }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold" style={{ color: PC.text }}>
              <span className="mr-2">{section.emoji}</span>
              {section.title}
            </h3>
            <div>
              <input
                ref={(el) => {
                  fileInputs.current[section.id] = el;
                }}
                type="file"
                className="sr-only"
                accept="*/*"
                onChange={(e) => void onFileChange(section.id, e)}
              />
              <BtnSecondary
                size="small"
                disabled={uploadingCat !== null}
                loading={uploadingCat === section.id}
                onClick={() => onPickFile(section.id)}
              >
                Ajouter un document
              </BtnSecondary>
            </div>
          </div>

          <ul className="mt-3 divide-y" style={{ borderColor: PC.borderRow }}>
            {(byCategory.get(section.id) ?? []).length === 0 ? (
              <li className="py-4 text-sm" style={{ color: PC.tertiary }}>
                Aucun document dans cette catégorie
              </li>
            ) : (
              (byCategory.get(section.id) ?? []).map((doc) => {
                const kind = fileKind(doc.type_mime, doc.nom);
                return (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg py-3 transition-colors first:pt-0"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = PC.cardHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <FileTypeIcon kind={kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: PC.text }} title={doc.nom}>
                        {doc.nom}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: PC.muted }}>
                        {formatBytes(doc.taille_bytes)} · {formatDateFr(doc.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <BtnSecondary size="small" onClick={() => void onDownload(doc.id)}>
                        Télécharger PDF
                      </BtnSecondary>
                      <BtnDanger
                        size="small"
                        disabled={deletingId === doc.id}
                        onClick={() => setDeleteConfirmId(doc.id)}
                      >
                        Supprimer
                      </BtnDanger>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      ))}

      <ConfirmModal
        open={deleteConfirmId != null}
        title="Supprimer le document"
        description="Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible."
        loading={deletingId != null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void onDelete(deleteConfirmId);
        }}
      />
    </div>
  );
}
