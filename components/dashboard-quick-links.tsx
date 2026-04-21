"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { IconContract, IconDocument } from "@/components/proplio-icons";
import { PC } from "@/lib/proplio-colors";
import { getCurrentProprietaireId } from "@/lib/proprietaire-profile";
import { supabase } from "@/lib/supabase";

const baseBtn: CSSProperties = {
  borderRadius: 12,
  fontWeight: 500,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
};

export function DashboardQuickLinks() {
  const [hover, setHover] = useState<string | null>(null);
  const [picker, setPicker] = useState<"quittances" | "baux" | "edl" | null>(null);
  const [logements, setLogements] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { proprietaireId } = await getCurrentProprietaireId();
      if (!proprietaireId || cancelled) return;
      const { data } = await supabase
        .from("logements")
        .select("id, nom, adresse")
        .eq("proprietaire_id", proprietaireId)
        .order("nom", { ascending: true });
      if (cancelled) return;
      setLogements(
        (data ?? []).map((row) => ({
          id: row.id as string,
          label: ((row.nom as string | null) || (row.adresse as string | null) || (row.id as string)),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkStyle = (id: string): CSSProperties => ({
    ...baseBtn,
    backgroundColor: hover === id ? PC.primaryHover : PC.primary,
    color: PC.white,
    padding: "0.625rem 1.25rem",
  });

  const actionConfig = useMemo(
    () => ({
      quittances: { base: "/quittances", prefill: "logement_id", label: "Nouvelle quittance" },
      baux: { base: "/baux", prefill: "logement_id", label: "Nouveau bail" },
      edl: { base: "/etats-des-lieux", prefill: "bail_logement_id", label: "Nouvel état des lieux" },
    }),
    [],
  );

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        href="#"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("q")}
        onClick={(e) => {
          e.preventDefault();
          setPicker("quittances");
        }}
        onMouseEnter={() => setHover("q")}
        onMouseLeave={() => setHover(null)}
      >
        <IconDocument className="h-4 w-4 shrink-0" />
        Nouvelle quittance
      </Link>
      <Link
        href="#"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("b")}
        onClick={(e) => {
          e.preventDefault();
          setPicker("baux");
        }}
        onMouseEnter={() => setHover("b")}
        onMouseLeave={() => setHover(null)}
      >
        <IconContract className="h-4 w-4 shrink-0" />
        Nouveau bail
      </Link>
      <Link
        href="#"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("e")}
        onClick={(e) => {
          e.preventDefault();
          setPicker("edl");
        }}
        onMouseEnter={() => setHover("e")}
        onMouseLeave={() => setHover(null)}
      >
        Nouvel état des lieux
      </Link>
      {picker ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl p-5"
            style={{ backgroundColor: PC.card, border: `1px solid ${PC.border}`, boxShadow: PC.cardShadow }}
          >
            <h3 className="text-base font-semibold" style={{ color: PC.text }}>
              {actionConfig[picker].label} — choisir un logement
            </h3>
            <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
              {logements.map((logement) => (
                <Link
                  key={logement.id}
                  href={`${actionConfig[picker].base}?${actionConfig[picker].prefill}=${encodeURIComponent(logement.id)}`}
                  className="block rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: PC.bg, border: `1px solid ${PC.border}`, color: PC.text }}
                  onClick={() => setPicker(null)}
                >
                  {logement.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" className="proplio-btn-secondary" onClick={() => setPicker(null)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
