"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconHome } from "@/components/proplio-icons";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
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
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      await ensureProprietaireRow();
      router.refresh();
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
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
            Connexion
          </h1>
        </div>
      </div>
      <p className="text-sm" style={{ color: PC.muted }}>
        Accédez à votre espace de gestion locative.
      </p>

      {showCheckEmail ? (
        <p
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            border: `1px solid rgba(16, 185, 129, 0.3)`,
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            color: PC.success,
          }}
        >
          Compte créé. Vérifie ton email puis connecte-toi.
        </p>
      ) : null}

      {showPasswordUpdated ? (
        <p
          className="mt-4 rounded-xl px-4 py-3 text-sm"
          style={{
            border: `1px solid rgba(16, 185, 129, 0.3)`,
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            color: PC.success,
          }}
        >
          Mot de passe mis à jour. Tu peux te connecter.
        </p>
      ) : null}

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
        <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
          <span className="font-medium">Mot de passe</span>
          <input
            type="password"
            required
            style={fieldInputStyle}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

        <button
          type="submit"
          className="w-full py-3 font-medium"
          style={{
            borderRadius: 12,
            backgroundColor: PC.primary,
            color: PC.white,
            fontSize: "0.875rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-sm" style={{ color: PC.muted }}>
        <Link href="/forgot-password" style={{ color: PC.secondary, fontWeight: 500 }}>
          Mot de passe oublié ?
        </Link>
      </p>

      <p className="mt-3 text-sm" style={{ color: PC.muted }}>
        Pas encore de compte ?{" "}
        <Link href="/register" style={{ color: PC.secondary, fontWeight: 500 }}>
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
        <div
          className="w-full max-w-md p-8 text-center text-sm"
          style={{ ...CARD, color: PC.muted }}
        >
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
