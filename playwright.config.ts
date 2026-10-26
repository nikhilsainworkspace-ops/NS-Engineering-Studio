import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000", NEXT_PUBLIC_SITE_NAME: "NS Engineering Studio", NEXT_PUBLIC_CONTACT_PHONE: "7703977002" }
  }
});
