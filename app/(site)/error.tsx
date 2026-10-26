"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("A public page failed to render."); }, []);
  return <section className="section"><div className="shell" style={{ maxWidth: 690, textAlign: "center" }}><AlertTriangle size={32} color="var(--color-gold)" style={{ margin: "0 auto 18px" }} /><h1 style={{ color: "var(--color-cream)", fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 42 }}>Something interrupted this page.</h1><p style={{ color: "var(--color-muted)" }}>Your request was not completed. Try again or return to the home page.</p><div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}><button className="button button-primary" onClick={() => reset()}><RotateCcw size={16} /> Try again</button><Link className="button button-outline" href="/">Back home</Link></div></div></section>;
}
