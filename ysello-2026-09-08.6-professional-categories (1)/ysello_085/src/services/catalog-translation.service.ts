import { createHash } from "node:crypto";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type SavedTranslations = Record<string, Record<string, string>>;
export const catalogTranslationStatus = {
  running: false,
  scanned: 0,
  translated: 0,
  failed: 0,
  lastError: "",
  completedAt: null as string | null,
};
let cursor: string | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
async function translate(text: string, locale: string) {
  if (!text.trim()) return "";
  const result: string[] = [];
  for (const chunk of text.match(/[\s\S]{1,2500}/g) || []) {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: locale,
      dt: "t",
      q: chunk,
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok)
      throw new Error(`Title translation service returned ${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || !Array.isArray(payload[0]))
      throw new Error("Invalid title translation response");
    const value = payload[0]
      .map((part: unknown) =>
        Array.isArray(part) && typeof part[0] === "string" ? part[0] : "",
      )
      .join("");
    if (!value.trim()) throw new Error("Empty title translation response");
    result.push(value);
  }
  return result.join("");
}
// Work is bounded and off the checkout/import request path. Existing seller translations win.
async function batch() {
  if (catalogTranslationStatus.running) return;
  catalogTranslationStatus.running = true;
  let finished = false;
  try {
    const products = await prisma.product.findMany({
      where: { status: ProductStatus.APPROVED },
      orderBy: { id: "asc" },
      take: 20,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        shortDescription: true,
        translations: true,
        updatedAt: true,
      },
    });
    for (const product of products) {
      cursor = product.id;
      catalogTranslationStatus.scanned++;
      try {
        const saved = (
          product.translations &&
          typeof product.translations === "object" &&
          !Array.isArray(product.translations)
            ? product.translations
            : {}
        ) as SavedTranslations;
        const next = structuredClone(saved);
        const source = createHash("sha256")
          .update(product.name + "\n" + product.shortDescription)
          .digest("hex");
        let changed = false;
        for (const locale of ["en", "zh-CN", "ru"]) {
          const generated = saved._yselloGenerated?.[locale];
          if (saved[locale]?.title && (!generated || generated === source))
            continue;
          const title = await translate(product.name, locale);
          const shortDescription = await translate(
            product.shortDescription,
            locale,
          );
          next[locale] = {
            ...next[locale],
            title,
            shortDescription,
            seoTitle: title.slice(0, 100),
            seoDescription: shortDescription.slice(0, 160),
          };
          next._yselloGenerated = {
            ...next._yselloGenerated,
            [locale]: source,
          };
          changed = true;
        }
        if (changed) {
          const result = await prisma.product.updateMany({
            where: { id: product.id, updatedAt: product.updatedAt },
            data: { translations: next as Prisma.InputJsonValue },
          });
          catalogTranslationStatus.translated += result.count;
        }
      } catch (error) {
        catalogTranslationStatus.failed++;
        catalogTranslationStatus.lastError =
          error instanceof Error ? error.message : "Translation failed";
      }
    }
    finished = products.length < 20;
    if (finished) {
      cursor = undefined;
      catalogTranslationStatus.completedAt = new Date().toISOString();
    }
  } catch (error) {
    catalogTranslationStatus.lastError =
      error instanceof Error ? error.message : "Translation batch failed";
  } finally {
    catalogTranslationStatus.running = false;
    timer = setTimeout(() => void batch(), finished ? 30 * 60_000 : 10_000);
    timer.unref();
  }
}
export function startCatalogTranslations(retry = false) {
  if (catalogTranslationStatus.running) return catalogTranslationStatus;
  if (timer) clearTimeout(timer);
  if (retry) {
    cursor = undefined;
    catalogTranslationStatus.failed = 0;
    catalogTranslationStatus.lastError = "";
    catalogTranslationStatus.scanned = 0;
    catalogTranslationStatus.translated = 0;
    catalogTranslationStatus.completedAt = null;
  }
  void batch();
  return catalogTranslationStatus;
}
