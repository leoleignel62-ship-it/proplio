"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  emptyProprietaireProfile,
  fetchProprietaireProfile,
  getCurrentProprietaireId,
  isProprietaireOnboardingIncomplete,
  saveProprietaireProfile,
  type ProprietaireProfile,
} from "@/lib/proprietaire-profile";
import { formatSubmitError, isValidEmail } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, panelCard } from "@/lib/proplio-field-styles";

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

const ABONNEMENT_ENTITLEMENTS: Record<
  string,
  { label: string; positives: string[]; negatives?: string[] }
> = {
  free: {
    label: "Découverte",
    positives: [
      "1 logement",
      "1 locataire",
      "1 quittance envoyée par email (à vie)",
      "Dashboard financier",
    ],
    negatives: ["Baux non inclus", "États des lieux non inclus"],
  },
  starter: {
    label: "Starter",
    positives: [
      "3 logements",
      "3 locataires",
      "3 quittances/mois (PDF + email automatique)",
      "3 baux/mois (PDF conforme loi ALUR + email)",
      "3 états des lieux/mois (photos + PDF + email)",
      "Dashboard financier complet",
    ],
  },
  pro: {
    label: "Pro",
    positives: [
      "10 logements",
      "10 locataires",
      "10 quittances/mois",
      "10 baux/mois",
      "10 états des lieux/mois",
      "Dashboard financier avancé",
      "Support prioritaire",
    ],
  },
  expert: {
    label: "Expert",
    positives: [
      "Logements illimités",
      "Locataires illimités",
      "Quittances illimitées",
      "Baux illimités",
      "États des lieux illimités",
      "Dashboard complet",
      "Support prioritaire",
    ],
  },
};

type StripeSubscriptionInfo = {
  current_period_end: number;
  cancel_at_period_end: boolean;
  interval: "month" | "year" | null;
  status: string;
};

export default function ParametresPage() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<ProprietaireProfile>(emptyProprietaireProfile);
  const [plan, setPlan] = useState("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stripeSubscription, setStripeSubscription] = useState<StripeSubscriptionInfo | null>(null);
  const [stripeSubscriptionLoading, setStripeSubscriptionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
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
          .select("plan")
          .eq("id", existingProfile.id)
          .maybeSingle();
        const rawPlan = (planData as { plan?: string | null } | null)?.plan;
        setPlan(rawPlan && rawPlan.trim() ? rawPlan : "free");
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

  function onChange(field: keyof ProprietaireProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (success) setSuccess("");
    if (error) setError("");
  }

  async function onUploadSignature(file: File) {
    setError("");
    setSuccess("");
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
    setSuccess("Signature enregistrée avec succès.");
    setIsUploadingSignature(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSuccess("");
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
    setSuccess("Profil propriétaire enregistré avec succès.");
    setIsSaving(false);
  }

  return (
    <section className="proplio-page-wrap max-w-4xl space-y-8" style={{ color: PC.text }}>
      <header>
        <h1 className="proplio-page-title">Paramètres</h1>
        <p className="proplio-page-subtitle max-w-2xl">
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

            {error ? (
              <p
                className="sm:col-span-2 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}
              >
                {error}
              </p>
            ) : null}
            {success ? (
              <p
                className="sm:col-span-2 rounded-lg px-3 py-2 text-sm"
                style={{ backgroundColor: PC.successBg10, color: PC.success }}
              >
                {success}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="proplio-btn-primary px-6" disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer mon profil"}
              </button>
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

        {plan !== "free" && !stripeSubscriptionLoading && stripeSubscription ? (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: PC.muted }}>
            {stripeSubscription.cancel_at_period_end ? (
              <>
                <span style={{ color: PC.warning }}>
                  ⚠️ Abonnement résilié — Accès jusqu&apos;au :{" "}
                  {formatSubscriptionDateFr(stripeSubscription.current_period_end)}
                </span>
              </>
            ) : stripeSubscription.interval === "month" ? (
              <>
                Prochain renouvellement :{" "}
                <span className="font-medium" style={{ color: PC.secondary }}>
                  {formatSubscriptionDateFr(stripeSubscription.current_period_end)}
                </span>
              </>
            ) : stripeSubscription.interval === "year" ? (
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
                  {formatSubscriptionDateFr(stripeSubscription.current_period_end)}
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
          <Link href="/parametres/abonnement" className="proplio-btn-primary inline-flex items-center justify-center px-6">
            Gérer mon abonnement
          </Link>
        </div>
      </div>

      <div className="p-6" style={panelCard}>
        <h2 className="text-lg font-semibold">Signature</h2>
        <p className="mt-1 text-sm" style={{ color: PC.muted }}>
          Ajoutez votre signature pour l&apos;intégrer automatiquement aux quittances PDF.
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="proplio-btn-secondary inline-flex cursor-pointer items-center justify-center">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUploadSignature(file);
              }}
            />
            {isUploadingSignature ? "Upload en cours..." : "Uploader une signature"}
          </label>

          {signatureUrl ? (
            <div
              className="rounded-lg p-2"
              style={{ border: `1px solid ${PC.border}`, backgroundColor: PC.card }}
            >
              <Image
                src={signatureUrl}
                alt="Signature du propriétaire"
                width={224}
                height={96}
                className="max-h-24 max-w-56 object-contain"
              />
            </div>
          ) : (
            <p className="text-sm" style={{ color: PC.muted }}>
              Aucune signature enregistrée.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
