import { app } from "./api-app.js";
import { env } from "./config/env.js";
import { YSELLO_RELEASE_ID, railwayReleaseMetadata } from "./config/release.js";
import { prisma } from "./lib/prisma.js";
import { ensureDefaultMarketplaceCategories } from "./services/category.service.js";
import {
  processPendingDarkShoppingFulfillments,
  syncDarkShoppingListings,
} from "./services/dark-shopping-resale.service.js";

const server = await (async () => {
  await ensureDefaultMarketplaceCategories();
  return app.listen(env.PORT, () => {
    console.log(`Ysello API ${YSELLO_RELEASE_ID} listening on port ${env.PORT}`, railwayReleaseMetadata());
  });
})().catch(async (error) => {
  console.error("API startup failed", error);
  await prisma.$disconnect();
  process.exit(1);
});

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
  if (supplierSyncTimer) clearInterval(supplierSyncTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
