import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | NS Engineering Studio Admin" }, robots: { index: false, follow: false, noarchive: true, nosnippet: true } };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-route">{children}</div>;
}
