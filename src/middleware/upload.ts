import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";

export const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

fs.mkdirSync(uploadRoot, { recursive: true });

export const privateUploadRoot = path.isAbsolute(env.PRIVATE_UPLOAD_DIR)
  ? env.PRIVATE_UPLOAD_DIR
  : path.resolve(process.cwd(), env.PRIVATE_UPLOAD_DIR);

fs.mkdirSync(privateUploadRoot, { recursive: true });

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const diskImageUpload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
      return;
    }

    callback(null, true);
  },
});

async function persistPublicImage(file: Express.Multer.File) {
  const data = await fs.promises.readFile(file.path);
  await prisma.publicUpload.upsert({
    where: { fileName: file.filename },
    create: {
      fileName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      data,
    },
    update: {
      mimeType: file.mimetype,
      sizeBytes: file.size,
      data,
    },
  });
}

async function optimizeProductImage(file: Express.Multer.File) {
  const parsed = path.parse(file.filename);
  const optimizedFilename = `${parsed.name}.webp`;
  const optimizedPath = path.join(uploadRoot, optimizedFilename);
  const temporaryPath = `${file.path}.optimized.webp`;
  await sharp(file.path)
    .rotate()
    .resize({
      width: 1600,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4, smartSubsample: true })
    .toFile(temporaryPath);
  await fs.promises.unlink(file.path);
  await fs.promises.rename(temporaryPath, optimizedPath);
  const stat = await fs.promises.stat(optimizedPath);
  file.path = optimizedPath;
  file.filename = optimizedFilename;
  file.mimetype = "image/webp";
  file.size = stat.size;
}

export async function discardPublicImage(file?: Express.Multer.File) {
  if (!file) return;
  await Promise.all([
    fs.promises.unlink(file.path).catch(() => undefined),
    prisma.publicUpload
      .deleteMany({ where: { fileName: file.filename } })
      .catch(() => undefined),
  ]);
}

/**
 * Public images are written to the local upload cache and PostgreSQL before
 * the route handler runs. This keeps product images, store branding, profile
 * photos, and chat attachments available after a redeploy.
 */
export const imageUpload = {
  single(fieldName: string): RequestHandler {
    const parse = diskImageUpload.single(fieldName);
    return (req, res, next) => {
      parse(req, res, (error) => {
        if (error) {
          next(error);
          return;
        }
        if (!req.file) {
          next();
          return;
        }
        void persistPublicImage(req.file)
          .then(() => next())
          .catch(async (persistError) => {
            await fs.promises.unlink(req.file!.path).catch(() => undefined);
            next(persistError);
          });
      });
    };
  },
};

export const productImageUpload = {
  single(fieldName: string): RequestHandler {
    const parse = diskImageUpload.single(fieldName);
    return (req, res, next) => {
      parse(req, res, (error) => {
        if (error) {
          next(error);
          return;
        }
        if (!req.file) {
          next();
          return;
        }
        void optimizeProductImage(req.file)
          .then(() => persistPublicImage(req.file!))
          .then(() => next())
          .catch(async (optimizationError) => {
            await fs.promises.unlink(req.file!.path).catch(() => undefined);
            next(optimizationError);
          });
      });
    };
  },
};

export function publicUploadUrl(fileName: string) {
  return `${env.API_URL.replace(/\/+$/, "")}/uploads/${encodeURIComponent(fileName)}`;
}

const privateImageStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateUploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(
      null,
      `topup-proof-${Date.now()}-${crypto.randomUUID()}${extension}`,
    );
  },
});

export const topupProofUpload = multer({
  storage: privateImageStorage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
      return;
    }
    callback(null, true);
  },
});

export async function discardPrivateUpload(file?: Express.Multer.File) {
  if (!file) return;
  await fs.promises.unlink(file.path).catch(() => undefined);
}

const allowedProductTypes = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "application/octet-stream",
  "text/plain",
  "text/csv",
  "application/csv",
  "audio/mpeg",
  "video/mp4",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const productStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateUploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

export const productFileUpload = multer({
  storage: productStorage,
  limits: { fileSize: env.MAX_PRODUCT_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedProductTypes.has(file.mimetype)) {
      callback(new Error("This product file type is not allowed."));
      return;
    }
    callback(null, true);
  },
});

const allowedSellerDocumentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const sellerDocumentStorage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, privateUploadRoot),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

export const sellerDocumentUpload = multer({
  storage: sellerDocumentStorage,
  limits: {
    fileSize: env.MAX_UPLOAD_BYTES,
    files: 2,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedSellerDocumentTypes.has(file.mimetype)) {
      callback(
        new Error("Seller documents must be JPEG, PNG, WebP, or PDF files."),
      );
      return;
    }
    callback(null, true);
  },
});
