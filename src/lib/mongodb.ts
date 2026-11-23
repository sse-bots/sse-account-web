import { MongoClient, MongoClientOptions, Db, Document, ObjectId } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017").trim();
const dbName = (process.env.MONGODB_DB_NAME || "sse_accounts").trim();

declare global {
  // eslint-disable-next-line no-var
  var _sseAccountsMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _sseAccountsMongoConnectPromise: Promise<MongoClient> | undefined;
}

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 15_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
  appName: "SSE-Accounts-SSO",
};

function createClient(): MongoClient {
  const client = new MongoClient(uri, options);
  attachDatabasePool(client);
  return client;
}

export const mongoClient: MongoClient =
  globalThis._sseAccountsMongoClient ??
  (globalThis._sseAccountsMongoClient = createClient());

export async function getMongoClient(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.trim()) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }
  if (!globalThis._sseAccountsMongoConnectPromise) {
    globalThis._sseAccountsMongoConnectPromise = mongoClient
      .connect()
      .catch((err) => {
        globalThis._sseAccountsMongoConnectPromise = undefined;
        throw err;
      });
  }
  return globalThis._sseAccountsMongoConnectPromise;
}

export function getDbSync(): Db {
  return mongoClient.db(dbName);
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}

export function userIdFilter(
  ...rawIds: Array<string | ObjectId | null | undefined>
): { $in: Array<string | ObjectId> } {
  const seen = new Set<string>();
  const values: Array<string | ObjectId> = [];

  for (const raw of rawIds) {
    if (!raw) continue;
    const str =
      typeof raw === "string"
        ? raw.trim()
        : typeof raw.toHexString === "function"
          ? raw.toHexString()
          : String(raw);
    if (!str) continue;
    if (!seen.has(`s:${str}`)) {
      seen.add(`s:${str}`);
      values.push(str);
    }
    if (ObjectId.isValid(str) && !seen.has(`o:${str}`)) {
      seen.add(`o:${str}`);
      values.push(new ObjectId(str));
    }
  }
  return { $in: values };
}

export function userDocMatch(userId: string) {
  return {
    $or: [{ _id: userIdFilter(userId) }, { id: userId }],
  };
}

export async function getAuthCollections() {
  const db = await getDb();
  return {
    db,
    users: db.collection<Document>("user"),
    accounts: db.collection<Document>("account"),
    sessions: db.collection<Document>("session"),
    twoFactors: db.collection<Document>("twoFactor"),
    oauthClients: db.collection<Document>("oauthClient"),
    oauthConsents: db.collection<Document>("oauthConsent"),
    oauthAccessTokens: db.collection<Document>("oauthAccessToken"),
    oauthRefreshTokens: db.collection<Document>("oauthRefreshToken"),
    roles: db.collection<Document>("roles"),
    badges: db.collection<Document>("badges"),
    securityLogs: db.collection<Document>("security_logs"),
  };
}

export async function logSecurityEvent(event: {
  userId: string;
  action: string;
  title: string;
  detail?: string;
  status?: "info" | "success" | "warning";
}): Promise<void> {
  try {
    const { securityLogs } = await getAuthCollections();
    await securityLogs.insertOne({
      userId: event.userId,
      action: event.action,
      title: event.title,
      detail: event.detail || "",
      status: event.status || "info",
      createdAt: new Date(),
    });
  } catch {
    // non-fatal telemetry
  }
}

export function serializeDoc<T extends Record<string, unknown>>(doc: T): T {
  return JSON.parse(
    JSON.stringify(doc, (_key, value) => {
      if (
        value &&
        typeof value === "object" &&
        typeof value.toHexString === "function"
      ) {
        return value.toHexString();
      }
      return value;
    })
  );
}
