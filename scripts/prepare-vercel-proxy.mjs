import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("vercel-dist", { recursive: true });
writeFileSync(
  "vercel-dist/deployment.txt",
  "Ysello Vercel edge proxy. Dynamic application is served by Railway.\n",
);
console.log("[ysello] Vercel proxy output prepared");
