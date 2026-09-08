import { ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

export function NotFoundPage() {
  return (
    <main className="commerce-page not-found-page">
      <Seo
        title="Page not found"
        description="The page you requested could not be found. Browse the Ysello marketplace or search the catalog."
        noIndex
      />
      <MarketHeader />
      <section className="not-found-card">
        <span>404</span>
        <h1>That page has moved or does not exist.</h1>
        <p>
          Try the product catalog, return to the marketplace, or contact support
          if a link brought you here.
        </p>
        <div>
          <Link className="primary-button" to="/catalog">
            <Search size={17} /> Browse catalog
          </Link>
          <Link className="secondary-button" to="/">
            <ArrowLeft size={17} /> Marketplace home
          </Link>
        </div>
      </section>
      <MarketFooter />
    </main>
  );
}
