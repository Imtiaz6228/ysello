import { Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import {
  hmacSha256,
  randomToken,
  safeEqual,
  sha256Base64Url,
} from "../lib/crypto.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";

const GOOGLE_PROVIDER = "google";
const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const OAUTH_FLOW_MAX_AGE_MS = 10 * 60 * 1000;

export type GoogleOAuthIntent = "signin" | "register";

type GoogleOAuthCookiePayload = {
  state: string;
  codeVerifier: string;
  intent: GoogleOAuthIntent;
  returnTo?: string;
  createdAt: number;
};

const googleProfileSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.string().trim().email().max(254).toLowerCase(),
  email_verified: z.boolean(),
  given_name: z.string().trim().max(80).optional(),
  family_name: z.string().trim().max(80).optional(),
  name: z.string().trim().max(160).optional(),
  picture: z.string().url().max(2048).optional(),
});

function googleRedirectUri() {
  return (
    env.GOOGLE_REDIRECT_URI ??
    new URL("/auth/google/callback", env.API_URL).toString()
  );
}

function requireGoogleConfiguration() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(
      503,
      "Google sign-in is not configured.",
      "GOOGLE_OAUTH_NOT_CONFIGURED",
    );
  }

  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: googleRedirectUri(),
  };
}

export function safeOAuthReturnTo(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return undefined;
  }

  try {
    const url = new URL(value, env.APP_URL);
    if (url.origin !== new URL(env.APP_URL).origin) return undefined;

    const pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (
      [
        "/sign-in",
        "/register",
        "/sign-out",
        "/auth/google/callback",
        "/google-callback.php",
      ].includes(pathname)
    ) {
      return undefined;
    }

    const safeValue = `${pathname}${url.search}${url.hash}`;
    return safeValue.length <= 1024 ? safeValue : undefined;
  } catch {
    return undefined;
  }
}

function signOAuthPayload(encodedPayload: string) {
  return hmacSha256(`google-oauth:${encodedPayload}`, env.CSRF_SECRET);
}

