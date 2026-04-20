"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  emptyProprietaireProfile,
  fetchProprietaireProfile,
  getCurrentProprietaireId,
  saveProprietaireProfile,
  type ProprietaireProfile,
} from "@/lib/proprietaire-profile";
import { formatSubmitError, isValidEmail } from "@/lib/supabase-submit-error";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle, panelCard } from "@/lib/proplio-field-styles";

export default function ParametresPage() {
  const [profile, setProfile] = useState<ProprietaireProfile>(emptyProprietaireProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

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
      }

      setIsLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

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
        <h1 className="text-3xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          Configurez votre profil propriétaire utilisé automatiquement dans les quittances et baux.
        </p>
      </header>

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
