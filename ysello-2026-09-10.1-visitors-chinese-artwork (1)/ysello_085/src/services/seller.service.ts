import { SellerApplicationStatus } from "@prisma/client";
import { sendSellerApplicationNotification } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error-handler.js";
import type { SellerApplicationInput } from "../schemas/seller.schemas.js";

type SellerDocumentUploads = {
  front: Express.Multer.File;
  back: Express.Multer.File;
};

export async function submitSellerApplication(
  userId: string,
  input: SellerApplicationInput,
  documents: SellerDocumentUploads,
) {
  const existing = await prisma.sellerApplication.findUnique({
    where: { userId },
  });

  if (existing) {
    throw new ApiError(
      409,
      "A seller application already exists for this account.",
      "APPLICATION_EXISTS",
    );
  }

  const application = await prisma.sellerApplication.create({
    data: {
      userId,
      ...input,
      documentFrontPath: documents.front.path,
      documentFrontOriginalName: documents.front.originalname,
      documentFrontMimeType: documents.front.mimetype,
      documentBackPath: documents.back.path,
      documentBackOriginalName: documents.back.originalname,
      documentBackMimeType: documents.back.mimetype,
    } as any,
  });

  try {
    await sendSellerApplicationNotification(
      application.storeName,
      application.email,
    );
  } catch {
    // Email notification is best-effort; SMTP failures should not block the application.
  }

  return application;
}

export function getSellerApplicationForUser(userId: string) {
  return prisma.sellerApplication.findUnique({
    where: { userId },
  });
}

export function listSellerApplications(status?: SellerApplicationStatus) {
  return prisma.sellerApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      },
      reviewer: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
    },
  });
}

export async function reviewSellerApplication(
  id: string,
  reviewerId: string,
  status: SellerApplicationStatus,
  adminNotes?: string,
) {
  const application = await prisma.sellerApplication.findUnique({
    where: { id },
  });

  if (!application) {
    throw new ApiError(
      404,
      "Seller application not found.",
      "APPLICATION_NOT_FOUND",
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sellerApplication.update({
      where: { id },
      data: {
        status,
        adminNotes,
        reviewedAt: now,
        reviewedById: reviewerId,
      },
    });

    if (status === SellerApplicationStatus.APPROVED) {
      await tx.user.update({
        where: { id: application.userId },
        data: { role: "SELLER" },
      });

      const baseSlug =
        application.storeName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "store";

      await tx.sellerProfile.upsert({
        where: { userId: application.userId },
        create: {
          userId: application.userId,
          storeName: application.storeName,
          slug: `${baseSlug}-${application.userId.slice(0, 8)}`,
          about: application.storeDescription,
          isVerified: true,
        },
        update: {
          storeName: application.storeName,
          about: application.storeDescription,
          isVerified: true,
          isSuspended: false,
          suspensionReason: null,
        },
      });
    }

    if (status === SellerApplicationStatus.REJECTED) {
      await tx.user.updateMany({
        where: {
          id: application.userId,
          role: "SELLER",
        },
        data: { role: "CUSTOMER" },
      });

      await tx.sellerProfile.updateMany({
        where: { userId: application.userId },
        data: { isVerified: false },
      });
    }

    return updated;
  });
}
