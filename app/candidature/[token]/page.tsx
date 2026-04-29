"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BtnNeutral, BtnPrimary } from "@/components/ui";
import { LogoFull } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

type TokenInfo = {
  valide: boolean;
  expire: boolean;
  soumis: boolean;
  prenom_candidat: string;
  nom_candidat: string;
  logement_concerne?: string;
  loyer_reference?: number;
};

type FormState = {
  type_contrat: string;
  employeur: string;
  anciennete_mois: string;
  revenus_nets_mensuels: string;
  a_garant: boolean;
  type_garant: string;
  revenus_garant: string;
  situation: string;
  nb_personnes_foyer: string;
};

const initialForm: FormState = {
  type_contrat: "CDI",
  employeur: "",
  anciennete_mois: "",
  revenus_nets_mensuels: "",
  a_garant: false,
  type_garant: "",
  revenus_garant: "",
  situation: "seul",
  nb_personnes_foyer: "",
};

const uploadSections: Array<{ key: string; label: string; typeDocument: string; multiple?: boolean }> = [
  { key: "bulletin", label: "3 derniers bulletins de salaire", typeDocument: "bulletin_salaire", multiple: true },
  { key: "impot", label: "Dernier avis d'imposition", typeDocument: "avis_imposition" },
  { key: "contrat", label: "Contrat de travail", typeDocument: "contrat_travail" },
  { key: "identite", label: "Pièce d'identité", typeDocument: "piece_identite" },
  { key: "domicile", label: "Justificatif de domicile", typeDocument: "justificatif_domicile" },
  { key: "garant", label: "Documents garant", typeDocument: "document_garant", multiple: true },
];

