import { getSiteSettings } from "@/lib/settings";
import { getWhatsappUrl } from "@/lib/public-config";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StarterNotice } from "@/components/StarterNotice";

export default async function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSiteSettings();
  const whatsappUrl = getWhatsappUrl();
  return <><a className="skip-link" href="#main-content">Skip to content</a>{settings.showStarterNotice ? <StarterNotice /> : null}<SiteHeader settings={settings} whatsappUrl={whatsappUrl} /><main id="main-content">{children}</main><SiteFooter settings={settings} whatsappUrl={whatsappUrl} /></>;
}
