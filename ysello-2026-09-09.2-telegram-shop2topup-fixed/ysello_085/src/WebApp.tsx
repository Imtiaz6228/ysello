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

    if (navigator.webdriver) return;
    // Storage may be unavailable in privacy mode; tracking must not break the app.
    const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
    const write = (key: string, value: string) => { try { sessionStorage.setItem(key, value); } catch { /* optional */ } };
    const sessionKey = "ysello-engaged-visitor-v3";
    const firstSeenKey = "ysello-engaged-first-seen-v2";
    const pagesKey = "ysello-engaged-pages-v2";
    const interactionsKey = "ysello-engaged-interactions-v2";
    const firstSeen = Number(read(firstSeenKey) || Date.now());
    if (!read(firstSeenKey)) write(firstSeenKey, String(firstSeen));
    const visited = new Set<string>((() => { try { const v = JSON.parse(read(pagesKey) || "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; } })());
    visited.add(`${location.pathname}${location.search}`);
    write(pagesKey, JSON.stringify([...visited].slice(-50)));
    let interactions = Number(read(interactionsKey) || 0);
    let visibleSeconds = Math.max(0, Number(read("ysello-visible-v3")) || 0);
    let nextAttempt = 0;
    let sent = read(sessionKey) === "sent";

    let sessionToken = read("ysello-session-token-v4") || "";
    let requestingSession = false;
    let nextSessionAttempt = 0;
    const ensureSession = () => {
      const issued = Number(sessionToken.split(".")[0]);
      if (issued > 0 && Date.now() - issued < 90 * 60_000) return;
      sessionToken = "";
      if (requestingSession || Date.now() < nextSessionAttempt) return;
      requestingSession = true;
      nextSessionAttempt = Date.now() + 15000;
      void fetch("/api/visitor/session", { credentials: "include", cache: "no-store" })
        .then(async (response) => {
          const result = response.ok ? await response.json() : null;
          if (typeof result?.sessionToken === "string") {
            sessionToken = result.sessionToken;
            write("ysello-session-token-v4", sessionToken);
          }
        }).catch(() => {}).finally(() => { requestingSession = false; });
    };
    if (!sent) ensureSession();

    const onInteraction = (event: Event) => {
      if (!event.isTrusted || document.hidden) return;
      interactions += 1;
      write(interactionsKey, String(interactions));
    };
    window.addEventListener("pointerdown", onInteraction, { passive: true });
    window.addEventListener("keydown", onInteraction);
    window.addEventListener("wheel", onInteraction, { passive: true });

    const interval = window.setInterval(() => {
      if (!sent) ensureSession();
      if (!document.hidden) { visibleSeconds += 1; write("ysello-visible-v3", String(visibleSeconds)); }
      const dwellSeconds = Math.floor((Date.now() - firstSeen) / 1000);
      if (sent || !sessionToken || document.hidden || interactions < 1 || dwellSeconds < 35 || visibleSeconds < 30 || Date.now() < nextAttempt) return;
      nextAttempt = Date.now() + 15000;
      sent = true;
      const payload = {
        sessionToken,
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
      }).then(async (response) => {
        const result = response.ok ? await response.json() : null;
        if (result?.accepted === true) write(sessionKey, "sent");
        else sent = false;
      }).catch(() => { sent = false; });
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      window.removeEventListener("wheel", onInteraction);
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
