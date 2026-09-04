import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const failedMigrationName = "202607180001_commission_transaction_idempotency";

test("Railway safely recovers and retries the known failed migration", async () => {
  const [packageJson, railwayJson, recoveryScript, migrationSql] =
    await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8").then(
        JSON.parse,
      ),
      readFile(new URL("../railway.json", import.meta.url), "utf8").then(
        JSON.parse,
      ),
      readFile(
        new URL("../scripts/recover-failed-migration.mjs", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          `../prisma/migrations/${failedMigrationName}/migration.sql`,
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.equal(
    packageJson.scripts["prisma:migrate:recover"],
    "node scripts/recover-failed-migration.mjs",
  );
  assert.equal(
    railwayJson.deploy.preDeployCommand,
    "npm run prisma:migrate:recover && npm run prisma:migrate",
  );
  assert.match(recoveryScript, new RegExp(failedMigrationName));
  assert.match(recoveryScript, /--rolled-back/);
  assert.match(migrationSql, /CREATE TABLE IF NOT EXISTS "AdminTransaction"/);
  assert.match(
    migrationSql,
    /CREATE UNIQUE INDEX IF NOT EXISTS "AdminTransaction_type_reference_key"/,
  );
});

test("all Prisma models missing from the old history now have migrations", async () => {
  const migrationSql = await readFile(
    new URL(
      "../prisma/migrations/202607190001_operational_admin_tables/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );

  for (const table of [
    "KbArticle",
    "LiveSession",
    "LiveSessionEvent",
    "ChatSession",
    "ChatMessage",
    "AdminWallet",
  ]) {
    assert.match(
      migrationSql,
      new RegExp(`CREATE TABLE IF NOT EXISTS "${table}"`),
    );
  }
});
