import assert from "node:assert/strict";
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
