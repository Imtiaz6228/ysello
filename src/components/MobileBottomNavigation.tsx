import { UiText } from "../i18n/UiText";
import { homePathForRole } from "../api/client";
import {
  Home,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../commerce/CartContext";

const hiddenPrefixes = [
  "/admin",
  "/seller",
  "/dashboard",
  "/orders",
  "/checkout",
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function MobileBottomNavigation() {
  const { user } = useAuth();
  const { count } = useCart();
  const location = useLocation();

  if (hiddenPrefixes.some((prefix) => location.pathname.startsWith(prefix))) {
    return null;
  }

  const accountPath = user ? homePathForRole(user.role) : "/sign-in";

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      <Link
        to="/"
        aria-current={location.pathname === "/" ? "page" : undefined}
      >
        <Home aria-hidden="true" />
        <span>Home</span>
      </Link>
      <Link
        to="/catalog"
        aria-current={location.pathname === "/catalog" ? "page" : undefined}
      >
        <Store aria-hidden="true" />
        <span>Marketplace</span>
      </Link>
      <Link
        className="mobile-cart-link"
        to="/cart"
        aria-current={location.pathname === "/cart" ? "page" : undefined}
      >
        <ShoppingBag aria-hidden="true" />
        {count > 0 ? <b>{count > 99 ? "99+" : count}</b> : null}
        <span><UiText value="Cart" /></span>
      </Link>
      <Link
        to={accountPath}
        aria-current={location.pathname === accountPath ? "page" : undefined}
      >
        <UserRound aria-hidden="true" />
        <span><UiText value="Account" /></span>
      </Link>
    </nav>
  );
}
