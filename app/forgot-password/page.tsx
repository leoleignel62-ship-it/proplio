"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { IconHome } from "@/components/proplio-icons";
import { supabase } from "@/lib/supabase";

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

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Email envoyé. Vérifie ta boîte mail pour réinitialiser ton mot de passe.");
    setIsSubmitting(false);
  }

  return (
    <section className="proplio-card w-full max-w-md p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-proplio-primary/20 text-proplio-primary">
          <IconHome className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-proplio-secondary">Proplio</p>
          <h1 className="text-xl font-semibold text-proplio-text">Mot de passe oublié</h1>
        </div>
      </div>
      <p className="text-sm text-proplio-muted">Reçois un lien de réinitialisation sur ton adresse email.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="proplio-label">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            className="proplio-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {error ? <p className="proplio-alert-error">{error}</p> : null}
        {success ? <p className="proplio-alert-success">{success}</p> : null}

        <button type="submit" className="proplio-btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? "Envoi..." : "Envoyer le lien"}
        </button>
      </form>

      <p className="mt-6 text-sm text-proplio-muted">
        <Link href="/login" className="proplio-link">
          Retour à la connexion
        </Link>
      </p>
    </section>
  );
}
