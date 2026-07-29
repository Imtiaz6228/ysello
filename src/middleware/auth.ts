import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { ACCESS_TOKEN_COOKIE } from "../lib/cookies.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "./error-handler.js";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: Role;
  emailVerified: boolean;
};

type AccessPayload = JwtPayload & {
  sub: string;
  role: Role;
  emailVerified: boolean;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

async function authenticateRequest(req: Request) {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
  if (!token) return null;

  const payload = jwt.verify(token, env.JWT_SECRET) as AccessPayload;
  if (!payload.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isSuspended: true,
      emailVerifiedAt: true,
    },
  });
  if (!user || user.isSuspended) return null;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
  } satisfies AuthUser;
}

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.auth = (await authenticateRequest(req)) ?? undefined;
  } catch {
    req.auth = undefined;
  }
  next();
};

export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.cookies?.[ACCESS_TOKEN_COOKIE]) {
      throw new ApiError(401, "Authentication required.", "AUTH_REQUIRED");
    }
    const user = await authenticateRequest(req);
    if (!user) {
      throw new ApiError(
        401,
        "Invalid or expired session.",
        "SESSION_INVALID",
      );
    }
    req.auth = user;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }

    next(new ApiError(401, "Invalid or expired session.", "SESSION_INVALID"));
  }
};

export const requireVerifiedUser: RequestHandler = (req, _res, next) => {
  next();
};

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      next(
        new ApiError(
          403,
          "You do not have permission to perform this action.",
          "FORBIDDEN",
        ),
      );
      return;
    }

    next();
  };
}
