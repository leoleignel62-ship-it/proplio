"use client";

import Link from "next/link";
import { FormEvent, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { IconHome } from "@/components/proplio-icons";
import { ensureProprietaireRow, upsertProprietaireIdentityFromSignup } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";
import { PC } from "@/lib/proplio-colors";
import { fieldInputStyle } from "@/lib/proplio-field-styles";

const LEFT_BG: CSSProperties = {
  backgroundColor: "#1a0a2e",
  backgroundImage:
    "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(167,139,250,0.18), transparent 40%)",
};

export default function RegisterPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
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
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { prenom, nom },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user && data.session) {
        await ensureProprietaireRow();
      }

      if (data.user) {
        // Upsert explicite du profil propriétaire avec prénom/nom saisis à l'inscription.
        const upsertRes = await upsertProprietaireIdentityFromSignup({
          user: data.user,
          prenom,
          nom,
        });
        if (upsertRes.error) {
          // Ne bloque pas le flux d'inscription : le backfill est aussi assuré dans ensureProprietaireRow.
          console.warn("Upsert proprietaire post-signup non bloquant:", upsertRes.error.message);
        }
      }

      setSuccess("Compte créé. Vérifie ta boîte email pour confirmer ton inscription.");
      router.push("/login?check_email=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2" style={{ backgroundColor: "#0a0a0f", color: PC.text }}>
      <aside className="relative hidden lg:flex lg:flex-col lg:justify-between lg:p-12" style={LEFT_BG}>
        <div className="flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(124,58,237,0.2)", color: "#c4b5fd" }}>
            <IconHome className="h-7 w-7" />
          </span>
          <span className="text-2xl font-bold tracking-tight">Proplio</span>
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

      <section className="flex items-center justify-center px-4 py-10 sm:px-8" style={{ backgroundColor: "#0a0a0f" }}>
        <div className="w-full max-w-md rounded-2xl p-8" style={{ backgroundColor: "#11111a", border: `1px solid ${PC.border}` }}>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
            Créez votre compte
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: PC.muted }}>
            Rejoignez les propriétaires qui gèrent mieux.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Prénom</span>
                <input
                  required
                  style={fieldInputStyle}
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
                <span className="font-medium">Nom</span>
                <input
                  required
                  style={fieldInputStyle}
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                />
              </label>
            </div>
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
            <label className="flex flex-col gap-1.5 text-sm" style={{ color: PC.muted }}>
              <span className="font-medium">Confirmer mot de passe</span>
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
              {isSubmitting ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-5 text-sm" style={{ color: PC.muted }}>
            Déjà un compte ?{" "}
            <Link href="/login" style={{ color: PC.secondary, fontWeight: 500 }}>
              Se connecter
            </Link>
          </p>

          <p className="mt-5 text-xs leading-relaxed" style={{ color: PC.tertiary }}>
            En créant un compte, vous acceptez nos{" "}
            <Link href="/cgu" className="underline" style={{ color: PC.muted }}>
              CGU
            </Link>{" "}
            et notre{" "}
            <Link href="/politique-de-confidentialite" className="underline" style={{ color: PC.muted }}>
              Politique de confidentialité
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
