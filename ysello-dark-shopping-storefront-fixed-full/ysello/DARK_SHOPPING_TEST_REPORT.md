# Dark.shopping integration validation report

Date: 2026-09-04

## Scope checked

- Existing Ysello buyer, seller, wallet, payment, dispute, local inventory, and
  local product code paths were left in place. Changes are restricted to the
  existing Dark.shopping supplier adapter/resale area, its admin UI, config,
  tests, and a forward-only Prisma migration.
- No Hokstore hostname or adapter reference remains in `src/`.
- The supplied Dark.shopping credential is **not** embedded in source, frontend
  code, examples, migrations, or documentation. Runtime configuration continues
  to use `DARK_SHOPPING_API_KEY` on the backend only.

## Provider-contract validation

Validated against the current official Dark.shopping API documentation:

- Base API: `https://dark.shopping/api/v1`
- Authentication parameter: `key`
- POST authentication is sent as a POST parameter.
- JSON is requested with `Accept: application/json` / `_format=json`.
- Provider throttle: maximum two requests per second.
- Catalog: `category/list`, `group/list`, `attribute/list`, `product/list`,
  `product/view`.
- Balance: `user/balance`.
- Orders: `order/create`, `order/status`, `order/download`.
- `idempotence_id` is used for duplicate-order protection.

## Code validation performed in this sandbox

PASS — TypeScript/TSX syntax transpilation for all changed source files.

PASS — admin crash regression hardening:

- numeric/string supplier values are normalized before React rendering;
- mismatched `/resale` payloads fail closed with a deployment message;
- Prisma P2021/P2022 produces an explicit migration-required state;
- order IDs, statuses, and download links are validated at the API boundary;
- the admin panel exposes integration marker `2026-09-04.3`.

PASS — standalone Dark.shopping client transport smoke test:

- `product/list` POST body is URL encoded;
- API key is present in the POST body and absent from the POST URL;
- array and boolean filters serialize correctly;
- nested attribute-filter form keys serialize correctly;
- credential-bearing provider links are redacted before returning data.

PASS — static integration checks:

- locked 30% global supplier markup;
- admin Test Connection action;
- idempotent category import/mapping endpoint;
- admin Add category to Ysello action;
- product import no longer accepts a client-supplied margin;
- per-listing margin editor removed;
- Prisma default and existing listing rows migrated to 30%;
- insufficient supplier balance enters admin-review/error handling rather than
  repeatedly creating supplier attempts;
- no Hokstore reference in application source.

## What was intentionally not executed

No real supplier order was created. Creating an unnecessary live supplier order
would spend the Dark.shopping account balance.

A live balance/category request using the supplied key could not be performed
from this sandbox because outbound DNS/network access to Dark.shopping is not
available from the code-execution environment. The key was not sent to third
party web-search tools as a workaround.

The repository's full `npm test` suite could not be run because the sandbox
could not download missing npm dependencies from the npm registry. This is an
execution-environment limitation; the changed TS/TSX files were still parsed
with the available TypeScript compiler and the supplier transport was exercised
with a dependency-free smoke test.

## Production activation checks

After deploying the ZIP and running `npx prisma migrate deploy` on the Ysello API
service, complete these non-destructive checks in the admin supplier workspace:

1. Test connection and confirm the expected Dark.shopping balance/currency.
2. Load Dark.shopping categories.
3. Add one desired supplier category to Ysello and verify it is not duplicated
   on a second click.
4. Load products from that category and import one automatic-delivery product as
   a draft.
5. Verify the supplier cost, 30% RUB retail markup, stock, and category mapping.
6. Run Sync and verify price/stock refresh.
7. When you have a genuine paid buyer order, verify one complete idempotent
   supplier purchase through protected buyer delivery.

Do not describe the integration as live-verified until those production checks
have passed against the approved Dark.shopping account.
