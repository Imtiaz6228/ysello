import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/middleware/error-handler.js";
import { DarkShoppingClient } from "../src/services/dark-shopping.client.js";

const fakeKey = "test-dark-shopping-key-never-use";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Dark Shopping catalog requests serialize documented filters and redact response links", async () => {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return jsonResponse({
        success: true,
        data: {
          items: [],
          _links: {
            self: {
              href: `https://dark.shopping/api/v1/product/list?key=${fakeKey}&page=1`,
            },
          },
          _meta: {
            totalCount: 0,
            pageCount: 0,
            currentPage: 1,
            perPage: 20,
          },
        },
      });
    },
  });

  const result = await client.listProducts({
    ids: [12, 34],
    onlyInStock: true,
    deliveryType: "auto",
    perPage: 20,
  });
  const body = JSON.parse(String(capturedInit?.body)) as Record<
    string,
    unknown
  >;

  assert.equal(capturedUrl?.pathname, "/api/v1/product/list");
  assert.equal(capturedUrl?.searchParams.has("key"), false);
  assert.equal(capturedUrl?.searchParams.get("_format"), "json");
  assert.deepEqual(body.ids, [12, 34]);
  assert.equal(body.only_in_stock, true);
  assert.equal(body.delivery_type, "auto");
  assert.equal(body["per-page"], 20);
  assert.equal(body.key, fakeKey);
  assert.equal(capturedInit?.method, "POST");
  assert.equal(
    new Headers(capturedInit?.headers).get("accept"),
    "application/json",
  );
  assert.equal(result._links?.self.href.includes(fakeKey), false);
  assert.equal(
    new URL(result._links?.self.href ?? "https://example.com").searchParams.has(
      "key",
    ),
    false,
  );
});

test("Dark Shopping purchases use the official GET transport and idempotency", async () => {
  let capturedUrl: URL | undefined;
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (input, init) => {
      capturedUrl = new URL(String(input));
      capturedInit = init;
      return jsonResponse({
        success: true,
        data: { status: "pending", id: 1458 },
      });
    },
  });

  const result = await client.createOrder({
    productId: 1542,
    quantity: 10,
    promoCode: "SAVE10",
    sendEmailCopy: true,
    idempotenceId: "ysello-order-item-123",
  });
  assert.equal(capturedUrl?.pathname, "/api/v1/order/create");
  assert.equal(capturedUrl?.searchParams.get("key"), fakeKey);
  assert.equal(capturedUrl?.searchParams.get("_format"), "json");
  assert.equal(capturedInit?.method, "GET");
  assert.equal(capturedInit?.body, undefined);
  assert.equal(capturedUrl?.searchParams.get("product"), "1542");
  assert.equal(capturedUrl?.searchParams.get("quantity"), "10");
  assert.equal(capturedUrl?.searchParams.get("promo_code"), "SAVE10");
  assert.equal(capturedUrl?.searchParams.get("send_email_copy"), "1");
  assert.equal(
    capturedUrl?.searchParams.get("idempotence_id"),
    "ysello-order-item-123",
  );
  assert.deepEqual(result, { status: "pending", id: 1458 });
});

test("Dark Shopping rejects non-official API origins before attaching credentials", () => {
  assert.throws(
    () =>
      new DarkShoppingClient({
        apiKey: fakeKey,
        baseUrl: "https://example.com/api/v1",
      }),
    /official https:\/\/dark\.shopping\/api\/v1 endpoint/,
  );
});

test("Dark Shopping product POST filters follow the documented nested form encoding", async () => {
  let capturedInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (_input, init) => {
      capturedInit = init;
      return jsonResponse({ success: true, data: { items: [] } });
    },
  });

  await client.listProducts({
    filterAttributes: [
      { id: 3, value: 2, filterType: "include" },
      { id: 6, value: false, filterType: "exclude" },
    ],
  });
  const body = JSON.parse(String(capturedInit?.body)) as {
    filter_attributes: Array<Record<string, unknown>>;
  };

  assert.deepEqual(body.filter_attributes, [
    { id: 3, value: 2, filter_type: "include" },
    { id: 6, value: false, filter_type: "exclude" },
  ]);
});

test("Dark Shopping API failures become sanitized application errors", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () =>
      jsonResponse(
        {
          success: false,
          data: {
            name: "Unauthorized",
            message: `Invalid key ${fakeKey}`,
            code: 0,
            status: 401,
          },
        },
        401,
      ),
  });

  await assert.rejects(client.getBalance(), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 401);
    assert.equal(error.code, "DARK_SHOPPING_API_ERROR");
    assert.equal(error.message.includes(fakeKey), false);
    assert.match(error.message, /\[REDACTED\]/);
    return true;
  });
});

test("Dark Shopping invalid payloads fail closed", async () => {
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async () => new Response("not-json"),
  });

  await assert.rejects(client.getBalance(), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 502);
    assert.equal(error.code, "DARK_SHOPPING_INVALID_RESPONSE");
    return true;
  });
});

test("Dark Shopping delivery downloads accept only bounded official storage files", async () => {
  let requestInit: RequestInit | undefined;
  const client = new DarkShoppingClient({
    apiKey: fakeKey,
    minimumRequestIntervalMs: 0,
    fetchImplementation: async (_input, init) => {
      requestInit = init;
      return new Response("delivery-row", {
        headers: { "content-length": "12", "content-type": "text/plain" },
      });
    },
  });

  const delivery = await client.downloadDeliveryFile(
    "https://dark.shopping/storage/order.txt",
    100,
  );
  assert.equal(delivery.toString("utf8"), "delivery-row");
  assert.equal(requestInit?.redirect, "error");

  await assert.rejects(
    client.downloadDeliveryFile("https://example.com/storage/order.txt", 100),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "DARK_SHOPPING_DELIVERY_URL_INVALID");
      return true;
    },
  );
});
