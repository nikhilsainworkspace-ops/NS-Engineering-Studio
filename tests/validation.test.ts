import { describe, expect, it } from "vitest";
import { contactSchema, faqSchema, loginSchema, serviceSchema, settingsSchema, isHttpUrl } from "@/lib/validation";
import { DEFAULT_SETTINGS } from "@/lib/brand";

const validContact = {
  name: "Jamie Example",
  email: "JAMIE@EXAMPLE.COM",
  phone: "7703977002",
  subject: "Question about services",
  projectType: "Civil engineering learning & tools",
  timeline: "1–3 months",
  message: "I would like to understand the scope of the service.",
  consent: true,
  website: "",
  submissionKey: "f6175f68-6eba-4800-a078-4937adf812c5"
};

describe("contact validation", () => {
  it("normalizes email casing and accepts valid consented inquiries", () => {
    const result = contactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jamie@example.com");
      expect(result.data.projectType).toBe("Civil engineering learning & tools");
      expect(result.data.timeline).toBe("1–3 months");
    }
  });
  it("rejects unsupported project options instead of storing arbitrary values", () => {
    expect(contactSchema.safeParse({ ...validContact, projectType: "root access" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...validContact, timeline: "tomorrow, guaranteed" }).success).toBe(false);
  });
  it("rejects an inquiry without explicit consent", () => {
    expect(contactSchema.safeParse({ ...validContact, consent: false }).success).toBe(false);
  });
  it("rejects unknown fields instead of mass-assigning them", () => {
    expect(contactSchema.safeParse({ ...validContact, status: "resolved" }).success).toBe(false);
  });
  it("rejects oversized messages", () => {
    expect(contactSchema.safeParse({ ...validContact, message: "x".repeat(3001) }).success).toBe(false);
  });
});

describe("admin credential and content validation", () => {
  it("requires syntactically valid email and non-empty password", () => {
    expect(loginSchema.safeParse({ email: "owner@example.com", password: "passphrase" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "passphrase" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "owner@example.com", password: "" }).success).toBe(false);
  });
  it("allows lowercase slugs and rejects unsafe slug syntax", () => {
    expect(serviceSchema.safeParse({ slug: "good-service", title: "Good service", summary: "Summary", body: "Details", icon: "Compass", published: true, sortOrder: 1 }).success).toBe(true);
    expect(serviceSchema.safeParse({ slug: "../bad", title: "Bad", summary: "Summary", body: "Details", icon: "Compass", published: true, sortOrder: 1 }).success).toBe(false);
  });
  it("validates settings and constrains logos to local brand assets", () => {
    expect(settingsSchema.safeParse(DEFAULT_SETTINGS).success).toBe(true);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, logoPath: "https://example.com/logo.png" }).success).toBe(false);
  });
  it("accepts only http and https URLs", () => {
    expect(isHttpUrl("https://example.com/profile")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("//example.com/path")).toBe(false);
  });
  it("validates FAQ draft fields", () => {
    expect(faqSchema.safeParse({ slug: "first-question", question: "How does it begin?", answer: "Share a short inquiry.", published: false, sortOrder: 1 }).success).toBe(true);
    expect(faqSchema.safeParse({ slug: "First Question", question: "?", answer: "Answer", published: false, sortOrder: 1 }).success).toBe(false);
  });
});
