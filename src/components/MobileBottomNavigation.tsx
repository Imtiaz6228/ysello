import {
  ClipboardList,
  Grid2X2,
  Home,
  Search,
  ShoppingBag,
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

  const accountPath = user ? "/dashboard" : "/sign-in";
  const isHomepage = location.pathname === "/";
  const browseIcon = isHomepage ? Grid2X2 : Search;
  const BrowseIcon = browseIcon;
  const thirdPath = isHomepage ? accountPath : "/cart";
  const ThirdIcon = isHomepage ? ClipboardList : ShoppingBag;

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
        <BrowseIcon aria-hidden="true" />
        <span>{isHomepage ? "Browse" : "Search"}</span>
      </Link>
      <Link
        className="mobile-cart-link"
        to={thirdPath}
        aria-current={location.pathname === thirdPath ? "page" : undefined}
      >
        <ThirdIcon aria-hidden="true" />
        {!isHomepage && count > 0 ? <b>{count > 99 ? "99+" : count}</b> : null}
        <span>{isHomepage ? "Orders" : "Cart"}</span>
      </Link>
      <Link
        to={accountPath}
        aria-current={location.pathname === accountPath ? "page" : undefined}
      >
        <UserRound aria-hidden="true" />
        <span>Account</span>
      </Link>
    </nav>
  );
}
