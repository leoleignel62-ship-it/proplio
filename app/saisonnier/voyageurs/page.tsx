"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconTrash } from "@/components/proplio-icons";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { getOwnerPlan, type ProplioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, panelCard } from "@/lib/proplio-field-styles";

type Voyageur = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  nationalite: string | null;
  numero_identite: string | null;
  document_identite_path: string | null;
};

export default function VoyageursSaisonnierPage() {
  const [plan, setPlan] = useState<ProplioPlan>("free");
  const [rows, setRows] = useState<Voyageur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Voyageur | null>(null);
  const [sejoursByVoy, setSejoursByVoy] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    nationalite: "",
    numero_identite: "",
  });

  const load = useCallback(async () => {
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setLoading(false);
      return;
    }
    const p = await getOwnerPlan(proprietaireId);
    setPlan(p);
    if (p === "free") {
      setLoading(false);
      return;
    }
    const { data, error: fErr } = await supabase
      .from("voyageurs")
      .select("*")
      .eq("proprietaire_id", proprietaireId)
      .order("created_at", { ascending: false });
    if (fErr) setError(formatSubmitError(fErr));
    setRows((data as Voyageur[]) ?? []);

    const { data: resa } = await supabase
      .from("reservations")
      .select("voyageur_id")
      .eq("proprietaire_id", proprietaireId)
      .not("voyageur_id", "is", null);
    const counts: Record<string, number> = {};
    for (const r of resa ?? []) {
      const vid = r.voyageur_id as string;
      counts[vid] = (counts[vid] ?? 0) + 1;
    }
    setSejoursByVoy(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="proplio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (plan === "free") {
    return <PlanFreeModuleUpsell variant="saisonnier" />;
  }

  function openCreate() {
    setEditing(null);
    setForm({ prenom: "", nom: "", email: "", telephone: "", nationalite: "", numero_identite: "" });
    setModalOpen(true);
  }

  function openEdit(row: Voyageur) {
    setEditing(row);
    setForm({
      prenom: row.prenom,
      nom: row.nom,
      email: row.email ?? "",
      telephone: row.telephone ?? "",
      nationalite: row.nationalite ?? "",
      numero_identite: row.numero_identite ?? "",
    });
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { proprietaireId, error: ownerErr } = await getCurrentProprietaireId();
    if (ownerErr || !proprietaireId) return;
    const payload = {
      proprietaire_id: proprietaireId,
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: form.email.trim() || null,
      telephone: form.telephone.trim() || null,
      nationalite: form.nationalite.trim() || null,
      numero_identite: form.numero_identite.trim() || null,
    };
    if (!payload.prenom || !payload.nom) {
      setError("Prénom et nom obligatoires.");
      return;
    }
    const q = editing
      ? supabase.from("voyageurs").update(payload).eq("id", editing.id).eq("proprietaire_id", proprietaireId)
      : supabase.from("voyageurs").insert(payload);
    const { error: sErr } = await q;
    if (sErr) {
      setError(formatSubmitError(sErr));
      return;
    }
    setModalOpen(false);
    void load();
  }

  async function onDelete(id: string) {
    if (!confirm("Supprimer ce voyageur ?")) return;
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) return;
    const { error: dErr } = await supabase.from("voyageurs").delete().eq("id", id).eq("proprietaire_id", proprietaireId);
    if (dErr) setError(formatSubmitError(dErr));
    void load();
  }

  async function onUploadPi(voyageurId: string, file: File | null) {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("voyageur_id", voyageurId);
    const res = await fetch("/api/saisonnier/voyageurs/upload-identite", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Upload échoué");
    void load();
  }

  return (
    <section className="proplio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="proplio-page-title">Voyageurs</h1>
          <p className="proplio-page-subtitle">Profils pour la location saisonnière.</p>
        </div>
        <button type="button" className="proplio-btn-primary inline-flex items-center gap-2 px-5 py-2.5" onClick={openCreate}>
          <IconPlus className="h-4 w-4" />
          Nouveau voyageur
        </button>
      </div>
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun voyageur. Créez-en un pour lier des réservations.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${PC.border}` }}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead style={{ backgroundColor: PC.card, color: PC.muted }}>
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Pièce d&apos;identité</th>
                <th className="px-4 py-3 font-medium">Séjours</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderTop: `1px solid ${PC.border}`, backgroundColor: PC.bg }}>
                  <td className="px-4 py-3">
                    {row.prenom} {row.nom}
                  </td>
                  <td className="px-4 py-3" style={{ color: PC.muted }}>
                    {row.email ?? "—"}
                    <br />
                    {row.telephone ?? ""}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="max-w-[200px] text-xs"
                      onChange={(e) => void onUploadPi(row.id, e.target.files?.[0] ?? null)}
                    />
                    {row.document_identite_path ? (
                      <span className="ml-2 text-xs" style={{ color: PC.success }}>
                        OK
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{sejoursByVoy[row.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="text-xs underline" style={{ color: PC.primary }} onClick={() => openEdit(row)}>
                        Modifier
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 text-xs" style={{ color: PC.danger }} onClick={() => void onDelete(row.id)}>
                        <IconTrash className="h-3 w-3" />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ ...panelCard, backgroundColor: PC.card }}>
            <h3 className="text-lg font-semibold">{editing ? "Modifier le voyageur" : "Nouveau voyageur"}</h3>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Prénom
                <input required style={fieldInputStyle} value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Nom
                <input required style={fieldInputStyle} value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Email
                <input type="email" style={fieldInputStyle} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Téléphone
                <input style={fieldInputStyle} value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                Nationalité
                <input style={fieldInputStyle} value={form.nationalite} onChange={(e) => setForm((f) => ({ ...f, nationalite: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1 text-sm" style={{ color: PC.muted }}>
                N° pièce d&apos;identité
                <input style={fieldInputStyle} value={form.numero_identite} onChange={(e) => setForm((f) => ({ ...f, numero_identite: e.target.value }))} />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="proplio-btn-secondary px-4 py-2" onClick={() => setModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="proplio-btn-primary px-4 py-2">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <p className="text-sm" style={{ color: PC.muted }}>
        <Link href="/saisonnier/reservations" style={{ color: PC.primary }}>
          → Réservations
        </Link>
      </p>
    </section>
  );
}
