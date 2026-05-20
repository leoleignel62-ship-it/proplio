"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  emptyProprietaireProfile,
  fetchProprietaireProfile,
  getCurrentProprietaireId,
  getEffectivePlan,
  isProprietaireOnboardingIncomplete,
  saveProprietaireProfile,
  STATUTS_BAILLEUR_VALIDES,
  type ProprietaireProfile,
  type StatutBailleur,
} from "@/lib/proprietaire-profile";
import { formatSubmitError, isValidEmail } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PLAN_DISPLAY_FEATURES, PLAN_DISPLAY_LABELS, type PlanDisplayId } from "@/lib/plan-display-copy";
import { BtnPrimary, BtnSecondary } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle, panelCard } from "@/lib/locavio-field-styles";

function scrollAbonnementIntoView() {
  if (typeof window === "undefined" || window.location.hash !== "#abonnement") return;
  document.getElementById("abonnement")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatSubscriptionDateFr(unixSeconds: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}

const PLAN_IDS: PlanDisplayId[] = ["free", "starter", "pro", "expert"];

const ABONNEMENT_ENTITLEMENTS: Record<string, { label: string; positives: string[]; negatives?: string[] }> =
  Object.fromEntries(
    PLAN_IDS.map((id) => {
      const f = PLAN_DISPLAY_FEATURES[id];
      return [
        id,
        {
          label: PLAN_DISPLAY_LABELS[id],
          positives: f.positives,
          negatives: f.negatives,
        },
      ];
    }),
  );

type StripeSubscriptionInfo = {
  current_period_end: number;
  cancel_at_period_end: boolean;
  interval: "month" | "year" | null;
  status: string;
};

type SubscriptionStatus = {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
};

const REFERRAL_LINK_ORIGIN = "https://locavio.fr/rejoindre";
const MAX_REFERRAL_FILLEULS = 3;

function buildReferralLink(code: string): string {
  return `${REFERRAL_LINK_ORIGIN}?ref=${encodeURIComponent(code)}`;
}

function buildReferralMailto(code: string): string {
  const link = buildReferralLink(code);
  const subject = encodeURIComponent("Je t'offre 1 mois gratuit sur Locavio");
  const body = encodeURIComponent(
    `Salut,\n\nJ'utilise Locavio pour gérer mes locations et c'est vraiment pratique.\nTu peux commencer gratuitement et obtenir 1 mois offert avec mon lien :\n\n${link}\n\nBonne gestion !`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export default function ParametresPage() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProprietaireProfile>(emptyProprietaireProfile);
  const [plan, setPlan] = useState("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [error, setError] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stripeSubscription, setStripeSubscription] = useState<StripeSubscriptionInfo | null>(null);
  const [stripeSubscriptionLoading, setStripeSubscriptionLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const signatureFileRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureTab, setSignatureTab] = useState<"draw" | "upload">("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSavingDrawnSignature, setIsSavingDrawnSignature] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [convertedReferralsCount, setConvertedReferralsCount] = useState(0);
  const [referralDataLoading, setReferralDataLoading] = useState(true);
  const [referralLinkCopied, setReferralLinkCopied] = useState(false);
  const copyLinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUserId(user?.id ?? null);

      const { profile: existingProfile, error: profileError } = await fetchProprietaireProfile();
      if (!isMounted) return;

      if (profileError) {
        setError(`Erreur de chargement du profil : ${formatSubmitError(profileError)}`);
      } else if (existingProfile) {
        setProfile({
          id: existingProfile.id,
          nom: existingProfile.nom ?? "",
          prenom: existingProfile.prenom ?? "",
          email: existingProfile.email ?? "",
          telephone: existingProfile.telephone ?? "",
          adresse: existingProfile.adresse ?? "",
          ville: existingProfile.ville ?? "",
          code_postal: existingProfile.code_postal ?? "",
          siret: existingProfile.siret ?? "",
          statut_bailleur: STATUTS_BAILLEUR_VALIDES.includes(
            existingProfile.statut_bailleur as StatutBailleur,
          )
            ? (existingProfile.statut_bailleur as StatutBailleur)
            : "particulier_nu",
          nom_societe: existingProfile.nom_societe ?? "",
          siren_societe: existingProfile.siren_societe ?? "",
          signature_path: existingProfile.signature_path ?? null,
        });
        if (existingProfile.signature_path) {
          const { data } = await supabase.storage
            .from("signatures")
            .createSignedUrl(existingProfile.signature_path, 3600);
          setSignatureUrl(data?.signedUrl ?? null);
        }
        const { data: planData } = await supabase
          .from("proprietaires")
          .select("plan, override_plan")
          .eq("id", existingProfile.id)
          .maybeSingle();
        setPlan(getEffectivePlan(planData as { plan?: string | null; override_plan?: string | null } | null));
      }

      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/parametres") return;
    scrollAbonnementIntoView();
    const onHashChange = () => scrollAbonnementIntoView();
    window.addEventListener("hashchange", onHashChange);
    const t = window.setTimeout(scrollAbonnementIntoView, 150);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.clearTimeout(t);
    };
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    fetch("/api/stripe/subscription-status")
      .then((r) => r.json())
      .then((data: SubscriptionStatus) => setSubscriptionStatus(data))
      .catch(() => setSubscriptionStatus({ cancelAtPeriodEnd: false, currentPeriodEnd: null }));
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    if (plan === "free") {
      // Réinitialiser l’affichage Stripe quand le plan en base repasse à gratuit.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation dérivée du plan chargé
      setStripeSubscription(null);
      setStripeSubscriptionLoading(false);
      return;
    }

    let cancelled = false;
    setStripeSubscriptionLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/stripe/subscription");
        const data = (await res.json()) as { subscription?: StripeSubscriptionInfo | null };
        if (!cancelled) {
          setStripeSubscription(data.subscription ?? null);
        }
      } catch {
        if (!cancelled) setStripeSubscription(null);
      } finally {
        if (!cancelled) setStripeSubscriptionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan, isLoading]);

  useEffect(() => {
    if (isLoading || !userId || !profile.id) {
      setReferralDataLoading(false);
      return;
    }

    let cancelled = false;
    setReferralDataLoading(true);

    void (async () => {
      const { data: ownerRow } = await supabase
        .from("proprietaires")
        .select("referral_code")
        .eq("user_id", userId)
        .maybeSingle();

      const { count } = await supabase
        .from("parrainages")
        .select("*", { count: "exact", head: true })
        .eq("parrain_id", profile.id)
        .eq("statut", "converti");

      if (!cancelled) {
        setReferralCode(String((ownerRow as { referral_code?: string | null } | null)?.referral_code ?? "").trim());
        setConvertedReferralsCount(count ?? 0);
        setReferralDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, userId, profile.id]);

  useEffect(() => {
    return () => {
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
    };
  }, []);

  function onChange(field: keyof ProprietaireProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  async function onUploadSignature(file: File) {
    setError("");
    setIsUploadingSignature(true);

    const { proprietaireId, error: ownerError } = await getCurrentProprietaireId();
    if (ownerError || !proprietaireId) {
      setError(ownerError ? formatSubmitError(ownerError) : "Impossible de récupérer le propriétaire connecté.");
      setIsUploadingSignature(false);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${proprietaireId}/signature.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError(`Erreur d'upload de signature : ${formatSubmitError(uploadError)}`);
      setIsUploadingSignature(false);
      return;
    }

    const updatedProfile: ProprietaireProfile = { ...profile, id: proprietaireId, signature_path: filePath };
    const { data: savedProfile, error: saveError } = await saveProprietaireProfile(updatedProfile);

    if (saveError) {
      setError(`Signature uploadée mais profil non mis à jour : ${formatSubmitError(saveError)}`);
      setIsUploadingSignature(false);
      return;
    }

    const { data } = await supabase.storage.from("signatures").createSignedUrl(filePath, 3600);
    setSignatureUrl(data?.signedUrl ?? null);
    setProfile((prev) => ({ ...prev, id: savedProfile?.id, signature_path: filePath }));
    toast.success("Signature enregistrée.");
    setIsUploadingSignature(false);
  }

  async function handleDeleteSignature() {
    const { proprietaireId } = await getCurrentProprietaireId();
    if (!proprietaireId) return;

    if (profile.signature_path) {
      await supabase.storage.from("signatures").remove([profile.signature_path]);
    }

    await supabase.from("proprietaires").update({ signature_path: null }).eq("id", proprietaireId);

    setSignatureUrl(null);
    setProfile((prev) => ({ ...prev, signature_path: "" }));
    toast.success("Signature supprimée.");
  }

  async function handleSaveDrawnSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSavingDrawnSignature(true);

    const { proprietaireId, error: ownerError } = await getCurrentProprietaireId();
    if (ownerError || !proprietaireId) {
      toast.error("Impossible de récupérer le propriétaire connecté.");
      setIsSavingDrawnSignature(false);
      return;
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Erreur lors de la conversion de la signature.");
        setIsSavingDrawnSignature(false);
        return;
      }
      const file = new File([blob], "signature.png", { type: "image/png" });
      await onUploadSignature(file);
      setIsSavingDrawnSignature(false);
    }, "image/png");
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function getPos(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = PC.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function stopDraw() {
    setIsDrawing(false);
  }

  function startDrawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = PC.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    if (!profile.nom.trim() || !profile.prenom.trim()) {
      setError("Le nom et le prénom sont obligatoires.");
      setIsSaving(false);
      return;
    }
    if (!isValidEmail(profile.email)) {
      setError("Indiquez une adresse e-mail valide.");
      setIsSaving(false);
      return;
    }
    if (!profile.telephone.trim()) {
      setError("Le téléphone est obligatoire.");
      setIsSaving(false);
      return;
    }
    if (!profile.adresse.trim() || !profile.ville.trim() || !profile.code_postal.trim()) {
      setError("L'adresse complète (rue, ville, code postal) est obligatoire.");
      setIsSaving(false);
      return;
    }

    const { data, error: saveError } = await saveProprietaireProfile(profile);

    if (saveError) {
      setError(`Erreur d'enregistrement : ${formatSubmitError(saveError)}`);
      setIsSaving(false);
      return;
    }

    if (data?.id) {
      setProfile((prev) => ({ ...prev, id: data.id }));
    }
    toast.success("Profil enregistré.");
    setIsSaving(false);
  }

  async function copyReferralLink() {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(buildReferralLink(referralCode));
      setReferralLinkCopied(true);
      if (copyLinkTimeoutRef.current) clearTimeout(copyLinkTimeoutRef.current);
      copyLinkTimeoutRef.current = setTimeout(() => setReferralLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  }

  function shareReferralByEmail() {
    if (!referralCode) return;
    window.location.href = buildReferralMailto(referralCode);
  }

  const isPaidPlan = plan === "starter" || plan === "pro" || plan === "expert";
  const referralLinkDisplay = referralCode ? buildReferralLink(referralCode) : "";

  async function resetTour(type: "free" | "paid") {
    if (typeof window === "undefined" || !userId) return;
    const column = type === "free" ? "guided_tour_free_done" : "guided_tour_paid_done";
    await supabase
      .from("proprietaires")
      .update({ [column]: false })
      .eq("user_id", userId);
    window.localStorage.removeItem(`guided_tour_${type}_done`);
    window.dispatchEvent(new Event(`start:guided-tour-${type}`));
  }

  return (
    <section className="locavio-page-wrap max-w-4xl space-y-8" style={{ color: PC.text }}>
      <header>
        <h1 className="locavio-page-title">Paramètres</h1>
        <p className="locavio-page-subtitle max-w-2xl">
          Configurez votre profil propriétaire utilisé automatiquement dans les quittances et baux.
        </p>
      </header>

      {!isLoading && isProprietaireOnboardingIncomplete(profile) ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: PC.warningBg15,
            border: `1px solid ${PC.border}`,
            color: PC.warning,
          }}
        >
          👤 Votre profil est incomplet (nom, prénom ou adresse manquant). Renseignez les champs ci-dessous pour des
          quittances et baux conformes.
        </div>
      ) : null}

      <div className="p-6" style={panelCard}>
        <h2 className="text-lg font-semibold">Mon profil propriétaire</h2>

        {isLoading ? (
          <p className="mt-3 text-sm" style={{ color: PC.muted }}>
            Chargement du profil...
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Nom</span>
              <input
                style={fieldInputStyle}
                value={profile.nom}
                onChange={(event) => onChange("nom", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Prénom</span>
              <input
                style={fieldInputStyle}
                value={profile.prenom}
                onChange={(event) => onChange("prenom", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Email</span>
              <input
                type="email"
                style={fieldInputStyle}
                value={profile.email}
                onChange={(event) => onChange("email", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Téléphone</span>
              <input
                style={fieldInputStyle}
                value={profile.telephone}
                onChange={(event) => onChange("telephone", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
              <span className="font-medium">Adresse</span>
              <input
                style={fieldInputStyle}
                value={profile.adresse}
                onChange={(event) => onChange("adresse", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Ville</span>
              <input
                style={fieldInputStyle}
                value={profile.ville}
                onChange={(event) => onChange("ville", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Code postal</span>
              <input
                style={fieldInputStyle}
                value={profile.code_postal}
                onChange={(event) => onChange("code_postal", event.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
              <span className="font-medium">SIRET (optionnel)</span>
              <input
                style={fieldInputStyle}
                value={profile.siret}
                onChange={(event) => onChange("siret", event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2" style={{ color: PC.muted }}>
              <span className="font-medium">Statut fiscal</span>
              <select
                style={fieldInputStyle}
                value={profile.statut_bailleur}
                onChange={(event) =>
                  onChange("statut_bailleur", event.target.value as ProprietaireProfile["statut_bailleur"])
                }
              >
                <optgroup label="Personne physique">
                  <option value="particulier_nu">Particulier — Location nue (revenus fonciers)</option>
                  <option value="particulier_meuble">Particulier — Location meublée (BIC)</option>
                  <option value="lmnp_micro">LMNP — Micro-BIC (abattement 50% ou 71%)</option>
                  <option value="lmnp_reel">LMNP — Régime réel simplifié</option>
                  <option value="lmp">Loueur Meublé Professionnel (LMP)</option>
                  <option value="indivision">Indivision (héritage, achat commun)</option>
                  <option value="usufruitier">Usufruitier (démembrement de propriété)</option>
                </optgroup>
                <optgroup label="Personne morale">
                  <option value="sci_ir">SCI à l&apos;IR (Impôt sur le Revenu)</option>
                  <option value="sci_is">SCI à l&apos;IS (Impôt sur les Sociétés)</option>
                  <option value="sci_attribution">SCI d&apos;attribution</option>
                  <option value="sarl_famille">SARL de famille</option>
                  <option value="sas_sasu">SAS / SASU</option>
                </optgroup>
                <optgroup label="Mandataire">
                  <option value="mandataire">Gestionnaire / Mandataire (agence, syndic)</option>
                </optgroup>
              </select>
              {profile.statut_bailleur === "lmnp_micro" ||
              profile.statut_bailleur === "lmnp_reel" ||
              profile.statut_bailleur === "lmp" ? (
                <p className="text-xs" style={{ color: PC.muted }}>
                  Votre SIRET apparaîtra sur vos quittances de loyer.
                </p>
              ) : null}
              {profile.statut_bailleur === "sci_ir" ||
              profile.statut_bailleur === "sci_is" ||
              profile.statut_bailleur === "sci_attribution" ||
              profile.statut_bailleur === "sarl_famille" ||
              profile.statut_bailleur === "sas_sasu" ? (
                <div className="mt-2 space-y-3">
                  <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">Nom de la société</span>
                    <input
                      type="text"
                      style={fieldInputStyle}
                      placeholder="Ex: SCI Dupont Immobilier"
                      value={profile.nom_societe}
                      onChange={(event) => onChange("nom_societe", event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                    <span className="font-medium">SIREN de la société</span>
                    <input
                      type="text"
                      style={fieldInputStyle}
                      placeholder="Ex: 123 456 789"
                      value={profile.siren_societe}
                      onChange={(event) => onChange("siren_societe", event.target.value)}
                    />
                    <span className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                      Le SIREN (9 chiffres) apparaîtra sur vos documents.
                    </span>
                  </label>
                </div>
              ) : null}
              {profile.statut_bailleur === "indivision" ? (
                <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                  En indivision, tous les indivisaires ou leur mandataire doivent figurer sur les baux. Précisez leurs
                  noms dans les clauses particulières du bail.
                </p>
              ) : null}
              {profile.statut_bailleur === "usufruitier" ? (
                <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                  L&apos;usufruitier perçoit les loyers et signe les baux. Mentionnez le démembrement dans les clauses
                  particulières.
                </p>
              ) : null}
              {profile.statut_bailleur === "mandataire" ? (
                <p className="text-xs leading-relaxed" style={{ color: PC.muted }}>
                  Précisez le nom du mandant (propriétaire) dans les clauses particulières du bail.
                </p>
              ) : null}
            </label>

            <div className="sm:col-span-2 rounded-lg p-4" style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card }}>
              <h3 className="text-base font-semibold" style={{ color: PC.text }}>
                Signature électronique
              </h3>
              <p className="mt-1 text-sm" style={{ color: PC.muted }}>
                Intégrée automatiquement dans vos baux, quittances et contrats de séjour.
              </p>

              <div className="mt-4 flex w-fit gap-1 rounded-lg p-1" style={{ backgroundColor: PC.bg }}>
                {(["draw", "upload"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSignatureTab(tab)}
                    className="rounded-md px-4 py-1.5 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: signatureTab === tab ? PC.primary : "transparent",
                      color: signatureTab === tab ? PC.white : PC.muted,
                    }}
                  >
                    {tab === "draw" ? "✏️ Dessiner" : "⬆️ Uploader"}
                  </button>
                ))}
              </div>

              {signatureTab === "draw" ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs" style={{ color: PC.muted }}>
                    Dessinez votre signature ci-dessous avec la souris ou le doigt.
                  </p>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full rounded-xl"
                    style={{
                      border: `1px solid ${PC.border}`,
                      backgroundColor: PC.white,
                      cursor: "crosshair",
                      maxWidth: 500,
                      touchAction: "none",
                    }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDrawTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDraw}
                  />
                  <div className="flex gap-2">
                    <BtnSecondary type="button" size="small" onClick={clearCanvas}>
                      Effacer
                    </BtnSecondary>
                    <BtnPrimary
                      type="button"
                      size="small"
                      disabled={!hasDrawn || isSavingDrawnSignature || isUploadingSignature}
                      onClick={() => void handleSaveDrawnSignature()}
                    >
                      {isSavingDrawnSignature || isUploadingSignature ? "Sauvegarde..." : "Sauvegarder la signature"}
                    </BtnPrimary>
                  </div>
                </div>
              ) : null}

              {signatureTab === "upload" ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs" style={{ color: PC.muted }}>
                    Uploadez une image de votre signature (PNG ou JPG, fond blanc recommandé).
                  </p>
                  <input
                    ref={signatureFileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadSignature(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => signatureFileRef.current?.click()}
                    disabled={isUploadingSignature}
                    className="w-full rounded-xl py-8 text-center transition-colors"
                    style={{
                      border: `2px dashed ${PC.border}`,
                      backgroundColor: PC.bg,
                      color: PC.muted,
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">⬆️</span>
                      <span className="text-sm font-medium">
                        {isUploadingSignature ? "Upload en cours..." : "Cliquez pour choisir un fichier"}
                      </span>
                      <span className="text-xs">PNG, JPG</span>
                    </div>
                  </button>
                </div>
              ) : null}

              {signatureUrl ? (
                <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${PC.border}` }}>
                  <p className="mb-2 text-sm font-medium" style={{ color: PC.muted }}>
                    Signature enregistrée
                  </p>
                  <div
                    className="inline-block rounded-xl p-4"
                    style={{
                      border: `1px solid ${PC.border}`,
                      backgroundColor: PC.white,
                    }}
                  >
                    <Image
                      src={signatureUrl}
                      alt="Ma signature"
                      width={200}
                      height={80}
                      className="max-h-20 object-contain"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSignature()}
                    className="mt-2 text-xs"
                    style={{ color: PC.danger }}
                  >
                    Supprimer la signature
                  </button>
                </div>
              ) : null}
            </div>

            {error ? (
              <p
                className="sm:col-span-2 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}
              >
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2 flex justify-end">
              <BtnPrimary type="submit" disabled={isSaving} loading={isSaving}>
                Enregistrer mon profil
              </BtnPrimary>
            </div>
            <div className="sm:col-span-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="text-sm transition hover:underline"
                  style={{ color: PC.muted }}
                  onClick={() => void resetTour("free")}
                >
                  🗺️ Revoir le tour de l&apos;application
                </button>
                {plan !== "free" ? (
                  <button
                    type="button"
                    className="text-sm transition hover:underline"
                    style={{ color: PC.muted }}
                    onClick={() => void resetTour("paid")}
                  >
                    ✨ Revoir le tour des fonctionnalités avancées
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        )}
      </div>

      <div
        id="abonnement"
        className="scroll-mt-24 rounded-2xl p-6 sm:p-8"
        style={{
          ...panelCard,
          border:
            plan !== "free"
              ? `1px solid rgba(124, 58, 237, 0.45)`
              : `1px solid ${PC.border}`,
          boxShadow: plan !== "free" ? PC.activeRing : panelCard.boxShadow,
        }}
      >
        <h2 className="text-lg font-bold tracking-tight">Mon abonnement</h2>
        <p className="mt-2 text-sm font-medium capitalize" style={{ color: PC.text }}>
          {ABONNEMENT_ENTITLEMENTS[plan]?.label ?? plan}
        </p>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          Formule : <span className="font-semibold capitalize" style={{ color: PC.text }}>{plan}</span>
        </p>

        {plan !== "free" && stripeSubscriptionLoading ? (
          <p className="mt-3 flex items-center gap-2 text-xs" style={{ color: PC.muted }}>
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2"
              style={{ borderColor: `${PC.border}`, borderTopColor: PC.primary }}
              aria-hidden
            />
            Mise à jour des informations d&apos;abonnement…
          </p>
        ) : null}

        {plan !== "free" && !stripeSubscriptionLoading && (stripeSubscription || subscriptionStatus?.currentPeriodEnd) ? (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
            {subscriptionStatus?.cancelAtPeriodEnd === true ? (
              <>
                <span className="font-semibold text-red-600">
                  Fin d&apos;abonnement :{" "}
                  {formatSubscriptionDateFr(
                    subscriptionStatus.currentPeriodEnd ??
                      stripeSubscription?.current_period_end ??
                      0,
                  )}
                </span>
              </>
            ) : stripeSubscription?.interval === "month" ? (
              <>
                <span className="font-semibold text-[#7c3aed]">Prochain renouvellement : </span>
                <span className="font-medium" style={{ color: PC.secondary }}>
                  {formatSubscriptionDateFr(stripeSubscription.current_period_end)}
                </span>
              </>
            ) : stripeSubscription?.interval === "year" ? (
              <>
                Abonnement valide jusqu&apos;au :{" "}
                <span className="font-medium" style={{ color: PC.secondary }}>
                  {formatSubscriptionDateFr(stripeSubscription.current_period_end)}
                </span>
              </>
            ) : (
              <>
                Prochaine échéance :{" "}
                <span className="font-medium" style={{ color: PC.secondary }}>
                  {formatSubscriptionDateFr(
                    stripeSubscription?.current_period_end ?? subscriptionStatus?.currentPeriodEnd ?? 0,
                  )}
                </span>
              </>
            )}
          </p>
        ) : null}

        {ABONNEMENT_ENTITLEMENTS[plan] ? (
          <ul className="mt-5 space-y-2 text-sm" style={{ color: PC.muted }}>
            {ABONNEMENT_ENTITLEMENTS[plan].positives.map((line) => (
              <li key={line} className="flex gap-2">
                <span style={{ color: PC.success }}>✓</span>
                <span>{line}</span>
              </li>
            ))}
            {(ABONNEMENT_ENTITLEMENTS[plan].negatives ?? []).map((line) => (
              <li key={line} className="flex gap-2">
                <span style={{ color: PC.warning }}>✗</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6">
          <BtnPrimary onClick={() => router.push("/parametres/abonnement")}>Gérer mon abonnement</BtnPrimary>
        </div>
      </div>

      <div className="rounded-2xl p-6 sm:p-8" style={panelCard}>
        <h2 className="text-lg font-bold tracking-tight">Parrainez un ami propriétaire</h2>

        {referralDataLoading ? (
          <p className="mt-3 text-sm" style={{ color: PC.muted }}>
            Chargement…
          </p>
        ) : plan === "free" ? (
          <>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Cette fonctionnalité est disponible à partir du plan Starter.
            </p>
            <div className="mt-6">
              <BtnPrimary onClick={() => router.push("/parametres/abonnement")}>Passer au plan Starter</BtnPrimary>
            </div>
          </>
        ) : isPaidPlan ? (
          <>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
              Il gagne 1 mois offert. Vous aussi.
            </p>

            <p
              className="mt-5 break-all rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                ...fieldInputStyle,
                backgroundColor: PC.card,
                color: PC.text,
              }}
            >
              {referralLinkDisplay || "Code de parrainage en cours de génération…"}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <BtnPrimary disabled={!referralCode} onClick={() => void copyReferralLink()}>
                {referralLinkCopied ? "✓ Lien copié !" : "Copier le lien"}
              </BtnPrimary>
              <BtnSecondary disabled={!referralCode} onClick={shareReferralByEmail}>
                Partager par email
              </BtnSecondary>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium" style={{ color: PC.text }}>
                {Math.min(convertedReferralsCount, MAX_REFERRAL_FILLEULS)}/{MAX_REFERRAL_FILLEULS} filleuls
                parrainés
              </p>
              <div className="mt-3 flex items-center gap-3" aria-hidden>
                {Array.from({ length: MAX_REFERRAL_FILLEULS }, (_, index) => {
                  const filled = index < convertedReferralsCount;
                  return (
                    <span
                      key={index}
                      className="text-2xl leading-none"
                      style={{ color: filled ? "#7c3aed" : PC.border }}
                    >
                      {filled ? "●" : "○"}
                    </span>
                  );
                })}
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed" style={{ color: PC.muted }}>
              Maximum 3 mois cumulables. Récompense créditée dès la première souscription de votre filleul.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
