import type { Metadata, Viewport } from "next";
import { getSiteSettings } from "@/lib/settings";
import { getPublicOrigin } from "@/lib/public-config";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#0a0b0d", colorScheme: "dark", width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const origin = getPublicOrigin();
  return {
    metadataBase: new URL(origin),
    title: { default: settings.siteTitle, template: `%s | ${settings.brandName}` },
    description: settings.siteDescription,
    applicationName: settings.brandName,
    alternates: { canonical: "/" },
    openGraph: { type: "website", locale: "en_IN", siteName: settings.brandName, title: settings.siteTitle, description: settings.siteDescription, url: origin, images: [{ url: "/brand/social-preview.png", width: 1200, height: 630, alt: `${settings.brandName} — white and gold monogram on black` }] },
    twitter: { card: "summary_large_image", title: settings.siteTitle, description: settings.siteDescription, images: ["/brand/social-preview.png"] },
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "any" }, { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }, { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
    manifest: "/site.webmanifest",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
