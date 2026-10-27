import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminCatalogPanel } from "@/components/AdminCatalogPanel";
export const dynamic = "force-dynamic";
export const metadata = { title: "Project management", robots: { index: false, follow: false } };
export default async function AdminProjectsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminCatalogPanel kind="projects" />;
}
