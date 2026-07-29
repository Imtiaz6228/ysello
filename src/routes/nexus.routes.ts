import { Router } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  optionalAuth,
  requireAuth,
  requireRole,
} from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../middleware/error-handler.js";
import { generateAiReply } from "../services/ai-support.service.js";
import {
  EarningsAnalyticsService,
  type Granularity,
} from "../services/earnings-analytics.service.js";

export const nexusRouter = Router();
const staff = requireRole(Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN);
const earnings = new EarningsAnalyticsService();

const supportInput = z.object({
  message: z.string().trim().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
  visitorToken: z.string().trim().min(20).max(200).optional(),
  guestName: z.string().trim().min(2).max(100).optional(),
  guestEmail: z.string().trim().email().max(200).optional(),
});

function visitorTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicSupportOwner(
  userId: string | undefined,
  visitorToken: string | undefined,
) {
  if (userId) return { userId };
  if (!visitorToken) {
    throw new ApiError(
      400,
      "A visitor token is required to continue this support conversation.",
      "SUPPORT_VISITOR_TOKEN_REQUIRED",
    );
  }
  return { visitorTokenHash: visitorTokenHash(visitorToken) };
}

nexusRouter.post(
  "/support/start",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = supportInput.parse(req.body);
    const owner = publicSupportOwner(req.auth?.id, input.visitorToken);
    let session = input.sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: input.sessionId, ...owner },
        })
      : await prisma.chatSession.findFirst({
          where: owner,
          orderBy: { lastMessageAt: "desc" },
        });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          ...owner,
          guestName: req.auth ? null : input.guestName,
          guestEmail: req.auth ? null : input.guestEmail,
          subject: input.message.slice(0, 80),
          status: "HUMAN",
        },
      });
    }

    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          authorId: req.auth?.id,
          role: "user",
          body: input.message,
        },
      }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: {
          status: "HUMAN",
          resolved: false,
          lastMessageAt: new Date(),
          ...(!req.auth
            ? {
                guestName: input.guestName ?? session.guestName,
                guestEmail: input.guestEmail ?? session.guestEmail,
              }
            : {}),
        },
      }),
    ]);

    const updated = await prisma.chatSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    res.status(201).json({
      session: updated,
      message: "Your message was sent to an administrator.",
    });
  }),
);

nexusRouter.get(
  "/support/sessions",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const visitorToken =
      typeof req.query.visitorToken === "string"
        ? req.query.visitorToken
        : undefined;
    const owner = publicSupportOwner(req.auth?.id, visitorToken);
    const sessions = await prisma.chatSession.findMany({
      where: owner,
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
      take: 30,
    });
    res.json({ sessions });
  }),
);

nexusRouter.post(
  "/support/:id/messages",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        body: z.string().trim().min(1).max(4000),
        visitorToken: z.string().trim().min(20).max(200).optional(),
      })
      .parse(req.body);
    const owner = publicSupportOwner(req.auth?.id, input.visitorToken);
    const session = await prisma.chatSession.findFirst({
      where: { id: z.string().uuid().parse(req.params.id), ...owner },
    });
    if (!session)
      throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          authorId: req.auth?.id,
          role: "user",
          body: input.body,
        },
      }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: {
          status: "HUMAN",
          resolved: false,
          lastMessageAt: new Date(),
        },
      }),
    ]);
    res.status(201).json({ message });
  }),
);

nexusRouter.use(requireAuth);

nexusRouter.post(
  "/ai/support",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        message: z.string().trim().min(1).max(4000),
        sessionId: z.string().uuid().optional(),
      })
      .parse(req.body);
    let session = input.sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: input.sessionId, userId: req.auth!.id },
        })
      : null;
    if (!session)
      session = await prisma.chatSession.create({
        data: { userId: req.auth!.id, subject: input.message.slice(0, 80) },
      });
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        authorId: req.auth!.id,
        role: "user",
        body: input.message,
      },
    });
    const answer = await generateAiReply(input.message, req.auth!.id);
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        body: answer.reply,
        metadata: { quickActions: answer.quickActions },
      },
    });
    res.json({
      sessionId: session.id,
      reply: answer.reply,
      quickActions: answer.quickActions,
      sources: answer.kbResults.map((article) => ({
        title: article.title,
        slug: article.slug,
      })),
    });
  }),
);

nexusRouter.get(
  "/chat/sessions",
  asyncHandler(async (req, res) => {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.auth!.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    res.json({ sessions });
  }),
);

