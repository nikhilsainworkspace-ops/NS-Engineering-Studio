// Brand settings come from environment variables so name, logo, favicon, colour and domain
// can be changed in Vercel without touching code. Defaults use the shared NS Engineering Studio monogram.

function cleanSiteUrl(raw: string | undefined): string {
  const value = (raw || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try { return new URL(withProtocol).origin; } catch { return ""; }
}

export const brand = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "NS Engineering Studio",
  tagline: process.env.NEXT_PUBLIC_APP_TAGLINE?.trim() || "Engineering and construction workflows, organised.",
  siteUrl: cleanSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  color: /^#[0-9a-fA-F]{6}$/.test(process.env.NEXT_PUBLIC_BRAND_COLOR || "")
    ? process.env.NEXT_PUBLIC_BRAND_COLOR!
    : "#1f3a5c",
  logoUrl: process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() || "/brand/ns-monogram.svg",
  faviconUrl: process.env.NEXT_PUBLIC_FAVICON_URL?.trim() || "/favicon.svg",
};

export function getBaseUrl(requestUrl?: string) {
  // Build share URLs from the host that actually served the admin request. A stale
  // NEXT_PUBLIC_SITE_URL in Vercel should not silently create links to an old domain.
  if (requestUrl) {
    try {
      const origin = new URL(requestUrl).origin;
      if (origin && /^https?:\/\//i.test(origin)) return origin;
    } catch { /* Fall back to the configured site URL below. */ }
  }
  if (brand.siteUrl) return brand.siteUrl;
  return "http://localhost:3000";
}
