import { Role, type User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { publicUploadUrl } from "../middleware/upload.js";
import { ApiError } from "../middleware/error-handler.js";
import type { UpdateProfileInput } from "../schemas/profile.schemas.js";
import { publicUser } from "./auth.service.js";

async function ensureUniqueForProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  const conflicts: User[] = [];

  if (input.email) {
    const emailUser = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (emailUser && emailUser.id !== userId) {
      conflicts.push(emailUser);
    }
  }

  if (input.username) {
    const usernameUser = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (usernameUser && usernameUser.id !== userId) {
      conflicts.push(usernameUser);
    }
  }

  if (conflicts.length > 0) {
    throw new ApiError(
      409,
      "Email or username is already in use.",
      "ACCOUNT_EXISTS",
    );
  }
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await ensureUniqueForProfile(userId, input);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...input,
      emailVerifiedAt: input.email ? new Date() : undefined,
    },
  });

  return publicUser(updatedUser);
}

export async function updateProfileImage(
  userId: string,
  file: Express.Multer.File | undefined,
) {
  if (!file) {
    throw new ApiError(400, "Profile picture is required.", "UPLOAD_REQUIRED");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profileImageUrl: publicUploadUrl(file.filename),
    },
  });

  return publicUser(updatedUser);
}

export function listUsersForAdministration() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      role: true,
      isSuspended: true,
      suspensionReason: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(
  actingUserId: string,
  userId: string,
  role: Role,
) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new ApiError(404, "User not found.", "USER_NOT_FOUND");
  }

  if (actingUserId === userId && role !== Role.SUPER_ADMIN) {
    throw new ApiError(
      400,
      "You cannot remove your own super-admin access.",
      "SELF_DEMOTION",
    );
  }

  if (target.role === Role.SUPER_ADMIN && role !== Role.SUPER_ADMIN) {
    const superAdminCount = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN },
    });
    if (superAdminCount <= 1) {
      throw new ApiError(
        400,
        "The last super admin cannot be demoted.",
        "LAST_SUPER_ADMIN",
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return publicUser(updated);
}
