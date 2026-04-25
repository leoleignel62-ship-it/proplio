import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proplio — Gestion locative simplifiée",
  description:
    "Gérez vos locations sans perdre votre temps. Quittances, baux, états des lieux, révision des loyers — tout est centralisé et automatisé en quelques clics.",
  openGraph: {
    title: "Proplio — Gestion locative simplifiée",
    description: "Gérez vos locations sans perdre votre temps.",
    url: "https://proplio-red.vercel.app/landing",
    siteName: "Proplio",
    locale: "fr_FR",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: import("react").ReactNode }) {
  return children;
}
