import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Locavio — Gestion locative simplifiée",
  description:
    "Gérez vos locations sans perdre votre temps. Quittances, baux, états des lieux, révision des loyers — tout est centralisé et automatisé en quelques clics.",
  openGraph: {
    title: "Locavio — Gestion locative simplifiée",
    description: "Gérez vos locations sans perdre votre temps.",
    url: "https://proplio-red.vercel.app/landing",
    siteName: "Locavio",
    locale: "fr_FR",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: import("react").ReactNode }) {
  return children;
}
