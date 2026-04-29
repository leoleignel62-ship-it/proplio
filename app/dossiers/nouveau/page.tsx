"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { supabase } from "@/lib/supabase";

type LogementOption = {
  id: string;
  nom: string;
  adresse: string;
  loyer: number;
  charges: number;
};

const MANUAL_LOGEMENT_VALUE = "__manual__";

export default function NouveauDossierPage() {
  const [values, setValues] = useState({
    logement_concerne: "",
    loyer_reference: "",
    prenom_candidat: "",
    nom_candidat: "",
    email_candidat: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLogements, setIsLoadingLogements] = useState(true);
  const [selectedLogement, setSelectedLogement] = useState("");
  const [logements, setLogements] = useState<LogementOption[]>([]);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const isManualMode = selectedLogement === MANUAL_LOGEMENT_VALUE;

  const logementChoices = useMemo(
    () =>
      logements.map((logement) => ({
        value: logement.id,
        label: logement.nom.trim() || logement.adresse.trim() || "Logement sans nom",
      })),
    [logements],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoadingLogements(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsLoadingLogements(false);
        return;
      }
      const { data, error } = await supabase
        .from("logements")
        .select("id, nom, adresse, loyer, charges")
        .eq("proprietaire_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setMessage("Impossible de charger vos logements.");
        setIsLoadingLogements(false);
        return;
      }
      setLogements(
        ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
          id: String(row.id ?? ""),
          nom: String(row.nom ?? ""),
          adresse: String(row.adresse ?? ""),
          loyer: Number(row.loyer ?? 0),
          charges: Number(row.charges ?? 0),
        })),
      );
      setIsLoadingLogements(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onChangeLogement(nextValue: string) {
    setSelectedLogement(nextValue);
    if (nextValue === MANUAL_LOGEMENT_VALUE) {
      setValues((v) => ({ ...v, logement_concerne: "", loyer_reference: "" }));
      return;
    }
    const selected = logements.find((logement) => logement.id === nextValue);
    if (!selected) {
      setValues((v) => ({ ...v, logement_concerne: "", loyer_reference: "" }));
      return;
    }
    const label = selected.nom.trim() || selected.adresse.trim() || "Logement sans nom";
    const loyerCc = selected.loyer + selected.charges;
    setValues((v) => ({ ...v, logement_concerne: label, loyer_reference: String(loyerCc) }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const res = await fetch("/api/candidature/creer-dossier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, loyer_reference: Number(values.loyer_reference) }),
    });
    const payload = (await res.json().catch(() => ({}))) as { dossier_id?: string; error?: string };
    if (!res.ok || !payload.dossier_id) {
      setMessage(payload.error ?? "Erreur lors de l'envoi.");
      setIsSubmitting(false);
      return;
    }
    setMessage(`Email envoyé à ${values.email_candidat}`);
    router.push(`/dossiers/${payload.dossier_id}`);
  }

  return (
    <section className="locavio-page-wrap">
      <div className="locavio-card mx-auto max-w-2xl rounded-xl p-6">
        <h1 className="locavio-page-title text-2xl">Nouveau dossier</h1>
        <p className="locavio-page-subtitle">Envoyez un questionnaire candidat en quelques secondes.</p>
        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <label className="text-sm" style={{ color: PC.muted }}>
            Logement concerné
            <select
              className="locavio-select mt-1 w-full"
              value={selectedLogement}
              onChange={(e) => onChangeLogement(e.target.value)}
              required
              disabled={isLoadingLogements}
            >
              <option value="">{isLoadingLogements ? "Chargement..." : "Sélectionner un logement"}</option>
              {logementChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
              <option value={MANUAL_LOGEMENT_VALUE}>Autre (saisie manuelle)</option>
            </select>
          </label>
          {isManualMode ? (
            <input
              className="locavio-input"
              placeholder="Nom du logement (saisie manuelle)"
              value={values.logement_concerne}
              onChange={(e) => setValues((v) => ({ ...v, logement_concerne: e.target.value }))}
              required
            />
          ) : null}
          <label className="text-sm" style={{ color: PC.muted }}>
            Loyer de référence CC (charges comprises)
            <input
              className="locavio-input mt-1 w-full"
              value={values.loyer_reference}
              onChange={(e) => setValues((v) => ({ ...v, loyer_reference: e.target.value }))}
              readOnly={!isManualMode}
              required
            />
          </label>
          <input className="locavio-input" placeholder="Prénom du candidat" value={values.prenom_candidat} onChange={(e) => setValues((v) => ({ ...v, prenom_candidat: e.target.value }))} required />
          <input className="locavio-input" placeholder="Nom du candidat" value={values.nom_candidat} onChange={(e) => setValues((v) => ({ ...v, nom_candidat: e.target.value }))} required />
          <input className="locavio-input" type="email" placeholder="Email du candidat" value={values.email_candidat} onChange={(e) => setValues((v) => ({ ...v, email_candidat: e.target.value }))} required />
          {message ? <p className="text-sm" style={{ color: message.startsWith("Email") ? PC.success : PC.danger }}>{message}</p> : null}
          <div className="pt-2"><BtnPrimary type="submit" loading={isSubmitting}>Envoyer le questionnaire</BtnPrimary></div>
        </form>
      </div>
    </section>
  );
}
