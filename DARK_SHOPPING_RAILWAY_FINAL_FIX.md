> **SUPERSEDED:** Use `DARK_SHOPPING_RATE_LIMIT_FINAL_FIX.md` and release `2026-09-05.3`.

# Dark.shopping / Railway final hardening — 2026-09-05.2

This release addresses two separate failure modes that looked like the same 502 error.

## 1. Import no longer uses bulk product/list
Dark.shopping documents that product/list can return 502 when many search parameters / ids are used with GET and recommends POST. In production, the Ysello Railway service was still surfacing 502 during selected-product import. To remove this dependency completely, selected-product import now retrieves each selected item through `product/view` and the shared client throttle keeps supplier calls at <= 2 requests per second.

`product/list` remains available for normal catalog browsing/search. Background sync uses small batches rather than 500 IDs at once.

## 2. Old Railway builds are now detectable and blocked
- Release: `2026-09-05.2`
- `/api/health` now returns `release.releaseId`, Railway project/service/environment, repository, branch and short commit SHA.
- Health responses are `Cache-Control: no-store`.
- The Railway build log prints `[ysello] building release 2026-09-05.2`.
- API startup logs print `Ysello API 2026-09-05.2` plus safe Railway source metadata.
- The admin Dark Shopping page expects backend integration `2026-09-05.2` and blocks imports if Railway reports an older version.

## Required Railway deployment
1. Railway API service must point to the same source repository/branch as the frontend release.
2. Deploy this release to that service.
3. Confirm build logs contain `[ysello] building release 2026-09-05.2`.
4. Confirm startup logs contain `Ysello API 2026-09-05.2`.
5. Open `https://api.ysello.com/api/health` and confirm `release.releaseId` is `2026-09-05.2`.
6. Only then retry Admin -> Dark Shopping resale -> Import selected.

No new Prisma migration is required for this release.
