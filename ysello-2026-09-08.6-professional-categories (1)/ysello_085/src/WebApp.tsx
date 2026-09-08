import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { HomepageContentBanner } from "./components/HomepageContentBanner";
import { MobileBottomNavigation } from "./components/MobileBottomNavigation";
import { RouteLoading } from "./components/RouteLoading";
import { SupportWidgetPro } from "./components/SupportWidgetPro";
import { publicPages } from "./content/publicPages";
import { MarketplaceHomePage } from "./pages/MarketplaceHomePage";

const DiscoveryLandingPage = lazy(() =>
  import("./pages/DiscoveryLandingPage").then((module) => ({
    default: module.DiscoveryLandingPage,
  })),
);
const CatalogPage = lazy(() =>
  import("./pages/CatalogPage").then((module) => ({
    default: module.CatalogPage,
  })),
);
const CategoryPage = lazy(() =>
  import("./pages/CategoryPage").then((module) => ({
    default: module.CategoryPage,
  })),
);
const ProductPage = lazy(() =>
  import("./pages/ProductPage").then((module) => ({
    default: module.ProductPage,
  })),
);
const StorePage = lazy(() =>
  import("./pages/StorePage").then((module) => ({ default: module.StorePage })),
);
const CartPage = lazy(() =>
  import("./pages/CartPage").then((module) => ({ default: module.CartPage })),
);
const BlogPage = lazy(() =>
  import("./pages/BlogPage").then((module) => ({ default: module.BlogPage })),
);
const BlogArticlePage = lazy(() =>
  import("./pages/BlogArticlePage").then((module) => ({
    default: module.BlogArticlePage,
  })),
);
const LegalPage = lazy(() =>
  import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })),
);
const SignInPage = lazy(() =>
  import("./pages/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const AccountDashboardPage = lazy(() =>
  import("./pages/AccountDashboardPage").then((module) => ({
    default: module.AccountDashboardPage,
  })),
);
const OrderDeliveryPage = lazy(() =>
  import("./pages/OrderDeliveryPage").then((module) => ({
    default: module.OrderDeliveryPage,
  })),
);
const CheckoutPage = lazy(() =>
  import("./pages/CheckoutPage").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const OrderConfirmationPage = lazy(() =>
  import("./pages/OrderConfirmationPage").then((module) => ({
    default: module.OrderConfirmationPage,
  })),
);
const SupportPage = lazy(() =>
  import("./pages/SupportPage").then((module) => ({
    default: module.SupportPage,
  })),
);
const SignOutPage = lazy(() =>
  import("./pages/SignOutPage").then((module) => ({
    default: module.SignOutPage,
  })),
);
const OperationsAdminPage = lazy(() =>
  import("./pages/OperationsAdminPage").then((module) => ({
    default: module.OperationsAdminPage,
  })),
);
const AdminEarningsPage = lazy(() =>
  import("./pages/AdminEarningsPage").then((module) => ({
    default: module.AdminEarningsPage,
  })),
);
const SellerStudioPage = lazy(() =>
  import("./pages/SellerStudioPage").then((module) => ({
    default: module.SellerStudioPage,
  })),
);
const SellerApplicationPage = lazy(() =>
  import("./pages/SellerApplicationPage").then((module) => ({
    default: module.SellerApplicationPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

const legalRoutes = publicPages
  .map((page) => page.path)
  .filter((path) => !["/", "/catalog", "/blog"].includes(path));

function ScrollToTopOnRouteChange() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);
  return null;
}

function VisitorNotificationBeacon() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const privatePrefixes = [
      "/admin", "/dashboard", "/seller", "/checkout", "/orders", "/support",
      "/cart", "/sign-in", "/sign-out", "/register",
    ];
    if (privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return;

    const sessionKey = "ysello-engaged-visitor-v2";
    const firstSeenKey = "ysello-engaged-first-seen-v2";
    const pagesKey = "ysello-engaged-pages-v2";
    const interactionsKey = "ysello-engaged-interactions-v2";
    const firstSeen = Number(sessionStorage.getItem(firstSeenKey) || Date.now());
    if (!sessionStorage.getItem(firstSeenKey)) sessionStorage.setItem(firstSeenKey, String(firstSeen));
    const visited = new Set<string>(JSON.parse(sessionStorage.getItem(pagesKey) || "[]"));
    visited.add(`${location.pathname}${location.search}`);
    sessionStorage.setItem(pagesKey, JSON.stringify([...visited].slice(-50)));
    let interactions = Number(sessionStorage.getItem(interactionsKey) || 0);
    let visibleSeconds = 0;
    let sent = sessionStorage.getItem(sessionKey) === "sent";

    const onInteraction = () => {
      interactions += 1;
      sessionStorage.setItem(interactionsKey, String(interactions));
    };
    window.addEventListener("pointerdown", onInteraction, { passive: true });
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("scroll", onInteraction, { passive: true });

    const interval = window.setInterval(() => {
      if (!document.hidden) visibleSeconds += 1;
      const dwellSeconds = Math.floor((Date.now() - firstSeen) / 1000);
      if (sent || dwellSeconds < 35 || visibleSeconds < 30) return;
      sent = true;
      const payload = {
        page: `https://ysello.com${window.location.pathname}${window.location.search}`,
        referrer: document.referrer || "Direct / none",
        language: navigator.language || "Unknown",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
        dwellSeconds,
        visibilitySeconds: visibleSeconds,
        pagesViewed: visited.size,
        interactions,
      };
      void fetch("/api/visitor/notify", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).then((response) => {
        if (response.ok) sessionStorage.setItem(sessionKey, "sent");
        else sent = false;
      }).catch(() => { sent = false; });
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("scroll", onInteraction);
    };
  }, [location.pathname, location.search]);

  return null;
}

export function App() {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <VisitorNotificationBeacon />
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <HomepageContentBanner />
      <SupportWidgetPro />
      <MobileBottomNavigation />
      <div id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<MarketplaceHomePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/games" element={<DiscoveryLandingPage kind="games" />} />
            <Route path="/gift-cards" element={<DiscoveryLandingPage kind="gift-cards" />} />
            <Route path="/topups" element={<DiscoveryLandingPage kind="topups" />} />
            <Route
              path="/category/:rootSlug/:slug"
              element={<CategoryPage />}
            />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route
              path="/product/:rootSlug/:categorySlug/:slug"
              element={<ProductPage />}
            />
            <Route
              path="/product/:categorySlug/:slug"
              element={<ProductPage />}
            />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/products/:slug" element={<ProductPage />} />
            <Route path="/stores/:slug" element={<StorePage />} />
            <Route path="/cart/:productSlug" element={<CartPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            {legalRoutes.map((path) => (
              <Route path={path} element={<LegalPage />} key={path} />
            ))}
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<AccountDashboardPage />} />
              <Route
                path="/topup"
                element={<Navigate to="/dashboard#wallet" replace />}
              />
              <Route path="/orders/:id" element={<OrderDeliveryPage />} />
              <Route path="/checkout/:productSlug" element={<CheckoutPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route
                path="/checkout/:productSlug/confirmation"
                element={<OrderConfirmationPage />}
              />
              <Route
                path="/checkout/confirmation"
                element={<OrderConfirmationPage />}
              />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/sign-out" element={<SignOutPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute roles={["MODERATOR", "ADMIN", "SUPER_ADMIN"]} />
              }
            >
              <Route path="/admin" element={<OperationsAdminPage />} />
              <Route
                path="/admin/seller-applications"
                element={<OperationsAdminPage />}
              />
              <Route path="/admin/earnings" element={<AdminEarningsPage />} />
              <Route
                path="/admin/approvals"
                element={<OperationsAdminPage />}
              />
              <Route path="/admin/live" element={<OperationsAdminPage />} />
              <Route
                path="/admin/kb/editor"
                element={<OperationsAdminPage />}
              />
            </Route>

            <Route
              element={
                <ProtectedRoute roles={["SELLER", "ADMIN", "SUPER_ADMIN"]} />
              }
            >
              <Route path="/seller" element={<SellerStudioPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/seller/apply" element={<SellerApplicationPage />} />
            </Route>

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  );
}
