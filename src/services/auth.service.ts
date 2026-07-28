import type { Request } from "express";
import jwt from "jsonwebtoken";
import { Prisma, type Role, type User } from "@prisma/client";
import { env } from "../config/env.js";
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from "../lib/cookies.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { publicUploadUrl } from "../middleware/upload.js";
import { ApiError } from "../middleware/error-handler.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schemas.js";

type SessionUser = Pick<User, "id" | "role" | "emailVerifiedAt">;

export function publicUser(user: User) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    country: user.country,
    city: user.city,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    isSuspended: user.isSuspended,
    emailVerified: true,
    balanceCents: user.balanceCents ?? 0,
    sellerBalanceCents: user.sellerBalanceCents ?? 0,
    createdAt: user.createdAt,
  };
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function addDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function signAccessToken(user: SessionUser) {
  return jwt.sign(
    {
      role: user.role,
      emailVerified: true,
    },
    env.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: `${env.ACCESS_TOKEN_MINUTES}m`,
    },
  );
}

async function createPasswordResetToken(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      consumedAt: null,
    },
  });

  const token = randomToken(48);
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: addHours(1),
    },
  });

  return token;
}

function logEmailError(kind: string, to: string, error: unknown) {
  console.error(
    `${kind} email failed for ${to}:`,
    error instanceof Error ? error.message : error,
  );
}

async function queuePasswordReset(
  user: Pick<User, "id" | "email" | "firstName">,
) {
  const token = await createPasswordResetToken(user.id);

  void sendPasswordResetEmail(user.email, user.firstName, token).catch(
    (error) => logEmailError("Password reset", user.email, error),
  );
}

export async function createSession(
  user: SessionUser,
  req: Request,
  rememberMe: boolean,
) {
  const refreshToken = randomToken(64);
  const expiresAt = rememberMe
    ? addDays(env.REFRESH_TOKEN_DAYS)
    : addHours(env.SHORT_REFRESH_TOKEN_HOURS);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      rememberMe,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
      expiresAt,
    },
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken,
    rememberMe,
  };
}

export async function registerUser(
  input: RegisterInput,
  file?: Express.Multer.File,
) {
  const [existingEmailUser, existingUsernameUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
  ]);

  if (existingUsernameUser && existingUsernameUser.email !== input.email) {
    throw new ApiError(409, "Username is already in use.", "USERNAME_EXISTS", {
      username: true,
    });
  }

  if (existingEmailUser) {
    if (existingEmailUser.emailVerifiedAt) {
      throw new ApiError(
        409,
        "Email is already registered. Sign in instead.",
        "EMAIL_EXISTS",
        {
          email: true,
        },
      );
    }

    const user = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        phone: input.phone,
        country: input.country,
        city: input.city,
        profileImageUrl: file
          ? publicUploadUrl(file.filename)
          : existingEmailUser.profileImageUrl,
        passwordHash: await hashPassword(input.password),
        emailVerifiedAt: existingEmailUser.emailVerifiedAt ?? new Date(),
      },
    });

    return publicUser(user);
  }

  const user = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      country: input.country,
      city: input.city,
      profileImageUrl: file ? publicUploadUrl(file.filename) : undefined,
      passwordHash: await hashPassword(input.password),
      emailVerifiedAt: new Date(),
    },
  });

  return publicUser(user);
}

export async function loginUser(input: LoginInput, req: Request) {
  const invalidError = new ApiError(
    401,
    "Invalid email or password.",
    "INVALID_CREDENTIALS",
  );
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw invalidError;
  }

  const passwordMatches = await verifyPassword(
    user.passwordHash,
    input.password,
  );
  if (!passwordMatches) {
    throw invalidError;
  }

  if (user.isSuspended) {
    throw new ApiError(
      403,
      "This account is suspended. Contact support for help.",
      "ACCOUNT_SUSPENDED",
    );
  }

  const session = await createSession(user, req, input.rememberMe);

  return {
    user: publicUser(user),
    session,
  };
}

export async function refreshUserSession(
  refreshToken: string | undefined,
  req: Request,
) {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh session required.", "REFRESH_REQUIRED");
  }

  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new ApiError(
      401,
      "Refresh session is invalid or expired.",
      "REFRESH_INVALID",
    );
  }

  if (session.user.isSuspended) {
    throw new ApiError(
      403,
      "This account is suspended. Contact support for help.",
      "ACCOUNT_SUSPENDED",
    );
  }

  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const nextSession = await createSession(
    session.user,
    req,
    session.rememberMe,
  );

  return {
    user: publicUser(session.user),
    session: nextSession,
  };
}

export async function logoutUser(refreshToken: string | undefined) {
  if (!refreshToken) {
    return;
  }

  await prisma.refreshSession.updateMany({
    where: {
      tokenHash: sha256(refreshToken),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function verifyEmailToken(token: string) {
  const tokenRecord = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (
    !tokenRecord ||
    tokenRecord.consumedAt ||
    tokenRecord.expiresAt <= new Date()
  ) {
    throw new ApiError(
      400,
      "Verification link is invalid or expired.",
      "TOKEN_INVALID",
    );
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: tokenRecord.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? new Date() },
    }),
  ]);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: tokenRecord.userId },
  });

  return publicUser(user);
}

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return;
  }

  await queuePasswordReset(user);
}

export async function resetPassword(token: string, password: string) {
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (
    !tokenRecord ||
    tokenRecord.consumedAt ||
    tokenRecord.expiresAt <= new Date()
  ) {
    throw new ApiError(
      400,
      "Reset link is invalid or expired.",
      "TOKEN_INVALID",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: tokenRecord.userId,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    }),
    prisma.refreshSession.updateMany({
      where: {
        userId: tokenRecord.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  password: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const passwordMatches = await verifyPassword(
    user.passwordHash,
    currentPassword,
  );

  if (!passwordMatches) {
    throw new ApiError(
      400,
      "Current password is incorrect.",
      "PASSWORD_INCORRECT",
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  return publicUser(user);
}

export async function getAvailability(email?: string, username?: string) {
  const [emailUser, usernameUser] = await Promise.all([
    email
      ? prisma.user.findUnique({ where: { email } })
      : Promise.resolve(null),
    username
      ? prisma.user.findUnique({ where: { username } })
      : Promise.resolve(null),
  ]);

  return {
    emailAvailable: email ? !emailUser : undefined,
    usernameAvailable: username ? !usernameUser : undefined,
  };
}

export function getRefreshTokenFromRequest(req: Request) {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
}

export function clearSessionCookies(
  res: Parameters<typeof clearAuthCookies>[0],
) {
  clearAuthCookies(res);
}

export function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export type PublicUser = ReturnType<typeof publicUser>;
export type UserRole = Role;
