import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/public-config";
export default function robots(): MetadataRoute.Robots {
  const origin = getPublicOrigin();
  return { rules: [{ userAgent: "*", allow: ["/", "/about", "/services", "/service-coverage", "/contact", "/faq", "/privacy", "/terms", "/projects", "/engineering-software", "/search", "/cookies", "/refund-cancellation"], disallow: ["/admin", "/api/"] }], sitemap: `${origin}/sitemap.xml`, host: origin };
}
