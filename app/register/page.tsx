"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { IconHome } from "@/components/proplio-icons";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user && data.session) {
      await ensureProprietaireRow();
    }

    setSuccess("Compte créé. Vérifie ta boîte email pour confirmer ton inscription.");
    setIsSubmitting(false);
    router.push("/login?check_email=1");
  }

  return (
    <section className="proplio-card w-full max-w-md p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-proplio-primary/20 text-proplio-primary">
          <IconHome className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-proplio-secondary">Proplio</p>
          <h1 className="text-xl font-semibold text-proplio-text">Inscription</h1>
        </div>
      </div>
      <p className="text-sm text-proplio-muted">Créez votre compte propriétaire.</p>

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
        <label className="proplio-label">
          <span className="font-medium">Mot de passe</span>
          <input
            type="password"
            required
            className="proplio-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="proplio-label">
          <span className="font-medium">Confirmer le mot de passe</span>
          <input
            type="password"
            required
            className="proplio-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        {error ? <p className="proplio-alert-error">{error}</p> : null}
        {success ? <p className="proplio-alert-success">{success}</p> : null}

        <button type="submit" className="proplio-btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-sm text-proplio-muted">
        Déjà inscrit ?{" "}
        <Link href="/login" className="proplio-link">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
