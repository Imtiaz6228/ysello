# Ysello deployment fix — 2026-09-07.3

## Why this build is different

- Railway now uses the root `Dockerfile` explicitly instead of Railpack.
- Railway installs dev/build dependencies deterministically with `npm ci --include=dev`.
- Railway storefront build uses Vite directly and does not fail the deployment on a separate TypeScript type-check step.
- The API starts directly from `src/server.ts` through `tsx`, so a separate `dist-api` compilation is no longer required to start production.
- Vercel is now a proxy/CDN deployment. It skips npm installation and the Vite build entirely and forwards traffic to the Railway public service.

## Expected Railway log marker

`[ysello] Docker build release 2026-09-07.3`

If Railway still shows `Railpack`, select Dockerfile as the service builder or make sure the committed `railway.json` is being used.
