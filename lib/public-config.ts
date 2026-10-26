import "server-only";
import { getEnv } from "@/lib/env";

export function getWhatsappUrl(): string {
  const number = getEnv().NEXT_PUBLIC_WHATSAPP_NUMBER;
  // E.164 digits only are required. Never infer a country code from the supplied phone number.
  if (!/^\d{11,15}$/.test(number)) return "";
  return `https://wa.me/${number}`;
}

export function getPublicOrigin(): string {
  return getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}
