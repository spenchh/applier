import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/**
 * Creates a fresh isolated test database before the suite runs.
 *
 * We delete the throwaway file first and then run a plain (non-destructive)
 * `prisma db push`, which creates the schema from scratch on a fresh file. This
 * avoids `--force-reset` (a destructive op) entirely. The DB lives in /tmp and
 * is never a production database.
 */
export default function setup() {
  const DATABASE_URL = "file:/tmp/internpilot-test.db";
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`/tmp/internpilot-test.db${suffix}`, { force: true });
  }
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL },
    stdio: "ignore",
  });
}
