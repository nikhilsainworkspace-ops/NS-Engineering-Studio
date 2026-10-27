import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { brand } from "@/modules/civil-at-hand/lib/brand";
import "@/modules/civil-at-hand/styles/workspace.css";
import "@/modules/civil-at-hand/styles/design-system.css";

export const metadata: Metadata = { title: "Engineering Workspace", description: "Private NS Engineering Studio construction operations workspace.", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";
export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="cah-workspace-scope" style={{ "--brand": "#174ea6" } as CSSProperties}>{children}</div>;
}
