# Dark.shopping rate-limit final fix — Ysello 2026-09-05.3

This release fixes the HTTP 429 failure seen on `GET product/view`.

## Changes
- Supplier pacing is 700ms between request starts (~1.43 req/s), safely below Dark.shopping's documented maximum of 2 req/s.
- All supplier reads share one in-process queue.
- If `REDIS_URL` is configured, Railway replicas also share one distributed request slot/cooldown.
- HTTP 429 honors `Retry-After` when supplied and otherwise retries after 2.5s, 5s, and 10s.
- A 429 pauses the entire supplier queue, not only the request that triggered it.
- `order/create` is excluded from blind 429 retries because Dark.shopping also uses 429 when another order is already processing.
- Product imports use small batches of 8 IDs and fall back to `product/view` only for gateway/missing-item cases.
- Release/deployment fingerprint bumped to 2026-09-05.3.

## Deployment
Deploy Railway/API first, verify `/api/health` reports `2026-09-05.3`, then deploy the matching frontend. No new Prisma migration is required.

For multi-replica Railway deployments, configure `REDIS_URL` so supplier pacing is coordinated across replicas.

## Validation performed
- TypeScript/TSX syntax transpilation passed for all modified files.
- Runtime simulation: 429, 429, 200 recovered automatically.
- Runtime simulation: `order/create` 429 was not blindly retried.
- Runtime simulation: 16 selected products were fetched in 2 small supplier list calls.
- Secret scan confirmed the supplied Dark.shopping API key is not embedded in the project.
- Full npm test suite could not run in this sandbox because project dependencies are not installed (`tsx` missing).
