"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { PC } from "@/lib/proplio-colors";
import { panelCard } from "@/lib/proplio-field-styles";

const NEXT_PUBLIC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function maskValue(name: string, value: string | undefined): string {
  if (value === undefined || value === "") return "(absent)";
  const v = String(value);
  const n = name.includes("KEY") ? 8 : 14;
  if (v.length <= n) return `${v.slice(0, 3)}…`;
  return `${v.slice(0, n)}…`;
}

const wrap: CSSProperties = {
  ...panelCard,
  maxWidth: "36rem",
  width: "100%",
  padding: 24,
};

export default function TestAuthPage() {
  const [pingStatus, setPingStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pingDetail, setPingDetail] = useState("");

  async function testSupabaseConnection() {
    setPingStatus("loading");
    setPingDetail("");
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !anon) {
      setPingStatus("error");
      setPingDetail("URL ou clé anon manquante côté client (build Vercel).");
      return;
    }
    try {
      const res = await fetch(`${base}/auth/v1/health`, {
        method: "GET",
        headers: { apikey: anon },
        cache: "no-store",
      });
      const body = await res.text();
      if (res.ok) {
        setPingStatus("ok");
        setPingDetail(`HTTP ${res.status} — ${body.slice(0, 200)}`);
      } else {
        setPingStatus("error");
        setPingDetail(`HTTP ${res.status} — ${body.slice(0, 300)}`);
      }
    } catch (e) {
      setPingStatus("error");
      setPingDetail(e instanceof Error ? e.message : "Erreur réseau");
    }
  }

  return (
    <section className="proplio-page-wrap flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div style={wrap}>
        <h1 className="text-lg font-semibold" style={{ color: PC.text }}>
          Test auth / Supabase (sans connexion)
        </h1>
        <p className="mt-2 text-sm" style={{ color: PC.muted }}>
          Vérifie que les variables <code style={{ color: PC.secondary }}>NEXT_PUBLIC_*</code> sont bien
          injectées sur Vercel et que le projet Supabase répond.
        </p>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: PC.muted }}>
            Variables NEXT_PUBLIC_* (aperçu tronqué)
          </p>
          <ul className="space-y-2 text-sm font-mono">
            {NEXT_PUBLIC_KEYS.map((key) => {
              const raw = (process.env as Record<string, string | undefined>)[key];
              return (
                <li
                  key={key}
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}` }}
                >
                  <span style={{ color: PC.secondary }}>{key}</span>
                  <span className="ml-2" style={{ color: PC.text }}>
                    {maskValue(key, raw)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: PC.primary,
              color: PC.white,
              opacity: pingStatus === "loading" ? 0.7 : 1,
            }}
            disabled={pingStatus === "loading"}
            onClick={() => void testSupabaseConnection()}
          >
            {pingStatus === "loading" ? "Test en cours…" : "Tester la connexion Supabase"}
          </button>
          {pingStatus === "ok" ? (
            <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.successBg10, color: PC.success }}>
              {pingDetail}
            </p>
          ) : null}
          {pingStatus === "error" ? (
            <p className="mt-3 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: PC.dangerBg10, color: PC.danger }}>
              {pingDetail}
            </p>
          ) : null}
        </div>

        <p className="mt-8 text-sm" style={{ color: PC.muted }}>
          <Link href="/login" style={{ color: PC.secondary, fontWeight: 600 }}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </section>
  );
}
