import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
    sitemap: "https://proplio-red.vercel.app/sitemap.xml",
  };
}
