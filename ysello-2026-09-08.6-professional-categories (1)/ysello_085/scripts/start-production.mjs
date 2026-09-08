const canonicalAppOrigin = "https://ysello.com";
const canonicalApiOrigin = "https://api.ysello.com";

function securePublicOrigin(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(candidate);
    const privateHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.endsWith(".internal") ||
      url.hostname.endsWith(".local");

    if (privateHost) return fallback;
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    url.pathname = url.pathname === "/" ? "" : url.pathname;
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

if (process.env.NODE_ENV === "production") {
  process.env.APP_URL = securePublicOrigin(
    process.env.APP_URL,
    canonicalAppOrigin,
  );
  process.env.API_URL = securePublicOrigin(
    process.env.API_URL,
    canonicalApiOrigin,
  );
}

if (process.env.STARTUP_PREFLIGHT_ONLY === "1") {
  console.log(
    JSON.stringify({
      app: process.env.APP_URL,
      api: process.env.API_URL,
    }),
  );
  process.exit(0);
}

await import("../dist-api/server.js");
