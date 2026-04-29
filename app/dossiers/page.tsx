"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconFolder, IconPlus } from "@/components/locavio-icons";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { supabase } from "@/lib/supabase";
import { NOTE_COLORS } from "@/lib/candidature";

type DossierRow = {
  id: string;
  logement_concerne: string;
  statut: string;
  created_at: string;
  candidature_tokens?: Array<{ expire_at?: string; prenom_candidat?: string; nom_candidat?: string }>;
  candidature_formulaires?: Array<{ score?: number; note?: string }>;
};

export default function DossiersPage() {
  const [rows, setRows] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("candidature_dossiers")
        .select(
          "id, logement_concerne, statut, created_at, candidature_tokens(expire_at, prenom_candidat, nom_candidat), candidature_formulaires(score, note)",
        )
        .eq("proprietaire_id", user.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows((data as DossierRow[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="locavio-page-wrap space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="locavio-page-title">Dossiers de candidature</h1></div>
        <Link href="/dossiers/nouveau">
          <BtnPrimary icon={<IconPlus className="h-4 w-4" />}>Nouveau dossier</BtnPrimary>
        </Link>
      </div>
      {loading ? <div className="locavio-card rounded-xl p-4">Chargement...</div> : null}
      {!loading && rows.length === 0 ? (
        <div className="locavio-empty-state">
          <IconFolder className="h-10 w-10" />
          <p style={{ color: PC.muted }}>Aucun dossier créé. Envoyez votre premier questionnaire.</p>
        </div>
      ) : null}
      <div className="space-y-3">
        {rows.map((row) => {
          const token = row.candidature_tokens?.[0];
          const form = row.candidature_formulaires?.[0];
          const expired = token?.expire_at ? new Date(token.expire_at).getTime() < Date.now() : false;
          const note = form?.note ?? "";
          const noteColor = NOTE_COLORS[note] ?? { bg: PC.cardHover, color: PC.text };
          const labelStatut = row.statut === "en_attente" ? "En attente" : row.statut === "recu" ? "Reçu" : "Analysé";
          return (
            <Link key={row.id} href={`/dossiers/${row.id}`} className="locavio-card block rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{token?.prenom_candidat} {token?.nom_candidat}</p>
                  <p className="text-sm" style={{ color: PC.muted }}>{row.logement_concerne}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full px-2 py-1" style={{ backgroundColor: PC.primaryBg15, color: PC.secondary }}>{labelStatut}</span>
                  {form ? <span className="rounded-full px-2 py-1" style={{ backgroundColor: noteColor.bg, color: noteColor.color }}>{form.score}/100 · {note}</span> : null}
                  <span className="rounded-full px-2 py-1" style={{ backgroundColor: expired ? PC.dangerBg10 : PC.successBg10, color: expired ? PC.danger : PC.success }}>
                    {expired ? "Lien expiré" : "Lien valide"}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: PC.tertiary }}>Créé le {new Date(row.created_at).toLocaleDateString("fr-FR")}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
