import { MongoClient } from "mongodb";
import { STARTER_FAQS, STARTER_SERVICES } from "../lib/brand.ts";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "ns_studio";
if (!uri) {
  console.error("MONGODB_URI is required. No starter content was written.");
  process.exit(1);
}

const client = new MongoClient(uri, { maxPoolSize: 3, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, appName: "ns-studio-seed" });
try {
  await client.connect();
  const collection = client.db(dbName).collection("content");
  const now = new Date();
  let inserted = 0;
  for (const [type, items] of [["services", STARTER_SERVICES], ["faqs", STARTER_FAQS]] as const) {
    for (const item of items) {
      const result = await collection.updateOne({ _id: item.slug, type }, { $setOnInsert: { ...item, _id: item.slug, type, isStarter: true, deleted: false, createdAt: now, updatedAt: now } }, { upsert: true });
      if (result.upsertedCount) inserted += 1;
    }
  }
  console.log(`Seed complete. ${inserted} starter content record(s) inserted; existing records were not overwritten.`);
  console.log("These records are illustrative starter content, not customer evidence. Review and replace them in Admin before launch.");
} catch {
  console.error("Seed failed. Check database connectivity and credentials; no connection details were printed.");
  process.exitCode = 1;
} finally {
  await client.close();
}
