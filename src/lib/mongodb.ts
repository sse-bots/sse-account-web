import { MongoClient, MongoClientOptions, Db, Document, ObjectId } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB_NAME || "sse_accounts";

declare global {
  // eslint-disable-next-line no-var
  var _sseAccountsMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _sseAccountsMongoConnectPromise: Promise<MongoClient> | undefined;
}

const options: MongoClientOptions = {
  maxPoolSize: 5,
  maxIdleTimeMS: 5000,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
  appName: "SSE-Accounts-SSO",
};

function createClient(): MongoClient {
  const client = new MongoClient(uri, options);
  attachDatabasePool(client);
  return client;
}

export const mongoClient: MongoClient =
  globalThis._sseAccountsMongoClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis._sseAccountsMongoClient = mongoClient;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables.");
  }
  if (!globalThis._sseAccountsMongoConnectPromise) {
    globalThis._sseAccountsMongoConnectPromise = mongoClient.connect();
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

export function userIdFilter(userId: string): { $in: Array<string | ObjectId> } {
  const values: Array<string | ObjectId> = [userId];
  if (ObjectId.isValid(userId)) {
    values.push(new ObjectId(userId));
  }
  return { $in: values };
}

export async function getAuthCollections() {
  const db = await getDb();
  return {
    db,
    users: db.collection<Document>("user"),
    accounts: db.collection<Document>("account"),
    sessions: db.collection<Document>("session"),
    oauthClients: db.collection<Document>("oauthClient"),
    oauthConsents: db.collection<Document>("oauthConsent"),
  };
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
