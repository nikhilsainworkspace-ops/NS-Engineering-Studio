// Small, pure security helpers shared by routes (and covered by tests).

/** Browsers send Sec-Fetch-Site. Private admin APIs only accept same-origin calls or direct navigation. */
export function fetchSiteAllowed(value: string | null | undefined): boolean {
  if (!value) return true; // non-browser clients and older browsers do not send it; the cookie is still required
  return value === "same-origin" || value === "none";
}

export function maskIp(ip: string): string {
  const value = (ip || "").trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return value.replace(/\.\d{1,3}$/, ".x");
  if (value.includes(":")) return `${value.split(":").slice(0, 3).join(":")}::x`;
  return "unknown";
}

export function shortAgent(ua: string | null | undefined): string {
  const value = ua || "";
  const browser = /Edg\//.test(value) ? "Edge" : /OPR\/|Opera/.test(value) ? "Opera" : /Chrome\//.test(value) ? "Chrome" : /Firefox\//.test(value) ? "Firefox" : /Safari\//.test(value) ? "Safari" : value ? "Other browser" : "Unknown";
  const os = /Windows/.test(value) ? "Windows" : /Android/.test(value) ? "Android" : /iPhone|iPad|iOS/.test(value) ? "iOS" : /Mac OS X|Macintosh/.test(value) ? "macOS" : /Linux/.test(value) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function clientIpFromHeaders(get: (name: string) => string | null): string {
  const real = get("x-real-ip");
  if (real) return real.trim();
  const forwarded = get("x-forwarded-for")?.split(",").pop()?.trim();
  return forwarded || "unknown";
}

/** Phone/email masking for preview lists: 98765 43210 -> 98•••••210, name@site.com -> na••@site.com */
export function maskPhone(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 5) return "•".repeat(digits.length);
  return `${digits.slice(0, 2)}${"•".repeat(Math.max(3, digits.length - 5))}${digits.slice(-3)}`;
}
export function maskEmail(value: string): string {
  const text = String(value || "").trim();
  const at = text.indexOf("@");
  if (at < 1) return text ? "••••" : "";
  return `${text.slice(0, Math.min(2, at))}••${text.slice(at)}`;
}
