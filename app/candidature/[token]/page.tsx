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
  situation: string;
  nb_personnes_foyer: string;
  a_garant: boolean;
  type_garant: string;
  revenus_garant: string;
  employeur_garant: string;
  type_contrat_garant: string;
  /** Prénom et nom du garant (personne physique) */
  nom_prenom_garant: string;
};

const initialForm: FormState = {
  type_contrat: "CDI",
  employeur: "",
  anciennete_mois: "",
  revenus_nets_mensuels: "",
  situation: "seul",
  nb_personnes_foyer: "",
  a_garant: false,
  type_garant: "",
  revenus_garant: "",
  employeur_garant: "",
  type_contrat_garant: "",
  nom_prenom_garant: "",
};

const TYPE_CONTRAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "interimaire", label: "Intérim" },
  { value: "independant", label: "Indépendant / Freelance" },
  { value: "fonctionnaire", label: "Fonctionnaire" },
  { value: "etudiant", label: "Étudiant" },
  { value: "retraite", label: "Retraité" },
  { value: "sans_emploi", label: "Sans emploi" },
];

function skipEmployerSeniority(typeContrat: string): boolean {
  return typeContrat === "etudiant" || typeContrat === "retraite" || typeContrat === "sans_emploi";
}

function revenusLabel(typeContrat: string): string {
  if (typeContrat === "independant") return "Revenus nets mensuels moyens (€)";
  if (typeContrat === "etudiant") return "Revenus mensuels (bourses, aides, etc.) (€)";
  if (typeContrat === "retraite") return "Pension mensuelle nette (€)";
  return "Revenus nets mensuels (€)";
}

type UploadSectionRow = {
  key: string;
  label: string;
  description: string;
  typeDocument: string;
  multiple?: boolean;
  required?: boolean;
  garantOnly?: boolean;
  moralOnly?: boolean;
  visaleOnly?: boolean;
};

const uploadSections: UploadSectionRow[] = [
  {
    key: "identite",
    label: "Pièce d'identité",
    description:
      "Carte nationale d'identité, passeport ou titre de séjour en cours de validité (recto/verso)",
    typeDocument: "piece_identite",
    required: true,
  },
  {
    key: "domicile",
    label: "Justificatif de domicile actuel",
    description:
      "3 dernières quittances de loyer, ou facture d'énergie/eau de moins de 3 mois, ou attestation d'hébergement + pièce d'identité de l'hébergeant",
    typeDocument: "justificatif_domicile",
    multiple: true,
    required: true,
  },
  {
    key: "contrat",
    label: "Justificatif de situation professionnelle",
    description:
      "Contrat de travail ou attestation employeur (CDI/CDD), extrait Kbis < 3 mois (indépendant), carte étudiante ou certificat de scolarité (étudiant)",
    typeDocument: "contrat_travail",
    required: true,
  },
  {
    key: "bulletin",
    label: "3 derniers bulletins de salaire",
    description: "Les 3 derniers bulletins consécutifs sans interruption",
    typeDocument: "bulletin_salaire",
    multiple: true,
    required: true,
  },
  {
    key: "impot",
    label: "Dernier avis d'imposition",
    description: "Avis d'imposition N-1 (ou N-2 si N-1 non disponible)",
    typeDocument: "avis_imposition",
    required: true,
  },
  {
    key: "garant_identite",
    label: "Pièce d'identité du garant",
    description: "Carte nationale d'identité, passeport ou permis de conduire du garant (recto/verso)",
    typeDocument: "garant_identite",
    garantOnly: true,
    required: false,
  },
  {
    key: "garant_domicile",
    label: "Justificatif de domicile du garant",
    description: "Quittance de loyer, facture d'énergie/eau < 3 mois, ou attestation d'assurance habitation < 3 mois",
    typeDocument: "garant_domicile",
    garantOnly: true,
    required: false,
  },
  {
    key: "garant_bulletins",
    label: "3 derniers bulletins de salaire du garant",
    description: "Les 3 derniers bulletins consécutifs du garant",
    typeDocument: "garant_bulletins",
    multiple: true,
    garantOnly: true,
    required: false,
  },
  {
    key: "garant_impot",
    label: "Avis d'imposition du garant",
    description: "Dernier avis d'imposition du garant",
    typeDocument: "garant_impot",
    garantOnly: true,
    required: false,
  },
  {
    key: "garant_docs_moral",
    label: "Documents de la personne morale garante",
    description: "Extrait Kbis < 3 mois ou statuts, pièce d'identité du représentant légal",
    typeDocument: "garant_docs_moral",
    multiple: true,
    moralOnly: true,
    required: false,
  },
  {
    key: "garant_visale",
    label: "Numéro de visa Visale",
    description: "Attestation ou numéro de visa Visale délivré par Action Logement",
    typeDocument: "garant_visale",
    visaleOnly: true,
    required: false,
  },
];

