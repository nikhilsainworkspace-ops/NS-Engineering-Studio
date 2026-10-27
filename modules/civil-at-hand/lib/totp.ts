// Time-based one-time passwords (RFC 6238) using only node:crypto, so no extra dependency is needed.
// Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password, etc.
import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0; let value = 0; let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0; let value = 0; const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 character.");
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export function generateTotpSecret(): string {
  return base32Encode(new Uint8Array(randomBytes(20)));
}

export function totpStep(timeMs: number, stepSeconds = 30): number {
  return Math.floor(timeMs / 1000 / stepSeconds);
}

export function hotp(secret: string, counter: number, digits = 6): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const hmac: Buffer = createHmac("sha1", Buffer.from(base32Decode(secret))).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** Returns the matching time step when the code is valid (allowing one step of clock drift), otherwise null. */
export function verifyTotp(secret: string, code: string, nowMs = Date.now(), window = 1): number | null {
  const clean = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const current = totpStep(nowMs);
  for (let drift = -window; drift <= window; drift += 1) {
    if (hotp(secret, current + drift) === clean) return current + drift;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function isValidTotpSecret(secret: string | undefined): secret is string {
  if (!secret) return false;
  try { return base32Decode(secret).length >= 10; } catch { return false; }
}
