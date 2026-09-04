/* global Headers, Response */

const DEFAULT_API_ORIGIN = "https://api.ysello.com";

function upstreamRequest(request, apiOrigin) {
  const url = new URL(request.url);
  const upstream = new URL(`${url.pathname}${url.search}`, apiOrigin);
  return new Request(upstream, request);
}

function withHeaders(response, additions, status = response.status) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(additions)) headers.set(key, value);
  return new Response(response.body, {
    status,
    statusText: response.statusText,
    headers,
  });
}

const privateExactPaths = new Set([
  "/cart",
  "/sign-in",
  "/sign-out",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-required",
  "/dashboard",
  "/support",
  "/checkout",
  "/seller",
  "/seller/apply",
]);

function isPrivateSpaPath(pathname) {
  return (
    privateExactPaths.has(pathname) ||
    pathname.startsWith("/orders/") ||
    pathname.startsWith("/checkout/") ||
    pathname.startsWith("/seller/") ||
    pathname.startsWith("/admin")
  );
}

function isDataBackedPublicPath(pathname) {
  return (
    pathname === "/catalog" ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/stores/")
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiOrigin = env.API_ORIGIN || DEFAULT_API_ORIGIN;
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/uploads/")
    ) {
      return fetch(upstreamRequest(request, apiOrigin));
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      (url.pathname.startsWith("/categories/") ||
        url.pathname.startsWith("/products/"))
    ) {
      url.pathname = url.pathname.startsWith("/categories/")
        ? url.pathname.replace("/categories/", "/category/")
        : url.pathname.replace("/products/", "/product/");
      return Response.redirect(url, 308);
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname.length > 1 &&
      url.pathname.endsWith("/")
    ) {
      url.pathname = url.pathname.replace(/\/+$/, "");
      return Response.redirect(url, 308);
    }

    const response = await env.ASSETS.fetch(request);
    if (
      response.status !== 404 ||
      (request.method !== "GET" && request.method !== "HEAD")
    )
      return response;

    if (url.pathname !== "/" && !url.pathname.includes(".")) {
      const staticPageUrl = new URL(
        `${url.pathname.replace(/\/$/, "")}.html`,
        request.url,
      );
      const staticPage = await env.ASSETS.fetch(
        new Request(staticPageUrl, request),
      );
      if (staticPage.status !== 404) return staticPage;
    }

    if (isPrivateSpaPath(url.pathname)) {
      const fallbackUrl = new URL("/index.html", request.url);
      const fallback = await env.ASSETS.fetch(
        new Request(fallbackUrl, request),
      );
      return withHeaders(fallback, {
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Cache-Control": "private, no-store",
      });
    }

    if (isDataBackedPublicPath(url.pathname)) {
      const fallbackUrl = new URL("/index.html", request.url);
      const fallback = await env.ASSETS.fetch(
        new Request(fallbackUrl, request),
      );
      return withHeaders(fallback, {
        "Cache-Control": "public, max-age=0, must-revalidate",
      });
    }

    const notFoundUrl = new URL("/404.html", request.url);
    const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));
    if (notFound.status !== 404) {
      return withHeaders(
        notFound,
        {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "no-store",
        },
        404,
      );
    }
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  },
};
