import "server-only";
import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { requireDatabaseEnv } from "@/lib/env";

type MongoCache = { client: MongoClient | null; promise: Promise<MongoClient> | null };
declare global { var _nsMongoCache: MongoCache | undefined; }

const cache: MongoCache = global._nsMongoCache ?? { client: null, promise: null };
if (process.env.NODE_ENV !== "production") global._nsMongoCache = cache;

export async function getDb(): Promise<Db> {
  const { uri, dbName } = requireDatabaseEnv();
  if (cache.client) return cache.client.db(dbName);
  if (!cache.promise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
      appName: "ns-studio-website"
    });
    cache.promise = client.connect().then(async (connected) => {
      cache.client = connected;
      const database = connected.db(dbName);
      await Promise.all([
        database.collection("leads").createIndex({ createdAt: -1 }),
        database.collection("leads").createIndex({ status: 1, createdAt: -1 }),
        database.collection("leads").createIndex({ requestKey: 1 }, { unique: true, sparse: true }),
        database.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        database.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
        database.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        database.collection("content").createIndex({ type: 1, published: 1, sortOrder: 1 }),
        database.collection("auditEvents").createIndex({ createdAt: -1 }),
        database.collection("auditEvents").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      ]);
      return connected;
    }).catch((error: unknown) => {
      cache.promise = null;
      throw error;
    });
  }
  const client = await cache.promise;
  return client.db(dbName);
}

export async function getCollection<T extends Document>(name: string): Promise<Collection<T>> {
  const database = await getDb();
  return database.collection<T>(name);
}

export function databaseIsConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
