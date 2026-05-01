"use client";

import { useState } from "react";
import { MarketingPublicShell } from "@/components/landing/marketing-public-shell";
import { LandingFooter } from "@/components/landing/landing-footer";

const categories = ["Tous", "Gestion locative", "Juridique", "Fiscalité", "Saisonnier"] as const;
type Cat = (typeof categories)[number];

export function BlogClient() {
  const [active, setActive] = useState<Cat>("Tous");

  return (
    <MarketingPublicShell>
      <main className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <header className="marketing-fade-section space-y-6 pb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Ressources pour les propriétaires</h1>
          <p className="mx-auto max-w-2xl text-lg text-white/60">
            Conseils pratiques, guides juridiques et actualités pour gérer vos locations en toute sérénité.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => {
              const isOn = active === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActive(cat)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isOn
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-white/10 bg-white/5 text-white/70 backdrop-blur-sm hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </header>

        <div className="marketing-fade-section my-12 mb-0">
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 px-8 py-8 text-center backdrop-blur-sm">
            <p className="text-lg text-white/60">
              📝 Les premiers articles arrivent bientôt. Revenez nous voir prochainement !
            </p>
          </div>
        </div>

        <LandingFooter />
      </main>
    </MarketingPublicShell>
  );
}
