"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import { IconContract, IconDocument } from "@/components/proplio-icons";
import { PC } from "@/lib/proplio-colors";

const baseBtn: CSSProperties = {
  borderRadius: 12,
  fontWeight: 500,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
};

export function DashboardQuickLinks() {
  const [hover, setHover] = useState<string | null>(null);

  const linkStyle = (id: string): CSSProperties => ({
    ...baseBtn,
    backgroundColor: hover === id ? PC.primaryHover : PC.primary,
    color: PC.white,
    padding: "0.625rem 1.25rem",
  });

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link
        href="/quittances"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("q")}
        onMouseEnter={() => setHover("q")}
        onMouseLeave={() => setHover(null)}
      >
        <IconDocument className="h-4 w-4 shrink-0" />
        Nouvelle quittance
      </Link>
      <Link
        href="/baux"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("b")}
        onMouseEnter={() => setHover("b")}
        onMouseLeave={() => setHover(null)}
      >
        <IconContract className="h-4 w-4 shrink-0" />
        Nouveau bail
      </Link>
      <Link
        href="/etats-des-lieux"
        className="inline-flex items-center justify-center gap-2 sm:min-w-[200px]"
        style={linkStyle("e")}
        onMouseEnter={() => setHover("e")}
        onMouseLeave={() => setHover(null)}
      >
        Nouvel état des lieux
      </Link>
    </div>
  );
}
