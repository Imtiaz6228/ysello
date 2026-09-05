import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./WebApp";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./commerce/CartContext";
import "./styles.css";
import "./commerce.css";
import "./dashboard-polish.css";
import "./seller-premium.css";
import "./seller-premium-views.css";
import "./seller-premium-responsive.css";
import "./seller-complete.css";
import "./buyer-premium.css";
import "./admin-enterprise.css";
import "./seller-interactions.css";
import "./system-polish.css";
import "./marketplace-experience.css";
import "./enterprise-catalog.css";
import "./storefront-pro.css";
import "./final-polish.css";
import "./ui-audit.css";
import "./marketplace-refresh.css";
import "./marketplace-reference.css";
import "./commercial-premium.css";
import "./premium-redesign.css";
import "./product-grid.css";
import "./ysello-reference-redesign.css";
import "./marketplace-unified.css";
import "./g2a-inspired.css";
import "./wallet-platform-polish.css";
import "./commerce-complete.css";
import "./marketplace-premium-v2.css";
import "./marketplace-premium-v3.css";
import "./marketplace-premium-v4.css";
import "./marketplace-professional-v5.css";
import "./dashboard-professional-v6.css";
import "./dashboard-premium-v7.css";
import "./marketplace-professional-v6.css";
import "./professional-marketplace-v7.css";
import "./dark-shopping-storefront.css";
import { LocaleProvider } from "./i18n/LocaleContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <LocaleProvider>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </LocaleProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
);
