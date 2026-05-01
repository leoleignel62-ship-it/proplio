"use client";

import { PC } from "@/lib/locavio-colors";

const sidebarItems = [
  { label: "Dashboard", active: true },
  { label: "Locataires", active: false },
  { label: "Quittances", active: false },
  { label: "Baux", active: false },
  { label: "États des lieux", active: false },
  { label: "Révision IRL", active: false },
];

const barHeights = [40, 72, 55, 88, 48, 95, 62, 78, 52, 84, 68, 58];

export function DashboardMockupSection() {
  return (
    <section
      className="landing-section landing-mockup-reveal mx-auto mt-12 max-w-[900px] px-0 py-8 will-change-transform"
      style={{ color: PC.text }}
    >
      <h2 className="text-center text-3xl font-extrabold tracking-[-0.03em]" style={{ color: PC.text }}>
        Votre tableau de bord, pensé pour aller vite
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-base font-medium leading-[1.7]" style={{ color: PC.muted }}>
        Suivez vos loyers, gérez vos documents et pilotez votre patrimoine depuis une interface claire et intuitive.
      </p>

      <div
        className="landing-mockup-reveal mt-10 overflow-hidden rounded-2xl"
        style={{
          border: "1px solid rgba(124, 58, 237, 0.45)",
          borderRadius: 16,
          background: "rgba(15, 15, 26, 0.85)",
          WebkitBackdropFilter: "blur(20px)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(124,58,237,0.15)",
        }}
      >
        <div className="flex min-h-[280px] flex-col sm:min-h-[320px] sm:flex-row">
          <aside
            className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b p-3 sm:w-[200px] sm:flex-col sm:border-b-0 sm:border-r sm:border-white/10"
            style={{ backgroundColor: "#08080f" }}
          >
            {sidebarItems.map((item) => (
              <div
                key={item.label}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium sm:text-[13px]"
                style={{
                  backgroundColor: item.active ? "rgba(124, 58, 237, 0.25)" : "transparent",
                  color: item.active ? PC.text : PC.muted,
                  border: item.active ? `1px solid ${PC.primaryBorder40}` : "1px solid transparent",
                }}
              >
                {item.label}
              </div>
            ))}
          </aside>

          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6" style={{ backgroundColor: "rgba(6,6,15,0.5)" }}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { k: "3 logements", s: "Biens actifs" },
                { k: "5 locataires actifs", s: "Suivi en cours" },
                { k: "Quittances ce mois : 5", s: "Envoyées" },
                { k: "Baux actifs : 3", s: "Contrats signés" },
              ].map((c) => (
                <div
                  key={c.k}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
                >
                  <p className="text-lg font-bold tabular-nums leading-tight sm:text-xl" style={{ color: PC.text }}>
                    {c.k}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs" style={{ color: PC.muted }}>
                    {c.s}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm font-semibold" style={{ color: PC.text }}>
                Revenus 2026
              </p>
              <div className="mt-4 flex h-24 items-end justify-between gap-1 px-1 sm:h-28">
                {barHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-full max-w-[20px] rounded-t sm:max-w-[24px]"
                    style={{
                      height: `${h}%`,
                      background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 50%, #4f46e5 100%)",
                      minHeight: 12,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: PC.muted }}>
                Suivi financier
              </p>
              <p className="mt-1 text-lg font-bold" style={{ color: PC.success }}>
                2 450 € encaissés
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
