import { CatalogBrowser } from "../components/CatalogBrowser";
import { MarketHeader, MarketFooter } from "../components/MarketHeader";
export function CatalogPage() {
  return (
    <main className="ys-modern-catalog-page">
      <MarketHeader />
      <CatalogBrowser />
      <MarketFooter />
    </main>
  );
}
