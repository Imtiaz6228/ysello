import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = new URL("..", import.meta.url);

test("production config recovers from a Railway TCP proxy API_URL", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      'const { env } = await import("./src/config/env.ts"); console.log(JSON.stringify({ app: env.APP_URL, api: env.API_URL }));',
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "ysello.com",
        API_URL: "tcp://api.proxy.rlwy.net:41234",
        RAILWAY_PUBLIC_DOMAIN: "ysello-production.up.railway.app",
        JWT_SECRET: "j".repeat(40),
        CSRF_SECRET: "c".repeat(40),
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    app: "https://ysello.com",
    api: "https://ysello-production.up.railway.app",
  });
});

test("production config uses the canonical API fallback without a Railway domain", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      'const { env } = await import("./src/config/env.ts"); console.log(JSON.stringify({ app: env.APP_URL, api: env.API_URL }));',
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "https://ysello.com",
        API_URL: "tcp://api.proxy.rlwy.net:41234",
        RAILWAY_PUBLIC_DOMAIN: "",
        JWT_SECRET: "j".repeat(40),
        CSRF_SECRET: "c".repeat(40),
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    app: "https://ysello.com",
    api: "https://api.ysello.com",
  });
});
