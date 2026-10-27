import type { MetadataRoute } from "next";
import { getPublicOrigin } from "@/lib/public-config";
import { getContent } from "@/lib/content";
import type { ServiceItem } from "@/lib/brand";
import type { ProjectItem, SoftwareItem } from "@/lib/content";
import { GUIDE_ARTICLES } from "@/lib/resources";
import { PRODUCT_GUIDES } from "@/lib/product-content";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicOrigin();
  const staticRoutes = ["", "/products", "/products/civilmargin", "/products/engineering-workspace", "/about", "/services", "/service-coverage", "/industries", "/tools", "/resources", "/process", "/contact", "/search", "/faq", "/privacy", "/terms", "/cookies", "/refund-cancellation", "/projects", "/engineering-software"];
  const staticItems = staticRoutes.map((route) => ({ url: `${base}${route}`, lastModified: new Date(), changeFrequency: route === "" ? "weekly" as const : "monthly" as const, priority: route === "" ? 1 : route === "/contact" ? 0.8 : 0.6 }));
  const services = await getContent<ServiceItem>("services");
  const projects = (await getContent<ProjectItem>("projects")).filter((item) => item.published && item.status !== "draft" && item.status !== "archived");
  const software = (await getContent<SoftwareItem>("software")).filter((item) => item.published);
  const serviceItems = services.map((service) => ({ url: `${base}/services/${service.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.55 }));
  const productItems = PRODUCT_GUIDES.map((product) => ({ url: `${base}/products/${product.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.75 }));
  const guideItems = GUIDE_ARTICLES.map((article) => ({ url: `${base}/resources/${article.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.55 }));
  const projectItems = projects.map((project) => ({ url: `${base}/projects/${project.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 }));
  const softwareItems = software.map((product) => ({ url: `${base}/engineering-software`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.55 }));
  return [...staticItems, ...productItems, ...guideItems, ...serviceItems, ...projectItems, ...softwareItems];
}
