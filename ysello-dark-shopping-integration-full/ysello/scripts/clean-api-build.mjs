import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../dist-api", import.meta.url));
await rm(outputDirectory, { recursive: true, force: true });
