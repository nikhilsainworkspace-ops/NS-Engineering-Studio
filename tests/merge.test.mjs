import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(file, "utf8");
const exists = (file) => fs.existsSync(file);
function filesUnder(dir, suffix = "") {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(file, suffix);
    return (!suffix || file.endsWith(suffix)) ? [file] : [];
  });
}

test("all legacy construction API route handlers are retained in the namespace", () => {
  const routes = filesUnder("app/api/civil-at-hand", "route.ts");
  assert.equal(routes.length, 98);
  assert.ok(exists("app/workspace/page.tsx"));
  assert.ok(exists("modules/civil-at-hand/models/Project.ts"));
  assert.ok(exists("modules/civil-at-hand/components/dashboard.tsx"));
  assert.match(read("next.config.ts"), /destination: ['"]\/api\/civil-at-hand\//);
});

test("public projects, service coverage and engineering software routes exist", () => {
  for (const file of [
    "app/(site)/projects/page.tsx",
    "app/(site)/projects/[slug]/page.tsx",
    "app/(site)/engineering-software/page.tsx",
    "app/(site)/service-coverage/page.tsx",
    "app/(site)/search/page.tsx",
    "app/admin/projects/page.tsx",
    "app/admin/software/page.tsx",
    "app/admin/billing/page.tsx",
    "app/admin/roles/page.tsx",
    "components/PublicProjectDirectory.tsx",
    "components/PublicSoftwareDirectory.tsx",
    "components/ThemeToggle.tsx",
    "components/ScrollUtilities.tsx",
    "components/AdminCatalogPanel.tsx"
  ]) assert.ok(exists(file), `${file} should exist`);
  assert.match(read("lib/content.ts"), /kind === "projects"/);
  assert.match(read("lib/content.ts"), /kind === "software"/);
  assert.match(read("lib/validation.ts"), /projectSchema/);
  assert.match(read("lib/validation.ts"), /softwareSchema/);
});

test("the public identity is rebranded and old public URL redirects", () => {
  const publicFiles = filesUnder("app/(site)", ".tsx").map((file) => [file, read(file)]);
  for (const [file, source] of publicFiles) assert.doesNotMatch(source, /Civil At Hand|Civil at Hand/, `legacy customer-facing brand in ${file}`);
  assert.match(read("lib/brand.ts"), /workingName: "NS Engineering Studio"/);
  assert.match(read("components/SiteHeader.tsx"), /ThemeToggle/);
  assert.match(read("app/(site)/layout.tsx"), /Skip to content/);
  assert.match(read("lib/product-content.ts"), /slug: "engineering-workspace"/);
  assert.match(read("next.config.ts"), /source: "\/products\/civil-at-hand", destination: "\/products\/engineering-workspace"/);
  assert.equal(exists("public/legacy/civil-at-hand"), false);
});

test("central workspace authentication points to the NS session source", () => {
  const auth = read("modules/civil-at-hand/lib/auth.ts");
  assert.match(auth, /getAdminSession as getStudioAdminSession/);
  assert.doesNotMatch(auth, /COOKIE_NAME|startSession\(|endSession\(/);
  assert.match(read("app/api/civil-at-hand/auth/login/route.ts"), /createAdminSession/);
  assert.match(read("app/api/civil-at-hand/security/sessions/route.ts"), /currentAdminSessionId/);
  assert.match(read("lib/auth.ts"), /SESSION_TTL_MS = 8 \* 60 \* 60 \* 1000/);
});

test("contact enquiries support India location and managed follow-up fields", () => {
  const contactForm = read("components/ContactForm.tsx");
  const contactRoute = read("app/api/contact/route.ts");
  const adminRoute = read("app/api/admin/leads/route.ts");
  assert.match(contactForm, /contact-state/);
  assert.match(contactForm, /Dadra and Nagar Haveli and Daman and Diu/);
  for (const field of ["organization", "state", "city"]) assert.match(contactRoute, new RegExp(`${field}:`));
  for (const status of ["contacted", "in_progress", "converted", "closed"]) assert.ok(adminRoute.includes(status));
  for (const field of ["assignedTo", "priority", "followUpDate"]) assert.ok(adminRoute.includes(field));
});

test("launch environment and release documentation are present without literal secrets", () => {
  const env = read(".env.example");
  for (const key of ["MONGODB_URI", "MONGODB_DB", "CIVIL_AT_HAND_MONGODB_URI", "CIVIL_AT_HAND_MONGODB_DB", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH", "AUTH_SECRET", "RESEND_API_KEY", "GEMINI_API_KEY"]) assert.ok(env.includes(key));
  assert.doesNotMatch(env, /mongodb\+srv:\/\/[^<\s]+:[^<\s]+@/);
  for (const file of ["README.md", "FEATURE_INVENTORY.md", "MERGE_PLAN.md", "MIGRATION_GUIDE.md", "DEPLOYMENT_GUIDE.md", "SECURITY_CHECKLIST.md", "TEST_REPORT.md"]) assert.ok(exists(file), `${file} should exist`);
});

test("payments and additional roles are explicitly disabled until verified", () => {
  assert.match(read("lib/billing-status.ts"), /checkoutEnabled: false/);
  assert.match(read("app/admin/billing/page.tsx"), /Checkout is not active/);
  assert.ok(read("PAYMENTS_INTEGRATION.md").includes("does **not** expose checkout"));
  assert.match(read("app/admin/roles/page.tsx"), /Single-admin mode/);
  assert.match(read("ROLE_MODEL.md"), /Not enabled/);
});

test("NS brand assets, icons and social preview are available", () => {
  for (const file of ["public/brand/ns-monogram.svg", "public/brand/ns-monogram-dark.svg", "public/brand/ns-logo-original.png", "public/brand/social-preview.svg", "public/brand/social-preview.png", "public/favicon.svg", "public/favicon.ico", "public/site.webmanifest"]) assert.ok(exists(file), `${file} should exist`);
  assert.match(read("public/site.webmanifest"), /NS Engineering Studio/);
  const png = fs.readFileSync("public/brand/social-preview.png");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
