/**
 * Prisma Client Singleton — Prisma ORM v7 + Neon Serverless
 * Reference: docs/IMPLEMENTATION_PLAN.md (STORY-005)
 *
 * Prisma 7 requires a driver adapter — the client no longer reads DATABASE_URL
 * from the schema. We use @prisma/adapter-neon for Neon PostgreSQL.
 *
 * Prevents multiple instances during Next.js hot reloads via globalThis cache.
 * Use this `db` export everywhere, never instantiate PrismaClient directly.
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
  // PrismaNeon accepts a PoolConfig; do not pre-create the Pool.
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
