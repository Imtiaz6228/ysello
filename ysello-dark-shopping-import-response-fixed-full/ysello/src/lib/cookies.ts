import type { Request, Response } from "express";
import { env, isProduction } from "../config/env.js";
import { hmacSha256, randomToken, safeEqual } from "./crypto.js";

// The __Host- prefix requires Secure, which is correct in production but makes
// browsers reject local HTTP cookies. Keep the strong prefix only on HTTPS.
export const ACCESS_TOKEN_COOKIE = isProduction
  ? "__Host-auth_access"
  : "auth_access";
export const REFRESH_TOKEN_COOKIE = isProduction
  ? "__Host-auth_refresh"
  : "auth_refresh";
export const CSRF_COOKIE = isProduction ? "__Host-auth_csrf" : "auth_csrf";
export const GOOGLE_OAUTH_COOKIE = isProduction
  ? "__Host-google_oauth"
  : "google_oauth";

function baseCookieOptions() {
  return {
    secure: isProduction,
    // Vercel and Railway are different sites. Production auth cookies must be
    // explicitly cross-site or the browser will silently withhold them.
    sameSite: isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: env.ACCESS_TOKEN_MINUTES * 60 * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    maxAge: rememberMe
      ? env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
      : env.SHORT_REFRESH_TOKEN_HOURS * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
}

function googleOAuthCookieOptions() {
  return {
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    httpOnly: true,
  };
}

export function setGoogleOAuthCookie(res: Response, value: string) {
  res.cookie(GOOGLE_OAUTH_COOKIE, value, {
    ...googleOAuthCookieOptions(),
    maxAge: 10 * 60 * 1000,
  });
}

export function clearGoogleOAuthCookie(res: Response) {
  res.clearCookie(GOOGLE_OAUTH_COOKIE, googleOAuthCookieOptions());
}

export function getGoogleOAuthCookie(req: Request) {
  return req.cookies?.[GOOGLE_OAUTH_COOKIE] as string | undefined;
}

export function issueCsrfToken(res: Response) {
  const token = randomToken(32);
  const signature = hmacSha256(token, env.CSRF_SECRET);
  const signed = `${token}.${signature}`;

  // Set cookie for same-origin fallback, but the signed token is self-validating
  // so cross-site (Vercel → Railway) still works without the cookie.
  res.cookie(CSRF_COOKIE, signed, {
    ...baseCookieOptions(),
    httpOnly: false,
    maxAge: 2 * 60 * 60 * 1000,
  });

  // Return the self-validating signed token so the client can send it
  // as x-csrf-token without needing the cookie for verification.
  return signed;
}

export function verifyCsrfToken(req: Request) {
  const headerValue = req.get("x-csrf-token");
  if (!headerValue) return false;

  // Self-validating token (works cross-site without cookie)
  const [token, signature] = headerValue.split(".");
  if (token && signature) {
    const expectedSignature = hmacSha256(token, env.CSRF_SECRET);
    if (safeEqual(signature, expectedSignature)) return true;
  }

  // Fallback: cookie-based double-submit (same-origin only)
  const cookieValue = req.cookies?.[CSRF_COOKIE] as string | undefined;
  if (!cookieValue) return false;

  const [cookieToken, cookieSignature] = cookieValue.split(".");
  if (!cookieToken || !cookieSignature) return false;

  const expectedCookieSignature = hmacSha256(cookieToken, env.CSRF_SECRET);

  return (
    safeEqual(cookieSignature, expectedCookieSignature) &&
    safeEqual(headerValue, cookieToken)
  );
}
