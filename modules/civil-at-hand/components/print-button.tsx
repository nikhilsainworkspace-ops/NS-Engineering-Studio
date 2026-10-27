"use client";

export default function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return <button type="button" className="print-action" onClick={() => window.print()}>{label}</button>;
}
