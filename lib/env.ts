import { z } from "zod";

const optionalString = z.string().optional().default("");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: optionalString,
  MONGODB_DB: z.string().min(1).default("ns_studio"),
  ADMIN_EMAIL: optionalString,
  ADMIN_PASSWORD_HASH: optionalString,
  AUTH_SECRET: optionalString,
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("NS Engineering Studio"),
  NEXT_PUBLIC_CONTACT_PHONE: z.string().default("7703977002"),
  NEXT_PUBLIC_CONTACT_EMAIL: optionalString,
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalString,
  RESEND_API_KEY: optionalString,
  CONTACT_EMAIL_TO: optionalString,
  CONTACT_EMAIL_FROM: optionalString
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Vercel stores values as entered, while .env files can interpret `$` sequences.
 * Accept a raw value, a quoted value, or the escaped `\$argon2id\$...` form
 * that people sometimes copy from an .env file. Never log normalized values.
 */
function cleanValue(value: string | undefined, unescapeDollar = false): string | undefined {
  if (typeof value !== "string") return undefined;
  let result = value.trim();
  if (result.length >= 2 && ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'")))) {
    result = result.slice(1, -1).trim();
  }
  if (unescapeDollar) result = result.replace(/\\\$/g, "$");
  return result.length ? result : undefined;
}

function runtimeEnvInput(): Record<string, string | undefined> {
  return {
    NODE_ENV: cleanValue(process.env.NODE_ENV),
    MONGODB_URI: cleanValue(process.env.MONGODB_URI),
    MONGODB_DB: cleanValue(process.env.MONGODB_DB),
    ADMIN_EMAIL: cleanValue(process.env.ADMIN_EMAIL),
    ADMIN_PASSWORD_HASH: cleanValue(process.env.ADMIN_PASSWORD_HASH, true),
    AUTH_SECRET: cleanValue(process.env.AUTH_SECRET),
    NEXT_PUBLIC_SITE_URL: cleanValue(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_SITE_NAME: cleanValue(process.env.NEXT_PUBLIC_SITE_NAME),
    NEXT_PUBLIC_CONTACT_PHONE: cleanValue(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    NEXT_PUBLIC_CONTACT_EMAIL: cleanValue(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    NEXT_PUBLIC_WHATSAPP_NUMBER: cleanValue(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
    RESEND_API_KEY: cleanValue(process.env.RESEND_API_KEY),
    CONTACT_EMAIL_TO: cleanValue(process.env.CONTACT_EMAIL_TO),
    CONTACT_EMAIL_FROM: cleanValue(process.env.CONTACT_EMAIL_FROM)
  };
}

export function getEnv(): AppEnv {
  return envSchema.parse(runtimeEnvInput());
}

export function requireDatabaseEnv(): { uri: string; dbName: string } {
  // Keep database connection configuration independent from public metadata variables.
  const uri = cleanValue(process.env.MONGODB_URI);
  const dbName = cleanValue(process.env.MONGODB_DB) ?? "ns_studio";
  if (!uri) throw new Error("Database is not configured.");
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Database is not configured correctly.");
  }
  if (!(parsed.protocol === "mongodb:" || parsed.protocol === "mongodb+srv:") || !parsed.hostname) {
    throw new Error("Database is not configured correctly.");
  }
  return { uri, dbName };
}


export type AdminRuntimeEnv = { ADMIN_EMAIL: string; ADMIN_PASSWORD_HASH: string; AUTH_SECRET: string };

export function getAdminEnv(): AdminRuntimeEnv {
  const env = runtimeEnvInput();
  return { ADMIN_EMAIL: env.ADMIN_EMAIL ?? "", ADMIN_PASSWORD_HASH: env.ADMIN_PASSWORD_HASH ?? "", AUTH_SECRET: env.AUTH_SECRET ?? "" };
}

export type AdminConfigurationStatus = { configured: boolean; issues: string[] };

/** Only returns safe setup guidance; it never returns environment values or secrets. */
export function adminConfigurationStatus(): AdminConfigurationStatus {
  const env = runtimeEnvInput();
  const issues: string[] = [];
  const uri = env.MONGODB_URI;
  let validMongoUri = false;
  if (uri) {
    try {
      const parsed = new URL(uri);
      validMongoUri = (parsed.protocol === "mongodb:" || parsed.protocol === "mongodb+srv:") && Boolean(parsed.hostname);
    } catch {
      validMongoUri = false;
    }
  }
  if (!validMongoUri) issues.push("MONGODB_URI is missing or is not a valid MongoDB connection URI.");

  const email = env.ADMIN_EMAIL ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push("ADMIN_EMAIL is missing or does not look like a valid email address.");
  }

  const passwordHash = env.ADMIN_PASSWORD_HASH ?? "";
  // Encoded Argon2 hashes have this structure: $argon2id$v=19$params$salt$hash.
  if (!/^\$argon2id\$v=\d+\$[^$]+\$[^$]+\$[^$]+$/.test(passwordHash)) {
    issues.push("ADMIN_PASSWORD_HASH is missing or is not an Argon2id hash. Run `npm run admin:hash` and paste the generated hash value without surrounding quotes.");
  }

  const secret = env.AUTH_SECRET ?? "";
  if (secret.length < 32) {
    issues.push("AUTH_SECRET must be a random server-only value with at least 32 characters.");
  }

  return { configured: issues.length === 0, issues };
}

export function adminIsConfigured(): boolean {
  return adminConfigurationStatus().configured;
}

export function emailIsConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RESEND_API_KEY && env.CONTACT_EMAIL_TO && env.CONTACT_EMAIL_FROM);
}