nexusRouter.post(
  "/chat/human",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        sessionId: z.string().uuid().optional(),
        message: z
          .string()
          .trim()
          .min(1)
          .max(4000)
          .default("I would like to chat with an administrator."),
      })
      .parse(req.body);
    let session = input.sessionId
      ? await prisma.chatSession.findFirst({
          where: { id: input.sessionId, userId: req.auth!.id },
        })
      : null;
    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId: req.auth!.id,
          subject: input.message.slice(0, 80),
          status: "HUMAN",
        },
      });
    }
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          authorId: req.auth!.id,
          role: "user",
          body: input.message,
        },
      }),
      prisma.chatSession.update({
        where: { id: session.id },
        data: {
          status: "HUMAN",
          resolved: false,
          lastMessageAt: new Date(),
        },
      }),
    ]);
    res.json({
      sessionId: session.id,
      message: "An administrator has been notified.",
    });
  }),
);

nexusRouter.post(
  "/chat/:id/human",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: req.auth!.id },
    });
    if (!session)
      throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { status: "HUMAN" },
    });
    res.json({ message: "A human support request has been sent to admin." });
  }),
);

nexusRouter.post(
  "/chat/:id/messages",
  asyncHandler(async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const id = String(req.params.id);
    const session = await prisma.chatSession.findFirst({
      where: { id, userId: req.auth!.id },
    });
    if (!session)
      throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        authorId: req.auth!.id,
        role: "user",
        body,
      },
    });
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        status: "HUMAN",
        resolved: false,
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      },
    });
    res.status(201).json({ message });
  }),
);

nexusRouter.post(
  "/live/activity",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        sessionId: z.string().uuid().optional(),
        currentUrl: z.string().max(1000).optional(),
      })
      .parse(req.body);
    const existing = input.sessionId
      ? await prisma.liveSession.findFirst({
          where: { id: input.sessionId, userId: req.auth!.id },
        })
      : null;
    const session = existing
      ? await prisma.liveSession.update({
          where: { id: existing.id },
          data: {
            currentUrl: input.currentUrl,
            lastActivity: new Date(),
            status: "ACTIVE",
          },
        })
      : await prisma.liveSession.create({
          data: {
            userId: req.auth!.id,
            currentUrl: input.currentUrl,
            userAgent: req.get("user-agent"),
          },
        });
    res.json({ sessionId: session.id, status: session.status });
  }),
);

nexusRouter.post(
  "/live/typing",
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        sessionId: z.string().uuid().optional(),
        isTyping: z.boolean(),
      })
      .parse(req.body);
    if (input.sessionId)
      await prisma.liveSession.updateMany({
        where: { id: input.sessionId, userId: req.auth!.id },
        data: { isTyping: input.isTyping, lastActivity: new Date() },
      });
    res.json({ ok: true });
  }),
);

nexusRouter.get(
  "/admin/chats",
  staff,
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.chatSession.findMany({
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, role: true },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    res.json({ sessions });
  }),
);

nexusRouter.get(
  "/admin/earnings/daily",
  staff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        from: z.string(),
        to: z.string(),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      })
      .parse(req.query);
    res.json(
      await earnings.getAdminReport(
        new Date(`${input.from}T00:00:00.000Z`),
        new Date(`${input.to}T23:59:59.999Z`),
        input.granularity as Granularity,
      ),
    );
  }),
);

nexusRouter.get(
  "/seller/earnings/daily",
  requireRole(Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        from: z.string(),
        to: z.string(),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      })
      .parse(req.query);
    res.json(
      await earnings.getSellerReport(
        req.auth!.id,
        new Date(`${input.from}T00:00:00.000Z`),
        new Date(`${input.to}T23:59:59.999Z`),
        input.granularity as Granularity,
      ),
    );
  }),
);

nexusRouter.post(
  "/admin/chats/:id/reply",
  staff,
  asyncHandler(async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(4000) })
      .parse(req.body);
    const session = await prisma.chatSession.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!session)
      throw new ApiError(404, "Chat session not found.", "CHAT_NOT_FOUND");
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        authorId: req.auth!.id,
        role: "admin",
        body,
      },
    });
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        status: "HUMAN",
        resolved: false,
        updatedAt: new Date(),
        lastMessageAt: new Date(),
      },
    });
    res.status(201).json({ message });
  }),
);

nexusRouter.get(
  "/admin/live",
  staff,
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.liveSession.findMany({
      where: { status: { in: ["ACTIVE", "TAKEN_OVER"] } },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true, role: true },
        },
      },
      orderBy: { lastActivity: "desc" },
    });
    res.json({ sessions });
  }),
);
