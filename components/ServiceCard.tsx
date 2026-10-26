import Link from "next/link";
import { ArrowRight, Compass, Layers, Lightbulb, PanelsTopLeft, Route, CircleHelp } from "lucide-react";
import type { ServiceItem } from "@/lib/brand";

const iconMap = { Compass, PanelsTopLeft, Route, Lightbulb, Layers, CircleHelp };
export function ServiceCard({ service }: { service: ServiceItem }) {
  const Icon = iconMap[service.icon as keyof typeof iconMap] ?? Compass;
  return <article className="service-card"><div className="service-card-top"><span className="icon-tile"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span><span className="service-number">{String(service.sortOrder).padStart(2, "0")}</span></div><h3>{service.title}</h3><p>{service.summary}</p><Link href={`/services/${service.slug}`} className="text-link">Explore offering <ArrowRight size={15} aria-hidden="true" /></Link></article>;
}
