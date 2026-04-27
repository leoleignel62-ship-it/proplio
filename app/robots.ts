import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/landing",
        "/qui-sommes-nous",
        "/mentions-legales",
        "/cgu",
        "/politique-de-confidentialite",
      ],
      disallow: [
        "/dashboard",
        "/logements",
        "/locataires",
        "/quittances",
        "/baux",
        "/etats-des-lieux",
        "/revisions-irl",
        "/saisonnier",
        "/parametres",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
