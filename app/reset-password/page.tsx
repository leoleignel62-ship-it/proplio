"use client";

import Link from "next/link";
import { FormEvent, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { IconHome } from "@/components/proplio-icons";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle } from "@/lib/proplio-field-styles";

const CARD: CSSProperties = {
  width: "100%",
  maxWidth: "28rem",
  padding: 32,
  backgroundColor: PC.card,
  border: `1px solid ${PC.border}`,
  borderRadius: 12,
  boxShadow: PC.cardShadow,
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Mot de passe mis à jour. Connecte-toi avec ton nouveau mot de passe.");
    setIsSubmitting(false);
    router.push("/login?password_updated=1");
  }

  return (
    <section style={CARD}>
      <div className="mb-8 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: PC.primaryBg20, color: PC.primary }}
        >
          <IconHome className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PC.secondary }}>
            Proplio
          </p>
          <h1 className="text-xl font-semibold" style={{ color: PC.text }}>
            Réinitialiser le mot de passe
          </h1>
        </div>
      </div>
      <p className="text-sm" style={{ color: PC.muted }}>
        Saisis un nouveau mot de passe pour ton compte.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span className="font-medium">Nouveau mot de passe</span>
          <input
            type="password"
            required
            style={fieldInputStyle}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span className="font-medium">Confirmer le mot de passe</span>
          <input
            type="password"
            required
            style={fieldInputStyle}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {error ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              backgroundColor: PC.dangerBg10,
              color: PC.danger,
            }}
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              border: `1px solid rgba(16, 185, 129, 0.3)`,
              backgroundColor: PC.successBg10,
              color: PC.success,
            }}
          >
            {success}
          </p>
        ) : null}

        <button type="submit" className="proplio-btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </button>
      </form>

      <p className="mt-6 text-sm" style={{ color: PC.muted }}>
        <Link href="/login" style={{ color: PC.secondary, fontWeight: 500 }}>
          Retour à la connexion
        </Link>
      </p>
    </section>
  );
}
