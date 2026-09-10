import { mkdirSync, rmSync, writeFileSync } from "node:fs";

// Vercel is used only as the public edge/reverse-proxy in front of Railway.
// IMPORTANT: do not create index.html here. A real static /index.html wins over
// the external rewrite for `/` and would hide the actual Ysello storefront.
for (const directory of ["vercel-dist", "dist"]) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    `${directory}/deployment.txt`,
    "Ysello Vercel reverse-proxy release 2026-09-07.7. Storefront and API are served by Railway.\n",
  );
}

console.log("[ysello] Vercel reverse-proxy output prepared; no static index.html generated");
