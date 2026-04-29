"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { LogoFull } from "@/components/locavio-icons";
import { ensureProprietaireRow } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle } from "@/lib/locavio-field-styles";

const LEFT_BG: CSSProperties = {
  backgroundColor: "#0a0020",
  backgroundImage: "linear-gradient(135deg, #0a0020 0%, #1a0a3a 55%, #0d0520 100%)",
};

function translateSupabaseError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Veuillez confirmer votre email avant de vous connecter.";
  }
  if (normalized.includes("too many requests")) {
    return "Trop de tentatives. Veuillez réessayer dans quelques minutes.";
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showCheckEmail = searchParams.get("check_email") === "1";
  const showPasswordUpdated = searchParams.get("password_updated") === "1";
  const showEmailVerified = searchParams.get("verified") === "true";

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
        setError(translateSupabaseError(signInError.message));
        return;
      }

      await ensureProprietaireRow();
      // Navigation complète : garantit l’envoi des cookies au middleware / RSC sur Vercel (évite écran « page introuvable » après soft navigation).
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? translateSupabaseError(e.message) : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2" style={{ backgroundColor: "#0a0a0f", color: PC.text }}>
      <aside className="relative hidden lg:flex lg:flex-col lg:justify-between lg:p-12" style={LEFT_BG}>
        <div className="flex items-center">
          <LogoFull className="h-9 w-auto" />
        </div>
        <div className="mx-auto max-w-md text-center">
          <p className="text-4xl font-extrabold leading-tight tracking-[-0.03em]">Gérez vos locations.</p>
          <p className="mt-2 text-4xl font-extrabold leading-tight tracking-[-0.03em]">Sans perdre votre temps.</p>
        </div>
        <ul className="space-y-2 text-sm" style={{ color: "#e9d5ff" }}>
          <li>✓ Gratuit pour commencer</li>
          <li>✓ Sans carte bancaire</li>
          <li>✓ Données sécurisées</li>
        </ul>
      </aside>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8" style={{ backgroundColor: "#0f0f1a" }}>
        <div className="w-full max-w-md rounded-2xl p-8 locavio-glass-card" style={{ border: `1px solid ${PC.glassBorder}` }}>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
            Bon retour 👋
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
            Connectez-vous à votre espace de gestion locative.
          </p>

          {showEmailVerified ? (
            <p
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{
                border: `1px solid rgba(16, 185, 129, 0.3)`,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: PC.success,
              }}
            >
              ✅ Email vérifié avec succès ! Vous pouvez maintenant vous connecter.
            </p>
          ) : null}

          {showCheckEmail ? (
            <p
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{
                border: `1px solid rgba(16, 185, 129, 0.3)`,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                color: PC.success,
              }}
            >
              Compte créé. Vérifiez votre email puis connectez-vous.
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
              Mot de passe mis à jour. Vous pouvez vous connecter.
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
                backgroundColor: "#7c3aed",
                color: PC.white,
                fontSize: "0.875rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-5 text-sm" style={{ color: PC.muted }}>
            <Link href="/forgot-password" style={{ color: PC.secondary, fontWeight: 500 }}>
              Mot de passe oublié ?
            </Link>
          </p>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: PC.border }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: PC.tertiary }}>
              ou
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: PC.border }} />
          </div>

          <p className="text-sm" style={{ color: PC.muted }}>
            Pas encore de compte ?{" "}
            <Link href="/register" style={{ color: PC.secondary, fontWeight: 500 }}>
              Créer un compte
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full p-8 text-center text-sm" style={{ backgroundColor: "#0a0a0f", color: PC.muted }}>
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
