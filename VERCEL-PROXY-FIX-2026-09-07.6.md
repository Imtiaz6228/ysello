# Ysello Vercel proxy fix — 2026-09-07.6

## Fixed symptom
Visiting `https://ysello.com` displayed the literal text `Ysello edge proxy`.

## Root cause
The Vercel proxy build generated a real `vercel-dist/index.html` placeholder. Vercel served that static file for `/`, so the catch-all external rewrite never reached the Railway storefront.

## Fix
- `scripts/prepare-vercel-proxy.mjs` no longer creates `index.html` in Vercel output.
- `vercel.json` now has an explicit `/` rewrite followed by the catch-all rewrite to Railway.
- The Vercel build output contains only `deployment.txt`, so storefront URLs resolve through the external Railway rewrite.

Expected Vercel build log:

```
[ysello] Vercel reverse-proxy output prepared; no static index.html generated
```

After deployment, `https://ysello.com/` should render the real marketplace served by Railway, not a proxy placeholder.
