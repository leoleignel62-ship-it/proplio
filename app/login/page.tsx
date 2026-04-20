"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconHome } from "@/components/proplio-icons";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showCheckEmail = searchParams.get("check_email") === "1";
  const showPasswordUpdated = searchParams.get("password_updated") === "1";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    await ensureProprietaireRow();
    router.push("/");
    router.refresh();
  }

  return (
    <section className="proplio-card w-full max-w-md p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-proplio-primary/20 text-proplio-primary">
          <IconHome className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-proplio-secondary">Proplio</p>
          <h1 className="text-xl font-semibold text-proplio-text">Connexion</h1>
        </div>
      </div>
      <p className="text-sm text-proplio-muted">Accédez à votre espace de gestion locative.</p>

      {showCheckEmail ? <p className="proplio-alert-success mt-4">Compte créé. Vérifie ton email puis connecte-toi.</p> : null}

      {showPasswordUpdated ? (
        <p className="proplio-alert-success mt-4">Mot de passe mis à jour. Tu peux te connecter.</p>
      ) : null}

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

        {error ? <p className="proplio-alert-error">{error}</p> : null}

        <button type="submit" className="proplio-btn-primary w-full py-3" disabled={isSubmitting}>
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-sm text-proplio-muted">
        <Link href="/forgot-password" className="proplio-link">
          Mot de passe oublié ?
        </Link>
      </p>

      <p className="mt-3 text-sm text-proplio-muted">
        Pas encore de compte ?{" "}
        <Link href="/register" className="proplio-link">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="proplio-card w-full max-w-md p-8 text-center text-sm text-proplio-muted">Chargement…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
