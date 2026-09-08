import { DisputeStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const ACTIVE = [
  DisputeStatus.OPEN,
  DisputeStatus.UNDER_REVIEW,
  DisputeStatus.AWAITING_BUYER,
  DisputeStatus.AWAITING_SELLER,
];
const RESPONSE_MS = 24 * 60 * 60 * 1000;

type Party = "BUYER" | "SELLER" | "ADMIN";

export function activeDisputeWhere() {
  return { status: { in: ACTIVE } };
}

export function responseDeadline(from = new Date()) {
  return new Date(from.getTime() + RESPONSE_MS);
}

export async function autoResolveExpiredDisputes(
  where: Record<string, unknown> = {},
) {
  const now = new Date();
  const disputes = await prisma.dispute.findMany({
    where: {
      ...where,
      status: { in: ACTIVE },
      autoCloseAt: { lte: now },
      awaitingParty: { in: ["BUYER", "SELLER"] },
    },
    select: { id: true, awaitingParty: true, orderId: true },
  });
  if (!disputes.length) return { count: 0 };

  await prisma.$transaction(async (tx) => {
    for (const dispute of disputes) {
      const favor = dispute.awaitingParty === "SELLER" ? "BUYER" : "SELLER";
      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status:
            favor === "BUYER"
              ? DisputeStatus.RESOLVED_BUYER
              : DisputeStatus.RESOLVED_SELLER,
          closedInFavorOf: favor,
          resolution: `${dispute.awaitingParty?.toLowerCase()} did not reply within 24 hours, so the dispute was automatically closed in favor of the ${favor.toLowerCase()}.`,
          resolvedAt: now,
          autoCloseAt: null,
          awaitingParty: null,
        },
      });
    }
  });
  return { count: disputes.length };
}

export async function markDisputeTurn(
  orderId: string,
  author: { id: string; role: Role },
  orderBuyerId: string,
  orderSellerIds: string[],
) {
  const now = new Date();
  let party: Party = "ADMIN";
  if (author.id === orderBuyerId) party = "BUYER";
  else if (orderSellerIds.includes(author.id)) party = "SELLER";
  else if (
    author.role === Role.ADMIN ||
    author.role === Role.SUPER_ADMIN ||
    author.role === Role.MODERATOR
  )
    party = "ADMIN";

  const data =
    party === "BUYER"
      ? {
          lastBuyerMessageAt: now,
          awaitingParty: "SELLER",
          autoCloseAt: responseDeadline(now),
          status: DisputeStatus.AWAITING_SELLER,
        }
      : party === "SELLER"
        ? {
            lastSellerMessageAt: now,
            awaitingParty: "BUYER",
            autoCloseAt: responseDeadline(now),
            status: DisputeStatus.AWAITING_BUYER,
          }
        : {
            lastAdminMessageAt: now,
            awaitingParty: null,
            autoCloseAt: null,
            status: DisputeStatus.UNDER_REVIEW,
          };

  await prisma.dispute.updateMany({
    where: { orderId, status: { in: ACTIVE } },
    data,
  });
}
