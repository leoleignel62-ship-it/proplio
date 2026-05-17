"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { IconCalendar, IconPencil, IconPlus, IconTrash } from "@/components/locavio-icons";
import { BtnDanger, BtnPrimary, BtnSecondary, ConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PlanFreeModuleUpsell } from "@/components/plan-free-module-upsell";
import { compressImage } from "@/lib/compress-image";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { canAccessSaisonnier, getOwnerPlan, type LocavioPlan } from "@/lib/plan-limits";
import { formatSubmitError } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle, panelCard } from "@/lib/locavio-field-styles";

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

type LogementOption = {
  id: string;
  nom: string;
};

type ReservationVoyageurLink = {
  voyageur_id: string;
  logement_id: string;
};

export default function VoyageursSaisonnierPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const logementFilter = searchParams.get("logement_id") ?? "";
  const [plan, setPlan] = useState<LocavioPlan>("free");
  const [rows, setRows] = useState<Voyageur[]>([]);
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [reservationLinks, setReservationLinks] = useState<ReservationVoyageurLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Voyageur | null>(null);
  const [sejoursByVoy, setSejoursByVoy] = useState<Record<string, number>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [hoveredVoyageurId, setHoveredVoyageurId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    if (!canAccessSaisonnier(p)) {
      setLoading(false);
      return;
    }
    const { data: logsData } = await supabase
      .from("logements")
      .select("id, nom, type_location")
      .eq("proprietaire_id", proprietaireId)
      .in("type_location", ["saisonnier", "les_deux"])
      .order("nom", { ascending: true });
    const saisonnierIds = (logsData ?? []).map((l) => String(l.id));
    const logementsData = logsData;

    const [{ data, error: fErr }, { data: resa }] = await Promise.all([
      supabase
        .from("voyageurs")
        .select("*")
        .eq("proprietaire_id", proprietaireId)
        .order("created_at", { ascending: false }),
      saisonnierIds.length === 0
        ? Promise.resolve({ data: [] as Array<{ voyageur_id: string | null; logement_id: string | null }>, error: null })
        : supabase
            .from("reservations")
            .select("voyageur_id, logement_id")
            .eq("proprietaire_id", proprietaireId)
            .in("logement_id", saisonnierIds)
            .not("voyageur_id", "is", null),
    ]);
    if (fErr) setError(formatSubmitError(fErr));
    setRows((data as Voyageur[]) ?? []);

    const links: ReservationVoyageurLink[] = [];
    const counts: Record<string, number> = {};
    for (const r of resa ?? []) {
      const vid = String(r.voyageur_id ?? "");
      const lid = String(r.logement_id ?? "");
      if (!vid || !lid) continue;
      links.push({ voyageur_id: vid, logement_id: lid });
      counts[vid] = (counts[vid] ?? 0) + 1;
    }
    setReservationLinks(links);
    setSejoursByVoy(counts);
    setLogements(
      ((logementsData ?? []) as Array<{ id?: string; nom?: string }>).map((row) => ({
        id: String(row.id ?? ""),
        nom: String(row.nom ?? "").trim() || "Logement",
      })),
    );
    setLoading(false);
  }, []);

  const filteredRows = useMemo(() => {
    if (!logementFilter) return rows;
    const voyageurIds = new Set(
      reservationLinks.filter((link) => link.logement_id === logementFilter).map((link) => link.voyageur_id),
    );
    return rows.filter((row) => voyageurIds.has(row.id));
  }, [rows, logementFilter, reservationLinks]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="locavio-page-wrap p-6 text-sm" style={{ color: PC.muted }}>
        Chargement…
      </section>
    );
  }
  if (!canAccessSaisonnier(plan)) {
    return <PlanFreeModuleUpsell variant="saisonnier" requiredPlan="pro" />;
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
    toast.success(editing ? "Voyageur mis à jour." : "Voyageur créé.");
  }

  async function onDelete(id: string) {
    setDeleting(true);
    const { proprietaireId, error: e } = await getCurrentProprietaireId();
    if (e || !proprietaireId) {
      setDeleting(false);
      return;
    }
    const { error: dErr } = await supabase.from("voyageurs").delete().eq("id", id).eq("proprietaire_id", proprietaireId);
    if (dErr) setError(formatSubmitError(dErr));
    else {
      setDeleteConfirmId(null);
      toast.success("Voyageur supprimé.");
    }
    void load();
    setDeleting(false);
  }

  async function onUploadPi(voyageurId: string, file: File | null) {
    if (!file) return;
    const uploadFile = file.type.startsWith("image/") ? await compressImage(file) : file;
    const fd = new FormData();
    fd.set("file", uploadFile);
    fd.set("voyageur_id", voyageurId);
    const res = await fetch("/api/saisonnier/voyageurs/upload-identite", { method: "POST", body: fd });
    const j = await res.json();
    if (!res.ok) setError(j.error ?? "Upload échoué");
    else toast.success("Pièce d'identité enregistrée.");
    void load();
  }

  return (
    <section className="locavio-page-wrap space-y-6" style={{ color: PC.text }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="locavio-page-title">Voyageurs</h1>
          <p className="locavio-page-subtitle">Profils pour la location saisonnière.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={logementFilter}
            onChange={(event) => {
              const next = event.target.value;
              const base = "/saisonnier/voyageurs";
              router.push(next ? `${base}?logement_id=${encodeURIComponent(next)}` : base);
            }}
            className="rounded-lg px-3 py-2 text-sm"
            style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card, color: PC.text }}
          >
            <option value="">Tous les logements</option>
            {logements.map((logement) => (
              <option key={logement.id} value={logement.id}>
                {logement.nom}
              </option>
            ))}
          </select>
          <BtnPrimary icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            Nouveau voyageur
          </BtnPrimary>
        </div>
      </div>
      {error ? (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
          {error}
        </p>
      ) : null}

      {filteredRows.length === 0 ? (
        <div className="rounded-xl p-6 text-sm" style={{ ...panelCard, color: PC.muted }}>
          Aucun voyageur. Créez-en un pour lier des réservations.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((row) => {
            const isHovered = hoveredVoyageurId === row.id;
            const initiales = `${row.prenom?.[0] ?? ""}${row.nom?.[0] ?? ""}`.toUpperCase() || "?";
            const sejours = sejoursByVoy[row.id] ?? 0;
            const hasDoc = Boolean(row.document_identite_path);
            return (
              <article
                key={row.id}
                className="flex flex-row overflow-hidden rounded-xl border transition-colors duration-200"
                style={{
                  backgroundColor: PC.card,
                  border: `1px solid ${isHovered ? PC.primary : PC.border}`,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                }}
                onMouseEnter={() => setHoveredVoyageurId(row.id)}
                onMouseLeave={() => setHoveredVoyageurId(null)}
              >
                <div className="shrink-0 self-stretch" style={{ width: 3, backgroundColor: "#7c3aed" }} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="p-4 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ backgroundColor: PC.primaryBg25, color: PC.secondary }}
                      >
                        {initiales}
                      </span>
                      <h3 className="min-w-0 text-base font-semibold leading-snug">
                        {row.prenom} {row.nom}
                      </h3>
                    </div>
                    {row.email ? (
                      <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
                        <Mail size={14} strokeWidth={1.75} className="shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{row.email}</span>
                      </p>
                    ) : null}
                    {row.telephone ? (
                      <p className={`flex items-center gap-2 text-sm${row.email ? " mt-1.5" : " mt-2"}`} style={{ color: PC.muted }}>
                        <Phone size={14} strokeWidth={1.75} className="shrink-0" aria-hidden />
                        <span>{row.telephone}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="px-4 py-2" style={{ borderTop: `1px solid ${PC.border}` }}>
                    <p className="flex items-center gap-2 text-sm" style={{ color: PC.muted }}>
                      <IconCalendar className="h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {sejours} séjour{sejours > 1 ? "s" : ""}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                        style={
                          hasDoc
                            ? { backgroundColor: PC.successBg20, color: PC.success }
                            : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                        }
                      >
                        {hasDoc ? "Vérifiée" : "Non fournie"}
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="max-w-full text-xs"
                        onChange={(e) => void onUploadPi(row.id, e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>
                  <div className="px-4 py-3" style={{ borderTop: `1px solid ${PC.border}` }}>
                    <div className="flex flex-wrap gap-2">
                      <BtnSecondary size="small" icon={<IconPencil className="h-4 w-4" />} onClick={() => openEdit(row)}>
                        Modifier
                      </BtnSecondary>
                      <BtnDanger
                        size="small"
                        icon={<IconTrash className="h-4 w-4" />}
                        onClick={() => setDeleteConfirmId(row.id)}
                      >
                        Supprimer
                      </BtnDanger>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
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
                <BtnSecondary onClick={() => setModalOpen(false)}>Annuler</BtnSecondary>
                <BtnPrimary type="submit">Enregistrer</BtnPrimary>
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

      <ConfirmModal
        open={deleteConfirmId != null}
        title="Supprimer le voyageur"
        description="Êtes-vous sûr de vouloir supprimer ce voyageur ? Cette action est irréversible."
        loading={deleting}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) void onDelete(deleteConfirmId);
        }}
      />
    </section>
  );
}
