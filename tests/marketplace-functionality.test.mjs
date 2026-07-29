import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin-created catalog items are persisted and presented as official", () => {
  const schema = read("prisma/schema.prisma");
  const adminRoutes = read("src/routes/admin.routes.ts");
  const marketplace = read("src/commerce/useMarketplace.ts");

  assert.match(schema, /isOfficial\s+Boolean\s+@default\(false\)/);
  assert.match(adminRoutes, /isOfficial:\s*true/);
  assert.match(
    adminRoutes,
    /uniqueProductSlug\(`\$\{input\.name\} \$\{category\.slug\}`\)/,
  );
  assert.match(marketplace, /product\.isOfficial[\s\S]*"Ysello Official"/);
});

test("the floating support chat reaches the admin inbox for guests and members", () => {
  const schema = read("prisma/schema.prisma");
  const routes = read("src/routes/nexus.routes.ts");
  const widget = read("src/components/SupportWidgetPro.tsx");
  const admin = read("src/pages/OperationsAdminPage.tsx");

  assert.match(schema, /userId\s+String\?/);
  assert.match(schema, /guestTokenHash\s+String\?\s+@unique/);
  assert.ok(
    routes.indexOf('"/chat/guest"') <
      routes.indexOf("nexusRouter.use(requireAuth)"),
  );
  assert.match(widget, /\/api\/nexus\/chat\/guest/);
  assert.match(widget, /\/api\/nexus\/chat\/human/);
  assert.match(widget, /x-guest-chat-token/);
  assert.match(admin, /session\.user\?/);
});

test("top-up requests preserve the buyer-paid blockchain fee quote", () => {
  const schema = read("prisma/schema.prisma");
  const service = read("src/services/topup.service.ts");
  const wallet = read("src/pages/AccountDashboardPage.tsx");

  assert.match(schema, /networkFeeCents\s+Int\s+@default\(0\)/);
  assert.match(schema, /totalPayableCents\s+Int\s+@default\(0\)/);
  assert.match(service, /totalPayableCents = amountCents \+ networkFeeCents/);
  assert.match(service, /fee is paid separately by the buyer/);
  assert.match(wallet, /Estimated buyer cost/);
});

test("buyer and seller order chat is available before the first message", () => {
  const commerce = read("src/routes/commerce.routes.ts");
  const seller = read("src/routes/seller.routes.ts");

  const chatList = commerce.slice(
    commerce.indexOf('"/chats"'),
    commerce.indexOf('"/orders"', commerce.indexOf('"/chats"')),
  );
  assert.doesNotMatch(chatList, /messages:\s*\{\s*some:/);
  assert.match(
    commerce,
    /prisma\.order\.update\(\{[\s\S]*where:\s*\{\s*id:\s*orderId\s*\}[\s\S]*updatedAt:\s*new Date\(\)/,
  );
  assert.match(seller, /orderBy:\s*\{\s*order:\s*\{\s*updatedAt:\s*"desc"/);
});
