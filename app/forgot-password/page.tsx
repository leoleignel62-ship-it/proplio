"use client";

import Link from "next/link";
import { FormEvent, useState, type CSSProperties } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
      const redirectTo = siteUrl
        ? `${siteUrl}/reset-password`
        : typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess("Email envoyé. Vérifie ta boîte mail pour réinitialiser ton mot de passe.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setIsSubmitting(false);
    }
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
            Mot de passe oublié
          </h1>
        </div>
      </div>
      <p className="text-sm" style={{ color: PC.muted }}>
        Reçois un lien de réinitialisation sur ton adresse email.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            style={fieldInputStyle}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
          {isSubmitting ? "Envoi..." : "Envoyer le lien"}
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
