import { startCatalogTranslations } from "./services/catalog-translation.service.js";
import { app } from "./api-app.js";
import { env } from "./config/env.js";
import { YSELLO_RELEASE_ID, railwayReleaseMetadata } from "./config/release.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultMarketplaceCategories } from "./services/category.service.js";
import { submitFreshMarketplaceToIndexNow } from "./services/indexnow.service.js";
import { telegramDestinationChatId } from "./services/telegram-notify.service.js";
import { orderTelegramChatId } from "./services/order-telegram.service.js";
import {
  processPendingDarkShoppingFulfillments,
  syncDarkShoppingListings,
  repairDarkShoppingCatalog,
  importAllDarkShoppingLiveProducts,
} from "./services/dark-shopping-resale.service.js";

const server = await (async () => {
  await ensureDefaultMarketplaceCategories();
  const repair = await repairDarkShoppingCatalog();
  console.log("Ysello catalog classification", repair);
  return app.listen(env.PORT, () => {
    console.log(
      `Ysello API ${YSELLO_RELEASE_ID} listening on port ${env.PORT}`,
      railwayReleaseMetadata(),
    );
    console.log("Telegram visitor notifications", {
      enabled: env.VISITOR_NOTIFY_ENABLED,
      botConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
      chatConfigured: Boolean(telegramDestinationChatId()),
      chatId: telegramDestinationChatId(),
      includeBots: env.VISITOR_NOTIFY_INCLUDE_BOTS,
      dedupeMinutes: env.VISITOR_NOTIFY_DEDUPE_MINUTES,
    });
    console.log("Telegram order/top-up notifications", {
      enabled: env.ORDER_TELEGRAM_NOTIFICATIONS_ENABLED,
      botConfigured: Boolean(env.ORDER_TELEGRAM_BOT_TOKEN),
      chatConfigured: Boolean(orderTelegramChatId()),
      chatId: orderTelegramChatId(),
    });
  });
})().catch(async (error) => {
  console.error("API startup failed", error);
  await prisma.$disconnect();
  process.exit(1);
});

startCatalogTranslations();


// Notify IndexNow after a production deployment so Bing and other participating
// engines can discover newly changed public marketplace URLs quickly. XML
// sitemaps remain the complete source of canonical URLs for every crawler.
if (env.NODE_ENV === "production") {
  const indexNowTimer = setTimeout(() => {
    void submitFreshMarketplaceToIndexNow(30)
      .then((result) => console.log("IndexNow submission", result))
      .catch((error) =>
        console.warn(
          "IndexNow submission skipped:",
          error instanceof Error ? error.message : error,
        ),
      );
  }, 60_000);
  indexNowTimer.unref();
}

let supplierFulfillmentRunning = false;
const supplierFulfillmentTimer = env.DARK_SHOPPING_API_KEY
  ? setInterval(() => {
      if (supplierFulfillmentRunning) return;
      supplierFulfillmentRunning = true;
      void processPendingDarkShoppingFulfillments()
        .catch((error) => {
          console.error(
            "Dark Shopping fulfillment retry failed:",
            error instanceof Error ? error.message : error,
          );
        })
        .finally(() => {
          supplierFulfillmentRunning = false;
        });
    }, 15_000)
  : null;
supplierFulfillmentTimer?.unref();

let supplierCatalogImportRunning = false;
const runSupplierCatalogImport = async () => {
  if (supplierCatalogImportRunning) return;
  supplierCatalogImportRunning = true;
  try {
    const result = await importAllDarkShoppingLiveProducts();
    console.log("Dark Shopping live catalog import", {
      discovered: result.discovered,
      imported: result.imported,
      skipped: result.skipped.length,
      repaired: result.repaired,
    });
  } catch (error) {
    console.warn(
      "Dark Shopping live catalog import skipped:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    supplierCatalogImportRunning = false;
  }
};

const supplierCatalogInitialTimer = env.DARK_SHOPPING_API_KEY
  ? setTimeout(() => void runSupplierCatalogImport(), 2 * 60 * 1_000)
  : null;
supplierCatalogInitialTimer?.unref();
const supplierCatalogImportTimer = env.DARK_SHOPPING_API_KEY
  ? setInterval(() => void runSupplierCatalogImport(), 6 * 60 * 60 * 1_000)
  : null;
supplierCatalogImportTimer?.unref();

let supplierSyncRunning = false;
const supplierSyncTimer = env.DARK_SHOPPING_API_KEY
  ? setInterval(
      () => {
        if (supplierSyncRunning) return;
        supplierSyncRunning = true;
        void syncDarkShoppingListings()
          .catch((error) => {
            console.error(
              "Dark Shopping catalog synchronization failed:",
              error instanceof Error ? error.message : error,
            );
          })
          .finally(() => {
            supplierSyncRunning = false;
          });
      },
      15 * 60 * 1_000,
    )
  : null;
supplierSyncTimer?.unref();

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down.`);
  if (supplierFulfillmentTimer) clearInterval(supplierFulfillmentTimer);
  if (supplierCatalogInitialTimer) clearTimeout(supplierCatalogInitialTimer);
  if (supplierCatalogImportTimer) clearInterval(supplierCatalogImportTimer);
  if (supplierSyncTimer) clearInterval(supplierSyncTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