function isUploadSectionVisible(form: FormState, section: UploadSectionRow): boolean {
  if (!section.garantOnly && !section.moralOnly && !section.visaleOnly) return true;
  if (!form.a_garant) return false;
  if (section.visaleOnly) return form.type_garant === "visale";
  if (section.moralOnly) return form.type_garant === "moral";
  if (section.garantOnly) return form.type_garant === "physique";
  return true;
}

const navRowClass = "flex flex-col-reverse sm:flex-row gap-2 mt-6";

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

    if (!token || token.trim().length < 10) {
      return;
    }

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
  const hideEmployerBlock = skipEmployerSeniority(form.type_contrat);

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
    const hasGarant = form.a_garant;
    const payload = {
      token,
      formulaire_data: {
        ...form,
        anciennete_mois: Number(form.anciennete_mois || 0),
        revenus_nets_mensuels: Number(form.revenus_nets_mensuels || 0),
        revenus_garant:
          hasGarant && form.type_garant === "physique" && form.revenus_garant ? Number(form.revenus_garant) : null,
        nb_personnes_foyer: Number(form.nb_personnes_foyer || 0),
        type_garant: hasGarant ? form.type_garant : "",
        nom_prenom_garant: hasGarant && form.type_garant === "physique" ? form.nom_prenom_garant : "",
        employeur_garant: hasGarant ? form.employeur_garant : "",
        type_contrat_garant: hasGarant && form.type_garant === "physique" ? form.type_contrat_garant : "",
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

  const tokenPending = !token || token.trim().length < 10;
  if (loadingToken || tokenPending) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center" style={{ color: PC.muted }}>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-violet-500" />
          <p className="text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (tokenInfo?.expire) {
    return (
      <ErrorBox
        title="Lien expiré"
        message="Ce lien de candidature a expiré. Contactez le propriétaire pour obtenir un nouveau lien."
      />
    );
  }

  if (!tokenInfo?.valide) {
    return (
      <ErrorBox
        title="Lien invalide"
        message="Ce lien de candidature est invalide ou n'existe pas."
      />
    );
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
            <h1 className="text-xl font-semibold">
              Bonjour {tokenInfo.prenom_candidat} {tokenInfo.nom_candidat}
            </h1>
            <p style={{ color: PC.muted }}>Logement concerné : {tokenInfo.logement_concerne}</p>
            <BtnPrimary className="w-full sm:w-auto" onClick={() => setStep(2)}>
              Commencer mon dossier
            </BtnPrimary>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Situation professionnelle</h2>
            <select
              className="locavio-select w-full"
              value={form.type_contrat}
              onChange={(e) => setForm((v) => ({ ...v, type_contrat: e.target.value }))}
            >
              {TYPE_CONTRAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {!hideEmployerBlock ? (
              <>
                <input
                  className="locavio-input w-full"
                  placeholder="Nom de l'employeur"
                  value={form.employeur}
                  onChange={(e) => setForm((v) => ({ ...v, employeur: e.target.value }))}
                />
                <input
                  className="locavio-input w-full"
                  type="number"
                  min={0}
                  placeholder="Ancienneté en mois"
                  value={form.anciennete_mois}
                  onChange={(e) => setForm((v) => ({ ...v, anciennete_mois: e.target.value }))}
                />
              </>
            ) : null}
            <div>
              <label className="mb-1 block text-sm" style={{ color: PC.muted }}>
                {revenusLabel(form.type_contrat)}
              </label>
              <input
                className="locavio-input w-full"
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={form.revenus_nets_mensuels}
                onChange={(e) => setForm((v) => ({ ...v, revenus_nets_mensuels: e.target.value }))}
              />
            </div>
            <div className={navRowClass}>
              <BtnNeutral className="w-full sm:w-auto" onClick={() => setStep(1)}>
                Retour
              </BtnNeutral>
              <BtnPrimary className="w-full sm:w-auto" onClick={() => setStep(3)}>
                Suivant
              </BtnPrimary>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Avez-vous un garant ?</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={form.a_garant} onChange={() => setForm((v) => ({ ...v, a_garant: true }))} />
                Oui
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={!form.a_garant}
                  onChange={() =>
                    setForm((v) => ({
                      ...v,
                      a_garant: false,
                      type_garant: "",
                      revenus_garant: "",
                      employeur_garant: "",
                      type_contrat_garant: "",
                      nom_prenom_garant: "",
                    }))
                  }
                />
                Non
              </label>
            </div>
            {form.a_garant ? (
              <>
                <select
                  className="locavio-select w-full"
                  value={form.type_garant}
                  onChange={(e) => {
                    const type_garant = e.target.value;
                    setForm((v) => ({
                      ...v,
                      type_garant,
                      revenus_garant: "",
                      employeur_garant: "",
                      type_contrat_garant: "",
                      nom_prenom_garant: "",
                    }));
                  }}
                >
                  <option value="">Type de garant</option>
                  <option value="physique">Personne physique (parent, proche)</option>
                  <option value="moral">Personne morale (entreprise, organisme)</option>
                  <option value="visale">Garantie Visale (Action Logement)</option>
                </select>
                {form.type_garant === "physique" ? (
                  <>
                    <input
                      className="locavio-input w-full"
                      placeholder="Prénom et nom du garant"
                      value={form.nom_prenom_garant}
                      onChange={(e) => setForm((v) => ({ ...v, nom_prenom_garant: e.target.value }))}
                    />
                    <select
                      className="locavio-select w-full"
                      value={form.type_contrat_garant}
                      onChange={(e) => setForm((v) => ({ ...v, type_contrat_garant: e.target.value }))}
                    >
                      <option value="">Type de contrat du garant</option>
                      {TYPE_CONTRAT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="locavio-input w-full"
                      placeholder="Employeur du garant"
                      value={form.employeur_garant}
                      onChange={(e) => setForm((v) => ({ ...v, employeur_garant: e.target.value }))}
                    />
                    <input
                      className="locavio-input w-full"
                      type="number"
                      min={0}
                      placeholder="Revenus nets mensuels du garant (€)"
                      value={form.revenus_garant}
                      onChange={(e) => setForm((v) => ({ ...v, revenus_garant: e.target.value }))}
                    />
                  </>
                ) : null}
                {form.type_garant === "moral" ? (
                  <>
                    <input
                      className="locavio-input w-full"
                      placeholder="Nom de l'organisme"
                      value={form.employeur_garant}
                      onChange={(e) => setForm((v) => ({ ...v, employeur_garant: e.target.value }))}
                    />
                    <p className="rounded-lg border p-3 text-sm" style={{ borderColor: PC.border, color: PC.muted }}>
                      Fournissez un extrait Kbis ou statuts à l&apos;étape documents.
                    </p>
                  </>
                ) : null}
                {form.type_garant === "visale" ? (
                  <p className="rounded-lg border p-3 text-sm" style={{ borderColor: PC.success, color: PC.success }}>
                    La garantie Visale est gratuite et acceptée par la majorité des propriétaires. Vous fournirez le
                    numéro de visa Visale à l&apos;étape documents.
                  </p>
                ) : null}
              </>
            ) : null}
            <div className={navRowClass}>
              <BtnNeutral className="w-full sm:w-auto" onClick={() => setStep(2)}>
                Retour
              </BtnNeutral>
              <BtnPrimary className="w-full sm:w-auto" onClick={() => setStep(4)}>
                Suivant
              </BtnPrimary>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Situation personnelle</h2>
            <select
              className="locavio-select w-full"
              value={form.situation}
              onChange={(e) => setForm((v) => ({ ...v, situation: e.target.value }))}
            >
              <option value="seul">Seul(e)</option>
              <option value="couple">En couple</option>
              <option value="famille">Famille</option>
              <option value="colocation">Colocataires</option>
            </select>
            <input
              className="locavio-input w-full"
              type="number"
              min={1}
              placeholder="Nombre de personnes qui occuperont le logement"
              value={form.nb_personnes_foyer}
              onChange={(e) => setForm((v) => ({ ...v, nb_personnes_foyer: e.target.value }))}
            />
            <div className={navRowClass}>
              <BtnNeutral className="w-full sm:w-auto" onClick={() => setStep(3)}>
                Retour
              </BtnNeutral>
              <BtnPrimary className="w-full sm:w-auto" onClick={() => setStep(5)}>
                Suivant
              </BtnPrimary>
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Documents justificatifs</h2>
            <div
              className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm"
              style={{ color: PC.muted }}
            >
              <p className="mb-2 font-medium" style={{ color: PC.text }}>
                📋 Documents conformes au décret n°2015-1437
              </p>
              <p>
                Seuls les documents prévus par la loi vous sont demandés. Aucun relevé bancaire, aucun extrait de
                casier judiciaire ne peut être exigé.
              </p>
            </div>
            {uploadSections.filter((s) => isUploadSectionVisible(form, s)).map((section) => (
              <div key={section.key} className="rounded-lg border p-3" style={{ borderColor: PC.border }}>
                <p className="mb-1 text-sm font-medium" style={{ color: PC.text }}>
                  {section.label}
                  {section.required ? <span style={{ color: PC.danger }}> *</span> : null}
                </p>
                <p className="mb-2 whitespace-pre-line text-xs" style={{ color: PC.muted }}>
                  {section.description}
                </p>
                <input
                  className="w-full max-w-full text-sm"
                  type="file"
                  multiple={Boolean(section.multiple)}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => void uploadFiles(section.typeDocument, e.target.files)}
                />
              </div>
            ))}
            <div className="space-y-1 text-xs" style={{ color: PC.muted }}>
              {Object.entries(uploadState).map(([name, status]) => (
                <p key={name}>
                  {name} : {status}
                </p>
              ))}
            </div>
            <div className={navRowClass}>
              <BtnNeutral className="w-full sm:w-auto" onClick={() => setStep(4)}>
                Retour
              </BtnNeutral>
              <BtnPrimary className="w-full sm:w-auto" onClick={() => setStep(6)}>
                Suivant
              </BtnPrimary>
            </div>
          </section>
        ) : null}

        {step === 6 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Confirmation</h2>
            <p className="text-sm" style={{ color: PC.muted }}>
              Vérifiez vos informations puis soumettez votre dossier.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={rgpdAccepted} onChange={(e) => setRgpdAccepted(e.target.checked)} />
              J&apos;accepte que ces informations soient transmises au propriétaire dans le cadre de ma candidature
              et conservées 6 mois maximum conformément au RGPD.
            </label>
            {submitError ? (
              <p className="text-sm" style={{ color: PC.danger }}>
                {submitError}
              </p>
            ) : null}
            <div className={navRowClass}>
              <BtnNeutral className="w-full sm:w-auto" onClick={() => setStep(5)}>
                Retour
              </BtnNeutral>
              <BtnPrimary className="w-full sm:w-auto" loading={isSubmitting} onClick={() => void submitDossier()}>
                Soumettre mon dossier
              </BtnPrimary>
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
        <div className="mb-4 flex justify-center">
          <LogoFull className="h-9 w-auto" />
        </div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2" style={{ color: PC.muted }}>
          {message}
        </p>
      </div>
    </main>
  );
}
