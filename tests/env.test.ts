import { afterEach, describe, expect, it, vi } from "vitest";
import { adminConfigurationStatus, getAdminEnv } from "@/lib/env";

const validHash = "$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHQ$YXJnb25oYXNo";

afterEach(() => vi.unstubAllEnvs());

describe("admin configuration readiness", () => {
  it("accepts valid server configuration without requiring unrelated public values", () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://app:secret@cluster.example.mongodb.net/ns_studio?retryWrites=true&w=majority");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", validHash);
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("MONGODB_DB", "");

    expect(adminConfigurationStatus()).toEqual({ configured: true, issues: [] });
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);
  });

  it("normalizes escaped dollar signs copied from an env file", () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://app:secret@cluster.example.mongodb.net/ns_studio");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", validHash.replaceAll("$", "\\$"));
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    expect(adminConfigurationStatus().configured).toBe(true);
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);
  });

  it("accepts the Vercel-escaped hash and normalizes multiple escape layers", () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://app:secret@cluster.example.mongodb.net/ns_studio");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", validHash.replaceAll("$", "\\$"));
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    expect(adminConfigurationStatus().configured).toBe(true);
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);

    vi.stubEnv("ADMIN_PASSWORD_HASH", validHash.replaceAll("$", "\\\\$"));
    expect(adminConfigurationStatus().configured).toBe(true);
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);
  });

  it("accepts an accidentally copied environment assignment without weakening hash validation", () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://app:secret@cluster.example.mongodb.net/ns_studio");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", `ADMIN_PASSWORD_HASH=${validHash.replaceAll("$", "\\$")}`);
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    expect(adminConfigurationStatus().configured).toBe(true);
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);

    vi.stubEnv("ADMIN_PASSWORD_HASH", "not-a-password-hash");
    expect(adminConfigurationStatus().configured).toBe(false);
  });

  it("extracts the hash when command output was accidentally copied with it", () => {
    vi.stubEnv("MONGODB_URI", "mongodb+srv://app:secret@cluster.example.mongodb.net/ns_studio");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_PASSWORD_HASH", `Copy this value to ADMIN_PASSWORD_HASH:\n${validHash}\nThe password itself was not printed.`);
    vi.stubEnv("AUTH_SECRET", "x".repeat(48));
    expect(adminConfigurationStatus().configured).toBe(true);
    expect(getAdminEnv().ADMIN_PASSWORD_HASH).toBe(validHash);
  });

  it("shows safe, actionable setup issues for missing values", () => {
    vi.stubEnv("MONGODB_URI", "");
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    vi.stubEnv("AUTH_SECRET", "short");
    const status = adminConfigurationStatus();
    expect(status.configured).toBe(false);
    expect(status.issues.join(" ")).toContain("MONGODB_URI");
    expect(status.issues.join(" ")).toContain("ADMIN_EMAIL");
    expect(status.issues.join(" ")).toContain("ADMIN_PASSWORD_HASH");
    expect(status.issues.join(" ")).toContain("AUTH_SECRET");
    expect(status.issues.join(" ")).not.toContain("short");
  });
});
