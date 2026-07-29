/**
 * Prisma Client Singleton — Prisma ORM v7 + Neon Serverless
 * Reference: docs/IMPLEMENTATION_PLAN.md (STORY-005)
 *
 * Prisma 7 requires a driver adapter — the client no longer reads DATABASE_URL
 * from the schema. We use @prisma/adapter-neon for Neon PostgreSQL.
 *
 * Prevents multiple instances during Next.js hot reloads via globalThis cache.
 * Dynamically re-instantiates if schema models are updated during dev.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function getDb(): PrismaClient {
  if (process.env.NODE_ENV !== "production") {
    if (!globalForPrisma.prisma || !("tracasVehicle" in globalForPrisma.prisma)) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    let client = getDb();
    let value = (client as any)[prop];

    // If property accessed on PrismaClient is undefined during hot reload, refresh client instance
    if (value === undefined && typeof prop === "string" && prop !== "then" && !prop.startsWith("$")) {
      globalForPrisma.prisma = createPrismaClient();
      client = globalForPrisma.prisma;
      value = (client as any)[prop];
    }

    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