function encodeOAuthPayload(payload: GoogleOAuthCookiePayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${signOAuthPayload(encodedPayload)}`;
}

export function readGoogleOAuthFlow(
  cookieValue: string | undefined,
  returnedState: string | undefined,
) {
  if (!cookieValue || !returnedState) {
    throw new ApiError(
      400,
      "Google sign-in session is missing.",
      "GOOGLE_OAUTH_STATE_INVALID",
    );
  }

  const [encodedPayload, signature, extra] = cookieValue.split(".");
  if (
    !encodedPayload ||
    !signature ||
    extra ||
    !safeEqual(signature, signOAuthPayload(encodedPayload))
  ) {
    throw new ApiError(
      400,
      "Google sign-in session is invalid.",
      "GOOGLE_OAUTH_STATE_INVALID",
    );
  }

  let payload: GoogleOAuthCookiePayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as GoogleOAuthCookiePayload;
  } catch {
    throw new ApiError(
      400,
      "Google sign-in session is invalid.",
      "GOOGLE_OAUTH_STATE_INVALID",
    );
  }

  const age = Date.now() - payload.createdAt;
  if (
    !payload.state ||
    !payload.codeVerifier ||
    !["signin", "register"].includes(payload.intent) ||
    age < 0 ||
    age > OAUTH_FLOW_MAX_AGE_MS ||
    !safeEqual(payload.state, returnedState)
  ) {
    throw new ApiError(
      400,
      "Google sign-in session expired or is invalid.",
      "GOOGLE_OAUTH_STATE_INVALID",
    );
  }

  return payload;
}

export function createGoogleOAuthFlow(input: {
  intent: GoogleOAuthIntent;
  returnTo?: unknown;
}) {
  const { clientId, redirectUri } = requireGoogleConfiguration();
  const state = randomToken(32);
  const codeVerifier = randomToken(48);
  const payload: GoogleOAuthCookiePayload = {
    state,
    codeVerifier,
    intent: input.intent,
    returnTo: safeOAuthReturnTo(input.returnTo),
    createdAt: Date.now(),
  };
  const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_URL);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: sha256Base64Url(codeVerifier),
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    prompt: "select_account",
  }).toString();

  return {
    authorizationUrl: authorizationUrl.toString(),
    cookieValue: encodeOAuthPayload(payload),
  };
}

async function readProviderResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ApiError(
      502,
      "Google returned an invalid response.",
      "GOOGLE_OAUTH_PROVIDER_ERROR",
    );
  }
}

async function fetchGoogleProfile(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = requireGoogleConfiguration();
  let tokenResponse: Response;

  try {
    tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      502,
      "Google could not be reached.",
      "GOOGLE_OAUTH_PROVIDER_ERROR",
    );
  }

  const tokenPayload = await readProviderResponse(tokenResponse);
  const accessToken = tokenPayload.access_token;
  if (!tokenResponse.ok || typeof accessToken !== "string" || !accessToken) {
    throw new ApiError(
      502,
      "Google could not complete sign-in.",
      "GOOGLE_OAUTH_PROVIDER_ERROR",
    );
  }

  let profileResponse: Response;
  try {
    profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      502,
      "Google could not be reached.",
      "GOOGLE_OAUTH_PROVIDER_ERROR",
    );
  }

  const profilePayload = await readProviderResponse(profileResponse);
  const parsedProfile = googleProfileSchema.safeParse(profilePayload);
  if (!profileResponse.ok || !parsedProfile.success) {
    throw new ApiError(
      502,
      "Google returned an invalid account profile.",
      "GOOGLE_OAUTH_PROVIDER_ERROR",
    );
  }
  if (!parsedProfile.data.email_verified) {
    throw new ApiError(
      403,
      "Google has not verified this email address.",
      "GOOGLE_EMAIL_NOT_VERIFIED",
    );
  }

  return parsedProfile.data;
}

function googleNames(profile: z.infer<typeof googleProfileSchema>) {
  const displayParts = profile.name?.split(/\s+/).filter(Boolean) ?? [];
  const firstName = (profile.given_name || displayParts[0] || "Google").slice(
    0,
    80,
  );
  const lastName = (
    profile.family_name ||
    displayParts.slice(1).join(" ") ||
    "User"
  ).slice(0, 80);

  return { firstName, lastName };
}

function usernameBase(profile: z.infer<typeof googleProfileSchema>) {
  const { firstName, lastName } = googleNames(profile);
  const raw = `${firstName}_${lastName}`;
  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 22);

  return normalized.length >= 3 ? normalized : "ysello_user";
}

async function createGoogleUser(profile: z.infer<typeof googleProfileSchema>) {
  const names = googleNames(profile);
  const base = usernameBase(profile);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = attempt === 0 ? "" : `_${randomToken(4).slice(0, 6)}`;
    const username = `${base.slice(0, 32 - suffix.length)}${suffix}`;

    try {
      return await prisma.user.create({
        data: {
          ...names,
          username,
          email: profile.email,
          phone: "",
          country: "",
          profileImageUrl: profile.picture,
          passwordHash: null,
          emailVerifiedAt: new Date(),
          externalAuthAccounts: {
            create: {
              provider: GOOGLE_PROVIDER,
              providerAccountId: profile.sub,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const linkedAccount = await prisma.externalAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: GOOGLE_PROVIDER,
              providerAccountId: profile.sub,
            },
          },
          include: { user: true },
        });
        if (linkedAccount) return linkedAccount.user;

        const emailUser = await prisma.user.findUnique({
          where: { email: profile.email },
        });
        if (emailUser) return linkGoogleAccount(emailUser, profile.sub);

        continue;
      }

      throw error;
    }
  }

  throw new ApiError(
    409,
    "A unique username could not be created for this Google account.",
    "GOOGLE_ACCOUNT_CONFLICT",
  );
}

async function linkGoogleAccount(user: User, providerAccountId: string) {
  const existingUserGoogleAccount = await prisma.externalAuthAccount.findUnique(
    {
      where: {
        userId_provider: { userId: user.id, provider: GOOGLE_PROVIDER },
      },
    },
  );
  if (
    existingUserGoogleAccount &&
    existingUserGoogleAccount.providerAccountId !== providerAccountId
  ) {
    throw new ApiError(
      409,
      "This Ysello account is already linked to another Google account.",
      "GOOGLE_ACCOUNT_CONFLICT",
    );
  }

  if (!existingUserGoogleAccount) {
    try {
      await prisma.externalAuthAccount.create({
        data: {
          userId: user.id,
          provider: GOOGLE_PROVIDER,
          providerAccountId,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      const linkedAccount = await prisma.externalAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: GOOGLE_PROVIDER,
            providerAccountId,
          },
        },
        include: { user: true },
      });
      if (!linkedAccount || linkedAccount.userId !== user.id) {
        throw new ApiError(
          409,
          "This Google account is already linked to another Ysello account.",
          "GOOGLE_ACCOUNT_CONFLICT",
        );
      }

      return linkedAccount.user;
    }
  }

  if (!user.emailVerifiedAt) {
    return prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  return user;
}

export async function authenticateWithGoogle(
  code: string,
  codeVerifier: string,
) {
  const profile = await fetchGoogleProfile(code, codeVerifier);
  const linkedAccount = await prisma.externalAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: GOOGLE_PROVIDER,
        providerAccountId: profile.sub,
      },
    },
    include: { user: true },
  });
  let user = linkedAccount?.user;

  if (!user) {
    const emailUser = await prisma.user.findUnique({
      where: { email: profile.email },
    });
    user = emailUser
      ? await linkGoogleAccount(emailUser, profile.sub)
      : await createGoogleUser(profile);
  }

  if (user.isSuspended) {
    throw new ApiError(
      403,
      "This account is suspended. Contact support for help.",
      "ACCOUNT_SUSPENDED",
    );
  }

  return user;
}
