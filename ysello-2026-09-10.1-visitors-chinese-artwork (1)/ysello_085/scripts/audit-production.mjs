import { spawnSync } from "node:child_process";

const AUDIT_LEVELS = new Set(["high", "critical"]);
const ALLOWED_ADVISORIES = new Set([
  // Ysello uses React Router only as a client-side BrowserRouter. It does not
  // enable React Server Components or server actions, so this RSC-only CSRF
  // advisory is not reachable. Remove this exception when upstream publishes
  // a release outside the affected range.
  "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
]);

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  throw new Error("npm_execpath is unavailable; run this check through npm run audit:prod");
}

const audit = spawnSync(process.execPath, [npmExecPath, "audit", "--omit=dev", "--json"], {
  encoding: "utf8",
});

if (audit.error) {
  throw audit.error;
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(audit.stderr || audit.stdout || "npm audit produced no JSON output");
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};

const advisoryUrlsFor = (name, visited = new Set()) => {
  if (visited.has(name)) return new Set();
  visited.add(name);

  const urls = new Set();
  for (const cause of vulnerabilities[name]?.via ?? []) {
    if (typeof cause === "string") {
      for (const url of advisoryUrlsFor(cause, visited)) urls.add(url);
    } else if (cause?.url) {
      urls.add(cause.url);
    }
  }
  return urls;
};

const blocking = Object.entries(vulnerabilities).filter(([name, vulnerability]) => {
  if (!AUDIT_LEVELS.has(vulnerability.severity)) return false;

  const urls = advisoryUrlsFor(name);
  return urls.size === 0 || [...urls].some((url) => !ALLOWED_ADVISORIES.has(url));
});

if (blocking.length > 0) {
  console.error("Blocking production dependency vulnerabilities:");
  for (const [name, vulnerability] of blocking) {
    console.error(`- ${name}: ${vulnerability.severity}`);
    for (const url of advisoryUrlsFor(name)) console.error(`  ${url}`);
  }
  process.exit(1);
}

const allowed = Object.keys(vulnerabilities).filter(
  (name) =>
    AUDIT_LEVELS.has(vulnerabilities[name].severity) &&
    [...advisoryUrlsFor(name)].every((url) => ALLOWED_ADVISORIES.has(url)),
);

console.log(
  allowed.length > 0
    ? `Production audit passed with documented RSC-only exception: ${allowed.join(", ")}`
    : "Production audit passed with no high or critical vulnerabilities.",
);