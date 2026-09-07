import { mkdirSync, writeFileSync } from "node:fs";

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Ysello proxy</title></head><body>Ysello edge proxy</body></html>\n`;
for (const directory of ["vercel-dist", "dist"]) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    `${directory}/deployment.txt`,
    "Ysello Vercel edge proxy release 2026-09-07.4. Dynamic application is served by Railway.\n",
  );
  writeFileSync(`${directory}/index.html`, html);
}
console.log("[ysello] Vercel proxy output prepared for vercel-dist and dist");
