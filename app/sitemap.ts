import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/public-config";
import { getContent } from "@/lib/content";
import type { ServiceItem } from "@/lib/brand";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicOrigin();
  const staticRoutes = ["", "/products", "/about", "/services", "/process", "/contact", "/faq", "/privacy", "/terms"];
  const staticItems = staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/contact" ? 0.8 : 0.6 }));
  const services = await getContent<ServiceItem>("services");
  const serviceItems = services.map((service) => ({ url: `${base}/services/${service.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.55 }));
  return [...staticItems, ...serviceItems];
}
