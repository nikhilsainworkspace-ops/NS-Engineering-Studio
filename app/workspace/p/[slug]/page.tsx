import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import { loadLivePage, publicNavigation, type LivePage } from "@/modules/civil-at-hand/lib/public-page-server";
import { getSettings } from "@/modules/civil-at-hand/lib/server-settings";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function resolve(props: Props) {
  const { slug } = await props.params;
  const query = await props.searchParams;
  const key = typeof query.k === "string" ? query.k.slice(0, 80) : "";
  try { return { page: await loadLivePage(slug, key), key }; }
  catch (error) { console.error("Public page load error:", error instanceof Error ? error.message : error); return { page: null, key }; }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page } = await resolve(props);
  if (!page) return { title: `Page not available | ${brand.name}`, robots: { index: false, follow: false } };
  return {
    title: page.seoTitle || `${page.title} | ${brand.name}`,
    description: page.seoDescription || page.summary || undefined,
    robots: page.allowIndexing ? { index: true, follow: true } : { index: false, follow: false },
    referrer: "no-referrer",
  };
}

function imageUrl(id: string, page: LivePage, key: string) {
  const params = new URLSearchParams({ page: page.slug });
  if (page.visibility === "unlisted" && key) params.set("k", key);
  return `/api/site/images/${id}?${params.toString()}`;
}

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph.split("\n").map((line, lineIndex) => <span key={lineIndex}>{lineIndex ? <br /> : null}{line}</span>)}</p>)}</>;
}

export default async function PublicPageView(props: Props) {
  const { page, key } = await resolve(props);
  if (!page) notFound();
  const [settings, nav] = await Promise.all([getSettings().catch(() => null), page.visibility === "public" ? publicNavigation().catch(() => []) : Promise.resolve([])]);
  const businessName = settings?.businessName || brand.name;
  const logo = settings?.logoUrl || brand.logoUrl;
  return <div className="site-shell" style={{ ["--brand" as string]: brand.color }}>
    <header className="site-header">
      <div className="site-header-inner">
        <span className="site-brand">{logo ? <img src={logo} alt="" /> : null}<strong>{businessName}</strong></span>
        <div className="site-header-actions">
          {nav.length > 1 ? <nav aria-label="Pages">{nav.map((item) => <a key={item.slug} href={`/workspace/p/${item.slug}`} aria-current={item.slug === page.slug ? "page" : undefined}>{item.title}</a>)}</nav> : null}
          {settings?.phone ? <a className="site-call" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>Call us</a> : settings?.email ? <a className="site-call" href={`mailto:${settings.email}`}>Contact</a> : null}
        </div>
      </div>
    </header>
    <section className={`site-hero-band${page.coverImageId ? " has-cover" : ""}`}>
      {page.coverImageId ? <img className="site-hero-image" src={imageUrl(page.coverImageId, page, key)} alt="" /> : null}
      <div className="site-hero-inner">
        <span className="site-eyebrow">{businessName}</span>
        <h1>{page.title}</h1>
        {page.summary ? <p className="site-summary">{page.summary}</p> : null}
      </div>
    </section>
    <main className="site-main">
      {page.blocks.map((block, index) => {
        switch (block.type) {
          case "heading": return <h2 className="site-heading" key={index}>{block.text}</h2>;
          case "text": return <div className="site-text" key={index}><Paragraphs text={block.text} /></div>;
          case "list": return <ul className="site-list" key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>;
          case "facts": return <dl className="site-facts" key={index}>{block.facts.map((fact, factIndex) => <div key={factIndex}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>;
          case "image": return <figure className="site-figure" key={index}><img src={imageUrl(block.imageIds[0], page, key)} alt={block.caption || ""} loading="lazy" />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
          case "gallery": return <figure className="site-gallery" key={index}><div>{block.imageIds.map((id) => <img key={id} src={imageUrl(id, page, key)} alt="" loading="lazy" />)}</div>{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
          case "cta": return <p className="site-cta" key={index}><a href={block.linkUrl} rel={/^https?:/i.test(block.linkUrl) ? "noopener noreferrer" : undefined}>{block.linkLabel}</a>{block.text ? <span>{block.text}</span> : null}</p>;
          case "contact": return <address className="site-contact" key={index}>
            <strong>{block.text || "Get in touch"}</strong>
            {settings?.address ? <span>{[settings.address, settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}</span> : null}
            {settings?.phone ? <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a> : null}
            {settings?.email ? <a href={`mailto:${settings.email}`}>{settings.email}</a> : null}
            {settings?.website ? <a href={settings.website} rel="noopener noreferrer">{settings.website.replace(/^https?:\/\//, "")}</a> : null}
          </address>;
          case "divider": return <hr className="site-divider" key={index} />;
          default: return null;
        }
      })}
    </main>
    <footer className="site-footer">© {new Date().getFullYear()} {businessName}</footer>
  </div>;
}
