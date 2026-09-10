import { lazy, Suspense, useEffect, useRef } from "react";
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
  const currentPath = useRef(location.pathname + location.search);
  currentPath.current = location.pathname + location.search;
  useEffect(() => {
    if (navigator.webdriver) return;
    const read = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
    const write = (key: string, value: string) => { try { sessionStorage.setItem(key, value); } catch { /* optional */ } };
    const notificationKey = "ysello-visitor-last-sent-v5";
    const privatePage = () => /^\/(?:admin|dashboard|seller|checkout|orders|support|cart|sign-in|sign-out|register|forgot-password|reset-password|verify-email|verify-required)(?:[/?]|$)/.test(currentPath.current);
    const started = performance.now();
    let previousTick = started;
    let visibleSeconds = 0;
    let interactions = 0;
    let token = "";
    let tokenPending = false;
    let pending = false;
    let nextTry = 0;
    let tokenRetry = 0;
    let disposed = false;
    const visited = new Set<string>();
    let lastNotified = Number(read(notificationKey) || 0);
    const wasNotified = () => Date.now() - lastNotified < 30 * 60_000;
    const ensureSession = () => {
      if (token || tokenPending || Date.now() < tokenRetry || wasNotified() || privatePage()) return;
      tokenPending = true;
      tokenRetry = Date.now() + 3000;
      void fetch("/api/visitor/session", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(8000) })
        .then(async (response) => {
          const data = response.ok ? await response.json() : null;
          if (!disposed && typeof data?.sessionToken === "string") token = data.sessionToken;
        }).catch(() => {}).finally(() => { tokenPending = false; });
    };
    const interaction = (event: Event) => { if (event.isTrusted && !document.hidden) interactions++; };
    window.addEventListener("pointerdown", interaction, { passive: true });
    window.addEventListener("keydown", interaction);
    window.addEventListener("wheel", interaction, { passive: true });
    // Prevent suspended/background time from being credited as visible reading.
    const visibilityChanged = () => { previousTick = performance.now(); };
    document.addEventListener("visibilitychange", visibilityChanged);
    ensureSession();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(1.5, Math.max(0, (now - previousTick) / 1000));
      previousTick = now;
      if (privatePage() || document.hidden || wasNotified()) return;
      visited.add(currentPath.current);
      visibleSeconds += delta;
      ensureSession();
      if (!token || pending || visibleSeconds < 35 || Date.now() < nextTry) return;
      pending = true;
      nextTry = Date.now() + 3000;
      void fetch("/api/visitor/notify", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          sessionToken: token,
          page: `https://ysello.com${currentPath.current}`,
          referrer: document.referrer || "Direct / none",
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screen: `${window.screen.width}x${window.screen.height}`,
          dwellSeconds: Math.floor((now - started) / 1000),
          visibilitySeconds: Math.floor(visibleSeconds), pagesViewed: visited.size, interactions,
        }),
      }).then(async (response) => {
        const data = response.ok ? await response.json() : null;
        if (data?.accepted === true) { lastNotified = Date.now(); write(notificationKey, String(lastNotified)); }
        if (data?.reason === "invalid_session") token = "";
      }).catch(() => {}).finally(() => { pending = false; });
    }, 500);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", interaction);
      window.removeEventListener("keydown", interaction);
      window.removeEventListener("wheel", interaction);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);
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
