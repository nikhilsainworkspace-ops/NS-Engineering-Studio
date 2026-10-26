import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

test("project manifest pins the required application stack", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const name of ["next", "react", "react-dom", "mongodb", "zod", "argon2", "lucide-react"]) assert.ok(pkg.dependencies[name], `missing dependency ${name}`);
  for (const name of ["build", "lint", "typecheck", "test", "test:e2e", "admin:hash", "seed"]) assert.ok(pkg.scripts[name], `missing script ${name}`);
  assert.equal(pkg.private, true);
});

test("public, admin, API, docs, and core configuration files exist", () => {
  for (const file of [
    "app/layout.tsx", "app/(site)/page.tsx", "app/(site)/about/page.tsx", "app/(site)/services/page.tsx",
    "app/(site)/services/[slug]/page.tsx", "app/(site)/contact/page.tsx", "app/(site)/faq/page.tsx", "app/(site)/process/page.tsx", "app/(site)/products/page.tsx",
    "app/(site)/privacy/page.tsx", "app/(site)/terms/page.tsx", "app/admin/page.tsx", "app/admin/login/page.tsx",
    "app/api/contact/route.ts", "app/api/auth/login/route.ts", "app/api/auth/logout/route.ts",
    "app/api/admin/overview/route.ts", "app/api/admin/leads/route.ts", "app/api/admin/settings/route.ts",
    "lib/db.ts", "lib/auth.ts", "lib/validation.ts", "README.md", ".env.example", ".gitignore",
    "public/brand/ns-logo-original.png", "public/brand/social-preview.png", "public/site.webmanifest"
  ]) assert.ok(exists(file), `missing required file ${file}`);
});

test("safe repository packaging excludes local environment and generated directories", () => {
  assert.ok(exists(".env.example"));
  assert.equal(exists(".env.local"), false);
  assert.equal(exists("node_modules"), false);
  assert.equal(exists(".next"), false);
  const env = read(".env.example");
  assert.match(env, /ADMIN_PASSWORD_HASH=<argon2id-hash-generated-locally>/);
  assert.doesNotMatch(env, /re_[A-Za-z0-9]{20,}/);
});


test("civil engineering product pages and navigation are connected", () => {
  const home = read("app/(site)/page.tsx");
  const header = read("components/SiteHeader.tsx");
  const sitemap = read("app/sitemap.ts");
  const products = read("app/(site)/products/page.tsx");
  const brand = read("lib/brand.ts");
  assert.match(home, /CivilMargin/);
  assert.match(home, /Civil At Hand/);
  assert.match(brand, /https:\/\/civilmarzin\.civilathand\.in\//);
  assert.match(brand, /https:\/\/civilathand\.in\//);
  assert.match(home, /capability-section/);
  assert.match(products, /name: "CivilMargin"/);
  assert.match(products, /name: "Civil At Hand"/);
  assert.match(products, /Visit \{product\.name\}/);
  assert.match(header, /href: "\/products"/);
  assert.match(sitemap, /"\/products"/);
});

test("project intake selections persist through the protected inquiry API", () => {
  const form = read("components/ContactForm.tsx");
  const schema = read("lib/validation.ts");
  const submit = read("app/api/contact/route.ts");
  const inbox = read("app/api/admin/leads/route.ts");
  const dashboard = read("components/AdminDashboard.tsx");
  for (const name of ["projectType", "timeline"]) {
    assert.match(form, new RegExp(`name="${name}"`));
    assert.match(schema, new RegExp(`${name}: z\.enum`));
    assert.match(submit, new RegExp(`${name}: parsed\.data\.${name}`));
    assert.match(inbox, new RegExp(`${name}: lead\.${name}`));
    assert.match(dashboard, new RegExp(`lead\.${name}`));
  }
});

test("no placeholder hash links are shipped in JSX/TSX source", () => {
  const files = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(rel);
      else if (/\.(tsx|ts)$/.test(entry.name)) files.push(rel);
    }
  }
  visit("app"); visit("components");
  for (const file of files) assert.doesNotMatch(read(file), /href\s*=\s*["']#["']/i, `${file} contains a dead anchor`);
});

test("favicon assets have the expected raster dimensions", () => {
  const pngSize = (file) => {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(bytes.readUInt32BE(0), 0x89504e47, `${file} is not a PNG`);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };
  assert.deepEqual(pngSize("public/favicon-16x16.png"), [16, 16]);
  assert.deepEqual(pngSize("public/favicon-32x32.png"), [32, 32]);
  assert.deepEqual(pngSize("public/apple-touch-icon.png"), [180, 180]);
  assert.deepEqual(pngSize("public/android-chrome-192x192.png"), [192, 192]);
  assert.deepEqual(pngSize("public/android-chrome-512x512.png"), [512, 512]);
});