export default function CandidatureTokenPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token ?? "");
  const router = useRouter();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [uploadState, setUploadState] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingToken(true);
      const res = await fetch(`/api/candidature/get-token?token=${encodeURIComponent(token)}`);
      const payload = (await res.json().catch(() => null)) as TokenInfo | { error?: string } | null;
      if (cancelled) return;
      if (!res.ok && res.status !== 410) {
        setTokenInfo({ valide: false, expire: false, soumis: false, prenom_candidat: "", nom_candidat: "" });
      } else {
        setTokenInfo((payload ?? null) as TokenInfo | null);
      }
      setLoadingToken(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const progress = Math.round((Math.min(step, 6) / 6) * 100);

  async function uploadFiles(typeDocument: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const key = `${typeDocument}_${file.name}`;
      setUploadState((prev) => ({ ...prev, [key]: "en cours" }));
      const fd = new FormData();
      fd.set("token", token);
      fd.set("type_document", typeDocument);
      fd.set("fichier", file);
      const res = await fetch("/api/candidature/upload-document", { method: "POST", body: fd });
      setUploadState((prev) => ({ ...prev, [key]: res.ok ? "uploadé" : "erreur" }));
    }
  }

  async function submitDossier() {
    if (!rgpdAccepted) return setSubmitError("Veuillez accepter la clause RGPD.");
    setIsSubmitting(true);
    setSubmitError("");
    const payload = {
      token,
      formulaire_data: {
        ...form,
        anciennete_mois: Number(form.anciennete_mois || 0),
        revenus_nets_mensuels: Number(form.revenus_nets_mensuels || 0),
        revenus_garant: form.revenus_garant ? Number(form.revenus_garant) : null,
        nb_personnes_foyer: Number(form.nb_personnes_foyer || 0),
      },
    };
    const res = await fetch("/api/candidature/soumettre", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setSubmitError(j.error ?? "Soumission impossible.");
      setIsSubmitting(false);
      return;
    }
    setSubmitSuccess(true);
    setIsSubmitting(false);
  }

  if (loadingToken) {
    return <main className="mx-auto max-w-[640px] p-6">Chargement...</main>;
  }

  if (!tokenInfo?.valide) {
    return <ErrorBox title="Lien invalide" message="Ce lien de candidature est invalide." />;
  }
  if (tokenInfo.expire) {
    return <ErrorBox title="Ce lien a expiré" message="Demandez un nouveau lien au propriétaire." />;
  }
  if (tokenInfo.soumis || submitSuccess) {
    return (
      <ErrorBox
        title={tokenInfo.soumis ? "Dossier déjà soumis" : "Votre dossier a bien été transmis au propriétaire."}
        message="Merci, votre candidature a été enregistrée."
      />
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[640px] p-4 sm:p-6" style={{ color: PC.text }}>
      <div className="mb-6 flex justify-center">
        <LogoFull className="h-9 w-auto" />
      </div>
      <div className="locavio-card rounded-xl p-5">
        <div className="mb-4 h-2 w-full rounded-full" style={{ backgroundColor: PC.cardHover }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: PC.primary }} />
        </div>

        {step === 1 ? (
          <section className="space-y-3">
            <h1 className="text-xl font-semibold">Bonjour {tokenInfo.prenom_candidat} {tokenInfo.nom_candidat}</h1>
            <p style={{ color: PC.muted }}>Logement concerné : {tokenInfo.logement_concerne}</p>
            <BtnPrimary onClick={() => setStep(2)}>Commencer mon dossier</BtnPrimary>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Situation professionnelle</h2>
            <select className="locavio-select w-full" value={form.type_contrat} onChange={(e) => setForm((v) => ({ ...v, type_contrat: e.target.value }))}>
              <option value="CDI">CDI</option><option value="CDD_long">CDD &gt; 6 mois</option><option value="CDD_court">CDD &lt; 6 mois</option>
              <option value="independant">Indépendant/Auto-entrepreneur</option><option value="interimaire">Intérimaire</option>
              <option value="etudiant">Étudiant</option><option value="retraite">Retraité</option><option value="fonctionnaire">Fonctionnaire</option><option value="sans_emploi">Sans emploi</option>
            </select>
            <input className="locavio-input w-full" placeholder="Nom de l'employeur" value={form.employeur} onChange={(e) => setForm((v) => ({ ...v, employeur: e.target.value }))} />
            <input className="locavio-input w-full" placeholder="Ancienneté (mois)" value={form.anciennete_mois} onChange={(e) => setForm((v) => ({ ...v, anciennete_mois: e.target.value }))} />
            <input className="locavio-input w-full" placeholder="Revenus nets mensuels (€)" value={form.revenus_nets_mensuels} onChange={(e) => setForm((v) => ({ ...v, revenus_nets_mensuels: e.target.value }))} />
            <div className="flex gap-2"><BtnNeutral onClick={() => setStep(1)}>Retour</BtnNeutral><BtnPrimary onClick={() => setStep(3)}>Suivant</BtnPrimary></div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Garant</h2>
            <div className="flex gap-3">
              <label><input type="radio" checked={form.a_garant} onChange={() => setForm((v) => ({ ...v, a_garant: true }))} /> Oui</label>
              <label><input type="radio" checked={!form.a_garant} onChange={() => setForm((v) => ({ ...v, a_garant: false, type_garant: "", revenus_garant: "" }))} /> Non</label>
            </div>
            {form.a_garant ? (
              <>
                <select className="locavio-select w-full" value={form.type_garant} onChange={(e) => setForm((v) => ({ ...v, type_garant: e.target.value }))}>
                  <option value="">Type de garant</option>
                  <option value="personnel_solvable">Personnel — revenus ≥ 3x loyer</option>
                  <option value="personnel_moins_solvable">Personnel — revenus &lt; 3x loyer</option>
                  <option value="bancaire">Garant bancaire</option>
                  <option value="visale">Visale</option>
                </select>
                {(form.type_garant === "personnel_solvable" || form.type_garant === "personnel_moins_solvable") ? (
                  <input className="locavio-input w-full" placeholder="Revenus nets mensuels du garant (€)" value={form.revenus_garant} onChange={(e) => setForm((v) => ({ ...v, revenus_garant: e.target.value }))} />
                ) : null}
              </>
            ) : null}
            <div className="flex gap-2"><BtnNeutral onClick={() => setStep(2)}>Retour</BtnNeutral><BtnPrimary onClick={() => setStep(4)}>Suivant</BtnPrimary></div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Situation personnelle</h2>
            <select className="locavio-select w-full" value={form.situation} onChange={(e) => setForm((v) => ({ ...v, situation: e.target.value }))}>
              <option value="seul">Seul(e)</option><option value="couple">En couple</option><option value="colocation">Colocation</option><option value="famille">Avec famille</option>
            </select>
            <input
              className="locavio-input w-full"
              type="number"
              min={1}
              placeholder="Nombre de personnes qui occuperont le logement"
              value={form.nb_personnes_foyer}
              onChange={(e) => setForm((v) => ({ ...v, nb_personnes_foyer: e.target.value }))}
            />
            <div className="flex gap-2"><BtnNeutral onClick={() => setStep(3)}>Retour</BtnNeutral><BtnPrimary onClick={() => setStep(5)}>Suivant</BtnPrimary></div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Documents justificatifs</h2>
            {uploadSections.map((section) => (
              <div key={section.key} className="rounded-lg border p-3" style={{ borderColor: PC.border }}>
                <p className="mb-2 text-sm">{section.label}</p>
                <input type="file" multiple={Boolean(section.multiple)} accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => void uploadFiles(section.typeDocument, e.target.files)} />
              </div>
            ))}
            <div className="space-y-1 text-xs" style={{ color: PC.muted }}>
              {Object.entries(uploadState).map(([name, status]) => <p key={name}>{name} : {status}</p>)}
            </div>
            <div className="flex gap-2"><BtnNeutral onClick={() => setStep(4)}>Retour</BtnNeutral><BtnPrimary onClick={() => setStep(6)}>Suivant</BtnPrimary></div>
          </section>
        ) : null}

        {step === 6 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Confirmation</h2>
            <p className="text-sm" style={{ color: PC.muted }}>Vérifiez vos informations puis soumettez votre dossier.</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={rgpdAccepted} onChange={(e) => setRgpdAccepted(e.target.checked)} />
              J'accepte que ces informations soient transmises au propriétaire dans le cadre de ma candidature et conservées 6 mois maximum conformément au RGPD.
            </label>
            {submitError ? <p className="text-sm" style={{ color: PC.danger }}>{submitError}</p> : null}
            <div className="flex gap-2">
              <BtnNeutral onClick={() => setStep(5)}>Retour</BtnNeutral>
              <BtnPrimary loading={isSubmitting} onClick={() => void submitDossier()}>Soumettre mon dossier</BtnPrimary>
            </div>
          </section>
        ) : null}
      </div>
      <button className="sr-only" onClick={() => router.refresh()} />
    </main>
  );
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center p-6">
      <div className="locavio-card w-full rounded-xl p-8 text-center">
        <div className="mb-4 flex justify-center"><LogoFull className="h-9 w-auto" /></div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2" style={{ color: PC.muted }}>{message}</p>
      </div>
    </main>
  );
}
