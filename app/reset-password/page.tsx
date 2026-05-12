"use client";

import Link from "next/link";
import { FormEvent, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { LogoFull } from "@/components/locavio-icons";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle } from "@/lib/locavio-field-styles";

const LEFT_BG: CSSProperties = {
  backgroundColor: "#0a0020",
  backgroundImage: "linear-gradient(135deg, #0a0020 0%, #1a0a3a 55%, #0d0520 100%)",
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
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Mot de passe mis à jour. Connecte-toi avec ton nouveau mot de passe.");
      router.push("/login?password_updated=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2" style={{ backgroundColor: "#ffffff", color: PC.text }}>
      <aside
        className="relative hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
        style={LEFT_BG}
      >
        <div className="flex items-center">
          <LogoFull className="h-9 w-auto" />
        </div>
        <div className="mx-auto max-w-md text-center text-white">
          <p className="text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white">Gérez vos locations.</p>
          <p className="mt-2 text-4xl font-extrabold leading-tight tracking-[-0.03em] text-white">Sans perdre votre temps.</p>
        </div>
        <ul className="space-y-2 text-sm text-white/90">
          <li>✓ Gratuit pour commencer</li>
          <li>✓ Sans carte bancaire</li>
          <li>✓ Données sécurisées</li>
        </ul>
      </aside>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8" style={{ backgroundColor: "#f9f8ff" }}>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
            Réinitialiser le mot de passe
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
            Saisissez un nouveau mot de passe pour votre compte.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Nouveau mot de passe</span>
              <input
                type="password"
                required
                style={{ ...fieldInputStyle, backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1a0533" }}
                className="placeholder:text-gray-400"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Confirmer le mot de passe</span>
              <input
                type="password"
                required
                style={{ ...fieldInputStyle, backgroundColor: "#ffffff", border: "1px solid #e5e7eb", color: "#1a0533" }}
                className="placeholder:text-gray-400"
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
              {isSubmitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
            </button>
          </form>

          <p className="mt-5 text-sm" style={{ color: PC.muted }}>
            <Link href="/login" style={{ color: PC.secondary, fontWeight: 500 }}>
              Retour à la connexion
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
