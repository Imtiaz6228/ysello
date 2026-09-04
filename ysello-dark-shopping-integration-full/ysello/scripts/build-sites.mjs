import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist/server", { recursive: true });
mkdirSync("dist/.openai", { recursive: true });
copyFileSync("src/sites-worker.js", "dist/server/index.js");
copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");
