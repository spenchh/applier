import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";

let readyPromise: Promise<void> | null = null;

export function ensureDatabaseReady() {
  if (!readyPromise) {
    readyPromise = initializeSqliteSchema();
  }
  return readyPromise;
}

async function initializeSqliteSchema() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.startsWith("file:")) return;

  const sqlPath = path.join(process.cwd(), "prisma", "init.sql");
  const sql = await fs.readFile(sqlPath, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  await ensureSqliteColumn("UserProfile", "userAccountId", "TEXT");
  await ensureSqliteColumn("JobPosting", "userAccountId", "TEXT");
}

async function ensureSqliteColumn(tableName: string, columnName: string, columnType: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
  if (columns.some((column) => column.name === columnName)) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${columnType}`);
}
