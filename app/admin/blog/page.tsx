"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { ARTICLE_CATEGORIES, slugifyTitle, type BlogArticleRow } from "@/lib/blog/types";

const ACCENT = "#7c3aed";
const TEXT = "#1a0533";
const MUTED = "#6b7280";

type FormState = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  read_time: number;
  published_at: string;
  content: string;
  published: boolean;
  beta_only: boolean;
};

const emptyForm = (): FormState => ({
  id: "",
  title: "",
  slug: "",
  description: "",
  category: ARTICLE_CATEGORIES[0]!,
  read_time: 5,
  published_at: new Date().toISOString().slice(0, 10),
  content: "",
  published: false,
  beta_only: false,
});

function rowToForm(row: BlogArticleRow): FormState {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    read_time: row.read_time,
    published_at: row.published_at,
    content: row.content,
    published: row.published,
    beta_only: row.beta_only,
  };
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBlogPage() {
  const toast = useToast();
  const [articles, setArticles] = useState<BlogArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogArticleRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blog");
    if (!res.ok) {
      toast.error("Impossible de charger les articles.");
      setArticles([]);
      setLoading(false);
      return;
    }
    const body = (await res.json()) as { articles: BlogArticleRow[] };
    setArticles(body.articles ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setSlugManual(false);
    setFormOpen(true);
  }

  function openEdit(row: BlogArticleRow) {
    setForm(rowToForm(row));
    setSlugManual(true);
    setFormOpen(true);
  }

  async function saveArticle() {
    const title = form.title.trim();
    if (!title) {
      toast.error("Titre requis.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      title,
      slug: form.slug.trim() || slugifyTitle(title),
      read_time: Math.max(1, Number(form.read_time) || 5),
    };
    const isEdit = Boolean(form.id);
    const res = await fetch("/api/admin/blog", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? payload : { ...payload, id: undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(body.error ?? "Échec de l'enregistrement.");
      return;
    }
    toast.success(isEdit ? "Article mis à jour." : "Article créé.");
    setFormOpen(false);
    void load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/admin/blog?id=${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
    setDeleteBusy(false);
    if (!res.ok) {
      toast.error("Échec de la suppression.");
      return;
    }
    toast.success("Article supprimé.");
    setDeleteTarget(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: TEXT }}>
            Blog
          </h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            Articles publiés sur locavio.fr/blog
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: ACCENT }}
        >
          <Plus size={16} /> Nouvel article
        </button>
      </header>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: "rgba(124,58,237,0.12)" }}>
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-sm" style={{ color: MUTED }}>
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </p>
        ) : articles.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: MUTED }}>
            Aucun article. Lancez la migration ou créez un article.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide" style={{ color: MUTED, borderColor: "rgba(124,58,237,0.1)" }}>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Publication</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((row) => (
                  <tr key={row.id} className="border-b" style={{ borderColor: "rgba(124,58,237,0.06)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: TEXT }}>
                      {row.title}
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {row.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: row.published ? "rgba(16,185,129,0.15)" : "#f3f4f6",
                          color: row.published ? "#059669" : "#6b7280",
                        }}
                      >
                        {row.published ? "Publié" : "Brouillon"}
                      </span>
                      {row.beta_only ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Beta
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" style={{ color: MUTED }}>
                      {formatDate(row.published_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="mr-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium"
                        style={{ borderColor: "rgba(124,58,237,0.25)", color: ACCENT }}
                      >
                        <Pencil size={14} /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <div
            className="mb-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
            style={{ border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <h2 className="text-lg font-semibold" style={{ color: TEXT }}>
              {form.id ? "Modifier l'article" : "Nouvel article"}
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-medium">
                Titre
                <input
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: slugManual ? f.slug : slugifyTitle(title),
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Slug
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium">
                  Catégorie
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {ARTICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Temps de lecture (min)
                  <input
                    type="number"
                    min={1}
                    value={form.read_time}
                    onChange={(e) => setForm((f) => ({ ...f, read_time: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Date publication
                  <input
                    type="date"
                    value={form.published_at}
                    onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Contenu (HTML)
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={12}
                  className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs"
                />
              </label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
                  />
                  Publié
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.beta_only}
                    onChange={(e) => setForm((f) => ({ ...f, beta_only: e.target.checked }))}
                  />
                  Beta only
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "rgba(124,58,237,0.25)", color: ACCENT }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveArticle()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Supprimer l'article ?"
        description={`« ${deleteTarget?.title ?? ""} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
