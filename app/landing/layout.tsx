import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/utils/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Locavio — Gérez vos locations sans perdre votre temps | Logiciel gratuit",
  description:
    "Locavio est le logiciel de gestion locative pour propriétaires bailleurs. Générez vos quittances en 1 clic, créez des baux conformes ALUR, réalisez vos états des lieux et automatisez la révision IRL. Gratuit pour commencer, sans carte bancaire.",
  alternates: {
    canonical: "https://locavio.fr/landing",
  },
  openGraph: {
    title: "Locavio — Gérez vos locations sans perdre votre temps | Logiciel gratuit",
    description:
      "Locavio est le logiciel de gestion locative pour propriétaires bailleurs. Quittances, baux, états des lieux et révision IRL en quelques clics.",
    url: `${siteUrl}/landing`,
    siteName: "Locavio",
    locale: "fr_FR",
    type: "website",
  },
};

export default function LandingLayout({ children }: { children: import("react").ReactNode }) {
  return children;
}
