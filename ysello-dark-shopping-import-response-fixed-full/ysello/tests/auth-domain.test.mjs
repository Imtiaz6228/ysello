import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("the Ysello custom domain is trusted by the authentication API", async () => {
  const [config, api] = await Promise.all([
    read("src/config/env.ts"),
    read("src/api-app.ts"),
  ]);

  assert.match(config, /CANONICAL_APP_ORIGIN = "https:\/\/ysello\.com"/);
  assert.match(config, /"https:\/\/www\.ysello\.com"/);
  assert.match(api, /\.\.\.TRUSTED_APP_ORIGINS/);
  assert.match(api, /CORS_ORIGIN_DENIED/);
});

test("production public URLs are normalized before strict HTTPS validation", () => {
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
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "ysello.com",
        API_URL: "http://api.ysello.com",
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

test("the Railway start command repairs insecure public URLs before server import", () => {
  const result = spawnSync(process.execPath, ["scripts/start-production.mjs"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_URL: "http://ysello.com",
      API_URL: "http://api.ysello.com",
      STARTUP_PREFLIGHT_ONLY: "1",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    app: "https://ysello.com",
    api: "https://api.ysello.com",
  });
});

test("registration creates an active session without SMTP", async () => {
  const [routes, service, env] = await Promise.all([
    read("src/routes/auth.routes.ts"),
    read("src/services/auth.service.ts"),
    read("src/config/env.ts"),
  ]);

  assert.match(routes, /const user = await registerUser/);
  assert.match(routes, /const session = await createSession/);
  assert.match(service, /emailVerifiedAt: new Date\(\)/);
  assert.match(env, /SMTP_HOST:[\s\S]*?\.optional\(\)/);
});

test("source and deployment text contain no legacy brand name", async () => {
  const forbidden = ["h", "sello"].join("");
  const roots = [
    ".dockerignore",
    ".env.example",
    ".env.railway.example",
    ".env.vercel.example",
    ".github",
    "README.md",
    "SEO_DEPLOYMENT.md",
    "index.html",
    "package.json",
    "package-lock.json",
    "prisma",
    "public/site.webmanifest",
    "scripts",
    "src",
    "tests",
    "vercel.json",
    "vite.config.ts",
  ];
  const legacyPattern = new RegExp(forbidden, "i");

  async function inspect(relative) {
    const absolute = new URL(`../${relative}`, import.meta.url);
    const stats = await import("node:fs/promises").then(({ stat }) =>
      stat(absolute),
    );
    if (stats.isDirectory()) {
      for (const entry of await readdir(absolute, { withFileTypes: true })) {
        await inspect(path.posix.join(relative, entry.name));
      }
      return;
    }
    if (
      !/\.(?:css|html|js|json|md|mjs|prisma|sh|sql|ts|tsx|txt|yml)$/.test(
        relative,
      ) &&
      !relative.startsWith(".env") &&
      relative !== ".dockerignore"
    )
      return;
    const content = await readFile(absolute, "utf8");
    assert.doesNotMatch(content, legacyPattern, relative);
  }

  for (const root of roots) await inspect(root);
});
