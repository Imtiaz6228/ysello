import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const migrationName = "202607180001_commission_transaction_idempotency";
const prisma = new PrismaClient();

let failedMigration;
try {
  const [migrationTable] = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('"public"."_prisma_migrations"')::text AS "tableName"`,
  );

  if (migrationTable?.tableName) {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT "migration_name"
         FROM "_prisma_migrations"
        WHERE "migration_name" = $1
          AND "finished_at" IS NULL
          AND "rolled_back_at" IS NULL
        ORDER BY "started_at" DESC
        LIMIT 1`,
      migrationName,
    );
    failedMigration = rows[0];
  }
} finally {
  await prisma.$disconnect();
}

if (!failedMigration) {
  console.log("No known failed Prisma migration needs recovery.");
  process.exit(0);
}

console.log(`Marking ${migrationName} as rolled back before its safe retry.`);

const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [prismaCli, "migrate", "resolve", "--rolled-back", migrationName],
  { env: process.env, stdio: "inherit" },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
