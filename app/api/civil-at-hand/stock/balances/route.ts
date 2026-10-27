import { adminHandler, json } from "@/modules/civil-at-hand/lib/api-helpers";
import { averageRates, stockBalanceRows } from "@/modules/civil-at-hand/lib/stock-server";

export const runtime = "nodejs";

export const GET = adminHandler("Stock balance error", async () => {
  const [balances, rates] = await Promise.all([stockBalanceRows(), averageRates()]);
  return json({ balances, averageRates: Object.fromEntries(rates) });
});
