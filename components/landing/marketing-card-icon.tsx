"use client";

import type { LucideIcon } from "lucide-react";

/** Carte blanche pages marketing (hors liens). */
export const publicWhiteCard =
  "rounded-2xl border border-gray-200 bg-white hover:shadow-md hover:border-violet-100 transition-all duration-300 cursor-default";

const iconWrap = "inline-flex shrink-0 rounded-full bg-violet-50 p-3 text-[#7c3aed]";

export function MarketingCardIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className={iconWrap} aria-hidden>
      <Icon size={24} strokeWidth={2} className="text-[#7c3aed]" />
    </span>
  );
}
