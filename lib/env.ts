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
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("NS Studio"),
  NEXT_PUBLIC_CONTACT_PHONE: z.string().default("7703977002"),
  NEXT_PUBLIC_CONTACT_EMAIL: optionalString,
  NEXT_PUBLIC_WHATSAPP_NUMBER: optionalString,
  RESEND_API_KEY: optionalString,
  CONTACT_EMAIL_TO: optionalString,
  CONTACT_EMAIL_FROM: optionalString
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse(process.env);
}

export function requireDatabaseEnv(): { uri: string; dbName: string } {
  const env = getEnv();
  if (!env.MONGODB_URI) throw new Error("Database is not configured.");
  let parsed: URL;
  try {
    parsed = new URL(env.MONGODB_URI);
  } catch {
    throw new Error("Database is not configured correctly.");
  }
  if (!(["mongodb:", "mongodb+srv:"].includes(parsed.protocol))) {
    throw new Error("Database is not configured correctly.");
  }
  return { uri: env.MONGODB_URI, dbName: env.MONGODB_DB };
}

export function adminIsConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.ADMIN_EMAIL.includes("@") &&
    env.ADMIN_PASSWORD_HASH.startsWith("$argon2id$") &&
    env.AUTH_SECRET.length >= 32 &&
    env.MONGODB_URI
  );
}

export function emailIsConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.RESEND_API_KEY && env.CONTACT_EMAIL_TO && env.CONTACT_EMAIL_FROM);
}
