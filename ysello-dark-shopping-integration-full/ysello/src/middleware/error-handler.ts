import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = "ERROR",
    public details?: unknown,
  ) {
    super(message);
  }
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(
    new ApiError(
      404,
      `Route not found: ${req.method} ${req.path}`,
      "NOT_FOUND",
    ),
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const fieldErrors = issues.reduce<Record<string, string[]>>(
      (result, issue) => {
        const key = issue.path || "form";
        result[key] = [...(result[key] ?? []), issue.message];
        return result;
      },
      {},
    );
    res.status(400).json({
      message: issues[0]?.path
        ? `${issues[0].path}: ${issues[0].message}`
        : (issues[0]?.message ?? "Please check the form and try again."),
      code: "VALIDATION_ERROR",
      details: { fieldErrors, formErrors: fieldErrors.form ?? [], issues },
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      message: error.message,
      code: "UPLOAD_INVALID",
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        message: "That transaction or unique value has already been submitted.",
        code: "UNIQUE_CONSTRAINT",
      });
      return;
    }

    if (error.code === "P2021" || error.code === "P2022") {
      res.status(503).json({
        message:
          "The wallet database update is not installed yet. Deploy the latest server migration, then try again.",
        code: "DATABASE_MIGRATION_REQUIRED",
      });
      return;
    }
  }

  if (
    error instanceof Error &&
    (error.message.includes("Only JPEG") ||
      error.message.includes("product file type") ||
      error.message.includes("Seller documents"))
  ) {
    res.status(400).json({
      message: error.message,
      code: "UPLOAD_INVALID",
    });
    return;
  }

  console.error(
    "Unhandled error:",
    error instanceof Error ? error.message : error,
    error instanceof Error ? error.stack : "",
  );
  res.status(500).json({
    message: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  });
}
