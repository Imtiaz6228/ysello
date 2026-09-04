import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("Google OAuth uses the registered callback and server-side code exchange", async () => {
  const [service, routes, apiApp, button, vercel] = await Promise.all([
    read("src/services/google-auth.service.ts"),
    read("src/routes/auth.routes.ts"),
    read("src/api-app.ts"),
    read("src/components/GoogleAuthButton.tsx"),
    read("vercel.json").then(JSON.parse),
  ]);

  assert.match(service, /code_challenge_method: "S256"/);
  assert.match(service, /openidconnect\.googleapis\.com\/v1\/userinfo/);
  assert.match(service, /email_verified/);
  assert.match(
    service,
    /new URL\("\/auth\/google\/callback", env\.API_URL\)\.toString\(\)/,
  );
  assert.match(routes, /getGoogleOAuthCookie/);
  assert.match(routes, /setAuthCookies/);
  assert.match(routes, /GOOGLE_OAUTH_NOT_CONFIGURED/);
  assert.match(routes, /googleAuthPage\(input\.intent, "unavailable"\)/);
  assert.match(apiApp, /app\.get\("\/auth\/google\/callback"/);
  assert.match(apiApp, /new URL\("\/google-callback\.php", env\.APP_URL\)/);
  assert.match(button, /import\.meta\.env\.VITE_SITE_URL/);
  assert.ok(
    vercel.rewrites.some(
      (rule) =>
        rule.source === "/google-callback.php" &&
        rule.destination === "https://api.ysello.com/api/auth/google/callback",
    ),
  );
});

test("Google identities are unique and passwordless users remain supported", async () => {
  const [schema, migration, authService] = await Promise.all([
    read("prisma/schema.prisma"),
    read("prisma/migrations/202608030001_google_oauth/migration.sql"),
    read("src/services/auth.service.ts"),
  ]);

  assert.match(schema, /model ExternalAuthAccount/);
  assert.match(schema, /@@unique\(\[provider, providerAccountId\]\)/);
  assert.match(schema, /passwordHash\s+String\?/);
  assert.match(migration, /ALTER COLUMN "passwordHash" DROP NOT NULL/);
  assert.match(authService, /!user\.passwordHash/);
});

test("Google OAuth trims copied Railway values before building the request", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `const { createGoogleOAuthFlow } = await import("./src/services/google-auth.service.ts");
       const authorizationUrl = new URL(createGoogleOAuthFlow({ intent: "signin" }).authorizationUrl);
       console.log(JSON.stringify({
         clientId: authorizationUrl.searchParams.get("client_id"),
         redirectUri: authorizationUrl.searchParams.get("redirect_uri"),
         containsEncodedNewline: authorizationUrl.toString().includes("%0A"),
       }));`,
    ],
    {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/ysello",
        APP_URL: "https://ysello.com",
        API_URL: "https://api.ysello.com",
        JWT_SECRET: "j".repeat(40),
        CSRF_SECRET: "c".repeat(40),
        GOOGLE_CLIENT_ID:
          "123456789012-testclient.apps.googleusercontent.com\n",
        GOOGLE_CLIENT_SECRET: "test-client-secret-value\n",
        GOOGLE_REDIRECT_URI: "https://api.ysello.com/auth/google/callback\n",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()), {
    clientId: "123456789012-testclient.apps.googleusercontent.com",
    redirectUri: "https://api.ysello.com/auth/google/callback",
    containsEncodedNewline: false,
  });
});

test("examples document Google credentials without embedding a secret", async () => {
  const [environment, railway] = await Promise.all([
    read(".env.example"),
    read(".env.railway.example"),
  ]);

  assert.match(
    environment,
    /GOOGLE_REDIRECT_URI=http:\/\/localhost:4000\/auth\/google\/callback/,
  );
  assert.match(
    railway,
    /GOOGLE_REDIRECT_URI=https:\/\/api\.ysello\.com\/auth\/google\/callback/,
  );
  assert.match(railway, /GOOGLE_CLIENT_SECRET=\s*$/m);
  assert.doesNotMatch(`${environment}\n${railway}`, /GOCSPX-[A-Za-z0-9_-]+/);
});
