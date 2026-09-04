import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = new URL("..", import.meta.url);

test("Dark Shopping configuration accepts an undocumented short key without exposing it", () => {
  const secret = "short-key";
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      'const { darkShoppingConfiguration } = await import("./src/services/dark-shopping.service.ts"); console.log(JSON.stringify(darkShoppingConfiguration()));',
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "http://localhost:5173",
        API_URL: "http://localhost:4000",
        JWT_SECRET: "j".repeat(40),
        CSRF_SECRET: "c".repeat(40),
        DARK_SHOPPING_API_KEY: secret,
        RAILWAY_PROJECT_NAME: "Ysello",
        RAILWAY_SERVICE_NAME: "api",
        RAILWAY_ENVIRONMENT_NAME: "production",
        RAILWAY_GIT_REPO_OWNER: "Imtiaz6228",
        RAILWAY_GIT_REPO_NAME: "ysello",
        RAILWAY_GIT_BRANCH: "main",
        RAILWAY_GIT_COMMIT_SHA: "1a60881cb1ca87ccb1c895857d2114b862be3193",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes(secret), false);

  const configuration = JSON.parse(result.stdout.trim());
  assert.equal(configuration.configured, true);
  assert.equal(configuration.configurationIssue, null);
  assert.deepEqual(configuration.deployment, {
    project: "Ysello",
    service: "api",
    environment: "production",
    repository: "Imtiaz6228/ysello",
    branch: "main",
    commit: "1a60881cb1ca",
    expectedRepository: "Imtiaz6228/ysello",
    expectedBranch: "main",
    sourceMatchesExpectedRepository: true,
  });
});

test("Dark Shopping configuration reports a mismatched Railway source safely", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      'const { darkShoppingConfiguration } = await import("./src/services/dark-shopping.service.ts"); console.log(JSON.stringify(darkShoppingConfiguration()));',
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "http://localhost:5173",
        API_URL: "http://localhost:4000",
        JWT_SECRET: "j".repeat(40),
        CSRF_SECRET: "c".repeat(40),
        DARK_SHOPPING_API_KEY: "",
        RAILWAY_GIT_REPO_OWNER: "Imtiaz6228",
        RAILWAY_GIT_REPO_NAME: "wrong-marketplace",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const configuration = JSON.parse(result.stdout.trim());
  assert.equal(configuration.configured, false);
  assert.match(
    configuration.configurationIssue,
    /missing from this API process/,
  );
  assert.equal(
    configuration.deployment.repository,
    "Imtiaz6228/wrong-marketplace",
  );
  assert.equal(configuration.deployment.sourceMatchesExpectedRepository, false);
});
