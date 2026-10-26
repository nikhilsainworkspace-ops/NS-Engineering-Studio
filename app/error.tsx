"use client";
import { useEffect } from "react";
import Link from "next/link";
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { useEffect(() => { console.error("The application encountered an unexpected rendering error."); }, []); return <html lang="en"><body><main className="section"><div className="shell" style={{ maxWidth: 650, textAlign: "center" }}><h1>We couldn’t open this page.</h1><p>The request failed unexpectedly. Please try again.</p><button className="button button-primary" onClick={() => reset()}>Try again</button><p><Link href="/">Return home</Link></p></div></main></body></html>; }
