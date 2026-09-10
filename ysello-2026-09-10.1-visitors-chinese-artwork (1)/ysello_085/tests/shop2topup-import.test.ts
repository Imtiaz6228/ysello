import test from "node:test";
import assert from "node:assert/strict";
import { Shop2TopupClient } from "../src/services/shop2topup.client.js";
import { importInBatches } from "../src/commerce/import-batches.js";
import { issueVisitorSession, validVisitorSession } from "../src/services/visitor-session.js";
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

test("documented supplier catalog responses load and repeated reads share requests", async () => {
  let calls = 0;
  const client = new Shop2TopupClient({ apiKey: "test-only", fetchImplementation: async (_url, options) => {
    calls++;
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-only");
    return reply({ success: true, categories: [{ id: 12, name: "Free Fire", big_category_id: 1, big_category_name: "Mobile Games" }] });
  } });
  const [a, b] = await Promise.all([client.listCategories(), client.listCategories()]);
  assert.equal(a[0].id, 12);
  assert.deepEqual(a, b);
  await client.listCategories();
  assert.equal(calls, 1);
});
test("empty image-enabled catalog retries the documented basic catalog", async () => {
  const urls: string[] = [];
  const client = new Shop2TopupClient({ apiKey: "test-only", fetchImplementation: async (url) => {
    urls.push(String(url));
    return reply({ success: true, big_categories: String(url).includes("for_ui=true") ? [] : [{ id: 1, name: "Games" }] });
  } });
  assert.equal((await client.listBigCategories()).length, 1);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /for_ui=false/);
});
test("malformed results cannot masquerade as an empty catalog", async () => {
  for (const body of [null, {}, { success: true }, { success: true, categories: {} }]) {
    const client = new Shop2TopupClient({ apiKey: "test-only", fetchImplementation: async () => reply(body) });
    await assert.rejects(client.listCategories(), (error: any) => error.code === "SHOP2TOPUP_RESPONSE_INVALID");
  }
});
test("supplier disabled errors retain actionable code and do not trigger fallback", async () => {
  let calls = 0;
  const client = new Shop2TopupClient({ apiKey: "test-only", fetchImplementation: async () => {
    calls++;
    return reply({ success: false, error: { code: "ACCOUNT_DISABLED", message: "Contact supplier to enable account" } }, 403);
  } });
  await assert.rejects(client.listBigCategories(), (error: any) => error.code === "ACCOUNT_DISABLED" && error.statusCode === 403);
  assert.equal(calls, 1);
});
test("numeric string item IDs normalize and other-category products are excluded", async () => {
  const item = { item_id: "999", name: "100 Diamonds", category_id: "12", category_name: "Free Fire", price: 0.99 };
  const client = new Shop2TopupClient({ apiKey: "test-only", fetchImplementation: async () => reply({ success: true, subcategories: [item, { ...item, item_id: 1000, category_id: 13 }] }) });
  assert.deepEqual((await client.listSubcategories(12)).map((i) => [i.item_id, i.price]), [[999, "0.99"]]);
});
test("120 selected products import in bounded batches without losing results", async () => {
  const sizes: number[] = [];
  const result = await importInBatches(Array.from({ length: 120 }, (_, i) => i + 1), async (batch) => {
    sizes.push(batch.length);
    return { imported: batch.map((remoteItemId) => ({ remoteItemId })), skipped: [] };
  }, () => {});
  assert.deepEqual(sizes, [50, 50, 20]);
  assert.equal(result.imported.length, 120);
  assert.deepEqual(result.remaining, []);
});
test("partial batch failure retains only unsuccessful IDs for retry", async () => {
  const result = await importInBatches(Array.from({ length: 70 }, (_, i) => i + 1), async (batch) => {
    if (batch[0] > 50) throw new Error("Supplier unavailable");
    return { imported: batch.slice(1).map((remoteItemId) => ({ remoteItemId })), skipped: [{ remoteItemId: 1, reason: "Invalid price" }] };
  }, () => {});
  assert.equal(result.imported.length, 49);
  assert.equal(result.remaining.length, 21);
  assert.equal(result.remaining[0], 1);
  assert.equal(result.error, "Supplier unavailable");
});
test("visitor sessions reject forged dwell times, tampering, changed clients and expired tokens", () => {
  const now = 1788940000000;
  const token = issueVisitorSession("visitor", "secret", now);
  assert.equal(validVisitorSession(token, "visitor", "secret", now + 1000), false);
  assert.equal(validVisitorSession(token, "visitor", "secret", now + 35000), true);
  assert.equal(validVisitorSession(token, "another-client", "secret", now + 35000), false);
  assert.equal(validVisitorSession(token.replace(/^\d/, "9"), "visitor", "secret", now + 35000), false);
  assert.equal(validVisitorSession(token, "visitor", "secret", now + 3 * 60 * 60_000), false);
});
