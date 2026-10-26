"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
      setPending(false);
    }
  }
  return <button className="button button-quiet logout-button" onClick={logout} disabled={pending} type="button"><LogOut size={16} aria-hidden="true" />{pending ? "Signing out…" : "Sign out"}</button>;
}
