"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BtnPrimary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";

export default function NouveauDossierPage() {
  const [values, setValues] = useState({
    logement_concerne: "",
    loyer_reference: "",
    prenom_candidat: "",
    nom_candidat: "",
    email_candidat: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

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
          <input className="locavio-input" placeholder="Logement concerné" value={values.logement_concerne} onChange={(e) => setValues((v) => ({ ...v, logement_concerne: e.target.value }))} required />
          <input className="locavio-input" placeholder="Loyer mensuel de référence (€)" value={values.loyer_reference} onChange={(e) => setValues((v) => ({ ...v, loyer_reference: e.target.value }))} required />
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
