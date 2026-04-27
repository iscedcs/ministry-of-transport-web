/**
 * Prisma Config — Prisma ORM v7
 * Reference: https://pris.ly/d/config-datasource
 *
 * In Prisma 7, the database URL moves here (out of schema.prisma).
 * The PrismaClient uses @prisma/adapter-neon at runtime (see lib/db.ts).
 *
 * Environment variables:
 *   DATABASE_URL — Neon PostgreSQL connection string
 *   (place in .env for CLI commands, or .env.local for Next.js-only)
 */

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Use process.env directly (not env() helper) so `prisma generate`
    // doesn't fail in CI when DATABASE_URL isn't set
    url: process.env.DATABASE_URL ?? "",
  },
});
