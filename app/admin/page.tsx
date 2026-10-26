import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminDashboard email={session.email} />;
}
