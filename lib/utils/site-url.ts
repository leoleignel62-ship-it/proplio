const FALLBACK_SITE_URL = "https://locavio.fr";

export function getSiteUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return siteUrl || FALLBACK_SITE_URL;
}
