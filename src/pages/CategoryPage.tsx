import { useParams } from "react-router-dom";
import { CatalogBrowser } from "../components/CatalogBrowser";
import { MarketHeader, MarketFooter } from "../components/MarketHeader";
export function CategoryPage() {
  const { slug } = useParams();
  return (
    <main className="ys-modern-catalog-page">
      <MarketHeader />
      <CatalogBrowser key={slug} categorySlug={slug} />
      <MarketFooter />
    </main>
  );
}
