import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/utils/site-url";
import { QuiSommesNousClient } from "./qui-sommes-nous-client";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Qui sommes-nous ? — Locavio, logiciel de gestion locative",
  description:
    "Découvrez l'histoire de Locavio, créé par Tony et Léo pour simplifier la gestion locative des propriétaires français.",
  openGraph: {
    title: "Qui sommes-nous ? — Locavio, logiciel de gestion locative",
    description: "Découvrez l'histoire de Locavio.",
    url: `${siteUrl}/qui-sommes-nous`,
    siteName: "Locavio",
    locale: "fr_FR",
    type: "website",
  },
};

export default function QuiSommesNousPage() {
  return <QuiSommesNousClient />;
}
