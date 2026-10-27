import { adminHandler, json, readJson } from "@/modules/civil-at-hand/lib/api-helpers";
import { audit } from "@/modules/civil-at-hand/lib/audit";
import { getSettings, saveSettings } from "@/modules/civil-at-hand/lib/server-settings";
import { normalizeSettingsInput } from "@/modules/civil-at-hand/lib/settings";

export const runtime = "nodejs";

export const GET = adminHandler("Settings load error", async () => json({ settings: await getSettings() }));

export const PUT = adminHandler("Settings save error", async (request: Request) => {
  const payload = await readJson(request);
  const current = await getSettings();
  const settings = await saveSettings(normalizeSettingsInput(payload, current));
  await audit(request, "settings-updated", Object.keys(payload).slice(0, 12).join(", "));
  return json({ settings });
});
