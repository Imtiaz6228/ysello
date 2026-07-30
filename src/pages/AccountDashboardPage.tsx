import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Download,
  FileText,
  Headphones,
  Home,
  LogOut,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  TicketCheck,
  TrendingUp,
  UserRound,
  Activity,
  Wallet,
  CreditCard,
  Bitcoin,
  DollarSign,
  PlusCircle,
  Gavel,
  MessageSquare,
  LockKeyhole,
  Bell,
  Search,
  ChevronDown,
  Smartphone,
  ClipboardCopy,
  UploadCloud,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Menu,
  X,
  Heart,
  Gift,
  Tag,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  Award,
  History,
  KeyRound,
  PackageOpen,
  ListChecks,
  Percent,
  Bookmark,
  ReceiptText,
  ImageIcon,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import {
  ApiError,
  apiDownloadUrl,
  apiRequest,
  mediaUrl,
  STAFF_ROLES,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";
import { EarningsChart } from "../components/EarningsChart";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";

type Grant = {
  id: string;
  downloadCount: number;
  maxDownloads: number;
  expiresAt: string;
  revokedAt?: string | null;
  productFile: { displayName: string; version: number };
};
type InventoryItem = {
  id: string;
  content: string;
  source: string;
  deliveredAt?: string | null;
};
type Order = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  canOpenDispute?: boolean;
  disputeDeadline?: string;
  disputeWindowHours?: number;
  payment?: { method: string; status: string };
  items: Array<{
    id: string;
    productName: string;
    product: {
      slug: string;
      type: string;
      coverImageUrl?: string;
      afterSalesServiceHours?: number;
    };
    downloadGrants: Grant[];
    inventoryItems?: InventoryItem[];
  }>;
  refunds: Array<{ status: string }>;
  disputes: Array<{
    id?: string;
    status: string;
    subject?: string;
    refundDemanded?: boolean;
  }>;
};

type Chat = {
  id: string;
  orderNumber: string;
  status: string;
  updatedAt: string;
  items: Array<{
    productName: string;
    product?: { slug?: string; coverImageUrl?: string | null };
  }>;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { firstName: string; role: string };
  }>;
  disputes: Array<{ status: string }>;
};
type Dispute = {
  id: string;
  status: string;
  subject: string;
  description: string;
  refundDemanded?: boolean;
  awaitingParty?: string | null;
  autoCloseAt?: string | null;
  closedInFavorOf?: string | null;
  resolution?: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    items: Array<{
      productName: string;
      product?: { name?: string; slug?: string; coverImageUrl?: string | null };
    }>;
  };
  orderItem?: {
    product?: { name?: string; slug?: string; coverImageUrl?: string | null };
  } | null;
};
type SellerFinance = {
  availableBalanceCents: number;
  frozenBalanceCents: number;
  totalSellerEarningsCents: number;
  withdrawnCents: number;
  todayIncomeCents: number;
  todayOrderCount: number;
};
type Ticket = {
  id: string;
  ticketNumber: string;
  category: string;
  status: string;
  subject: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    body: string;
    author: { firstName: string; role: string };
  }>;
};
type Review = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  product: { name: string; slug: string };
  sellerResponse?: string;
};
type Tab =
  | "overview"
  | "orders"
  | "active-orders"
  | "completed-orders"
  | "pending-orders"
  | "cancelled-orders"
  | "refunds"
  | "downloads"
  | "purchased-products"
  | "license-keys"
  | "activation-codes"
  | "delivery-history"
  | "wishlist"
  | "cart"
  | "favorites"
  | "chats"
  | "messages"
  | "disputes"
  | "tickets"
  | "notifications"
  | "reviews"
  | "wallet"
  | "transactions"
  | "coupons"
  | "gift-cards"
  | "rewards"
  | "cashback"
  | "profile"
  | "security"
  | "addresses"
  | "payment-methods"
  | "preferences"
  | "seller";

function BuyerMedia({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return src && !failed ? (
    <img
      src={mediaUrl(src)}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      className={`${className ?? ""} buyer-media-fallback`}
      role="img"
      aria-label={`${alt} image unavailable`}
    >
      {fallback ?? <ImageIcon size={22} />}
    </span>
  );
}

const tabs: Array<{
  id: Tab;
  label: string;
  icon: typeof Home;
  roles?: string[];
}> = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "orders", label: "My Orders", icon: ShoppingBag },
  { id: "active-orders", label: "Active Orders", icon: Activity },
  { id: "completed-orders", label: "Completed Orders", icon: CheckCircle2 },
  { id: "pending-orders", label: "Pending Orders", icon: Clock3 },
  { id: "cancelled-orders", label: "Cancelled Orders", icon: X },
  { id: "refunds", label: "Refund Requests", icon: RefreshCw },
  { id: "disputes", label: "Disputes", icon: Gavel },
  { id: "purchased-products", label: "Purchased Products", icon: PackageOpen },
  { id: "downloads", label: "Downloads", icon: Download },
  { id: "license-keys", label: "License Keys", icon: KeyRound },
  { id: "activation-codes", label: "Activation Codes", icon: ListChecks },
  { id: "delivery-history", label: "Delivery History", icon: History },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "cart", label: "Shopping Cart", icon: ShoppingBag },
  { id: "favorites", label: "Favorites", icon: Bookmark },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "chats", label: "Seller Chat", icon: MessageCircle },
  { id: "tickets", label: "Support Tickets", icon: Headphones },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "wallet", label: "Balance & Top Up", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ReceiptText },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "gift-cards", label: "Gift Cards", icon: Gift },
  { id: "rewards", label: "Rewards", icon: Award },
  { id: "cashback", label: "Cashback", icon: Percent },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "seller", label: "Seller Hub", icon: Store, roles: ["SELLER"] },
];

const buyerMenuGroups: Array<{
  label: string;
  items: Array<{ tab: Tab; label: string; icon: typeof Home }>;
}> = [
  {
    label: "Dashboard",
    items: [{ tab: "overview", label: "Overview", icon: Home }],
  },
  {
    label: "Purchases",
    items: [
      { tab: "orders", label: "Orders", icon: ShoppingBag },
      { tab: "refunds", label: "Refunds", icon: RefreshCw },
      { tab: "disputes", label: "Disputes", icon: Gavel },
    ],
  },
  {
    label: "Digital Library",
    items: [
      { tab: "purchased-products", label: "My library", icon: PackageOpen },
      { tab: "wishlist", label: "Saved products", icon: Heart },
      { tab: "cart", label: "Shopping cart", icon: ShoppingBag },
    ],
  },
  {
    label: "Inbox",
    items: [
      { tab: "messages", label: "Order messages", icon: MessageSquare },
      { tab: "tickets", label: "Support", icon: TicketCheck },
      { tab: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Wallet",
    items: [
      { tab: "wallet", label: "Balance & top up", icon: Wallet },
      { tab: "transactions", label: "Transactions", icon: ReceiptText },
    ],
  },
  {
    label: "Account",
    items: [
      { tab: "profile", label: "Profile", icon: UserRound },
      { tab: "security", label: "Security", icon: ShieldCheck },
      { tab: "reviews", label: "My reviews", icon: Star },
    ],
  },
];

function roleDashboardRedirect(role: string) {
  if (STAFF_ROLES.some((staffRole) => staffRole === role)) return "/admin";
  return null;
}

export function AccountDashboardPage() {
  const { user } = useAuth();
  const { formatMoney } = useLocale();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    return tabs.some((item) => item.id === hash) ? hash : "overview";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      Dashboard: true,
      Purchases: true,
      "Digital Library": true,
      Inbox: true,
      Wallet: true,
      Account: true,
    },
  );
  function selectTab(next: Tab) {
    setTabState(next);
    setDrawerOpen(false);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${next}`,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (tabs.some((item) => item.id === hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerReviews, setSellerReviews] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerTickets, setSellerTickets] = useState<any[]>([]);
  const [sellerDisputes, setSellerDisputes] = useState<any[]>([]);
  const [sellerFinance, setSellerFinance] = useState<SellerFinance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [dataIssue, setDataIssue] = useState("");
  const [dashboardQuery, setDashboardQuery] = useState("");
  const [message, setMessage] = useState("");
  const [walletBalance, setWalletBalance] = useState(user?.balanceCents ?? 0);
  const userId = user?.id;
  const userBalanceCents = user?.balanceCents;

  const downloads = useMemo(
    () =>
      orders.flatMap((order) =>
        order.items.flatMap((item) =>
          item.downloadGrants.map((grant) => ({ order, item, grant })),
        ),
      ),
    [orders],
  );
  const purchasedItems = useMemo(
    () =>
      orders.flatMap((order) => order.items.map((item) => ({ order, item }))),
    [orders],
  );
  const deliveredItems = useMemo(
    () =>
      purchasedItems.filter(({ item }) => Boolean(item.inventoryItems?.length)),
    [purchasedItems],
  );
  const availableFileCount = downloads.length + deliveredItems.length;
  const totalSpent = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            !["AWAITING_PAYMENT", "CANCELLED", "REFUNDED"].includes(
              order.status,
            ),
        )
        .reduce((sum, order) => sum + order.totalCents, 0),
    [orders],
  );
  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        ["PAID", "PROCESSING", "DISPUTED"].includes(order.status),
      ).length,
    [orders],
  );
  const normalizedQuery = dashboardQuery.trim().toLowerCase();
  const visibleOrders = useMemo(() => {
    let result = orders;
    if (tab === "active-orders")
      result = orders.filter((order) =>
        ["PAID", "PROCESSING", "DISPUTED"].includes(order.status),
      );
    if (tab === "completed-orders")
      result = orders.filter((order) =>
        ["COMPLETED", "DELIVERED"].includes(order.status),
      );
    if (tab === "pending-orders")
      result = orders.filter((order) =>
        ["AWAITING_PAYMENT", "PAID", "PROCESSING"].includes(order.status),
      );
    if (tab === "cancelled-orders")
      result = orders.filter((order) =>
        ["CANCELLED", "REFUNDED"].includes(order.status),
      );
    if (!normalizedQuery) return result;
    return result.filter((order) =>
      `${order.orderNumber} ${order.invoiceNumber} ${order.status} ${order.items.map((item) => item.productName).join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, orders, tab]);

  const dashboardMatches = useMemo(() => {
    if (!normalizedQuery) return [];
    return [
      ...orders
        .filter((order) =>
          `${order.orderNumber} ${order.invoiceNumber} ${order.items.map((item) => item.productName).join(" ")}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 4)
        .map((order) => ({
          key: order.id,
          tab: "orders" as Tab,
          label: order.orderNumber,
          detail: order.items.map((item) => item.productName).join(", "),
          icon: ShoppingBag,
        })),
      ...chats
        .filter((chat) =>
          `${chat.orderNumber} ${chat.items.map((item) => item.productName).join(" ")}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 3)
        .map((chat) => ({
          key: chat.id,
          tab: "messages" as Tab,
          label: chat.orderNumber,
          detail: "Order conversation",
          icon: MessageSquare,
        })),
      ...disputes
        .filter((dispute) =>
          `${dispute.subject} ${dispute.order.orderNumber}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 3)
        .map((dispute) => ({
          key: dispute.id,
          tab: "disputes" as Tab,
          label: dispute.subject,
          detail: dispute.order.orderNumber,
          icon: Gavel,
        })),
      ...tickets
        .filter((ticket) =>
          `${ticket.ticketNumber} ${ticket.subject}`
            .toLowerCase()
            .includes(normalizedQuery),
        )
        .slice(0, 3)
        .map((ticket) => ({
          key: ticket.id,
          tab: "tickets" as Tab,
          label: ticket.subject,
          detail: ticket.ticketNumber,
          icon: Headphones,
        })),
    ].slice(0, 8);
  }, [chats, disputes, normalizedQuery, orders, tickets]);

  const loadBuyerData = useCallback(async () => {
    setLoading(true);
    setDataIssue("");
    const results = await Promise.allSettled([
      apiRequest<{ orders: Order[] }>("/api/commerce/orders").then((data) =>
        setOrders(data.orders),
      ),
      apiRequest<{ tickets: Ticket[] }>("/api/commerce/tickets").then((data) =>
        setTickets(data.tickets),
      ),
      apiRequest<{ reviews: Review[] }>("/api/commerce/reviews").then((data) =>
        setReviews(data.reviews),
      ),
      apiRequest<{ chats: Chat[] }>("/api/commerce/chats").then((data) =>
        setChats(data.chats),
      ),
      apiRequest<{ disputes: Dispute[] }>("/api/commerce/disputes").then(
        (data) => setDisputes(data.disputes),
      ),
    ]);
    const failures = results.filter(
      (result) => result.status === "rejected",
    ).length;
    if (failures)
      setDataIssue(
        failures === results.length
          ? "Your dashboard could not be loaded."
          : "Some dashboard sections could not be refreshed.",
      );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBuyerData();
  }, [loadBuyerData]);

  useEffect(() => {
    if (!userId) return;
    setWalletBalance(userBalanceCents ?? 0);
    const refreshBalance = () =>
      apiRequest<{ balanceCents: number; availableBalanceCents?: number }>(
        "/api/wallet/balance",
      )
        .then((data) =>
          setWalletBalance(data.availableBalanceCents ?? data.balanceCents),
        )
        .catch(() => undefined);
    void refreshBalance();
    const interval = window.setInterval(() => void refreshBalance(), 12000);
    return () => window.clearInterval(interval);
  }, [userBalanceCents, userId]);

  useEffect(() => {
    if (tab === "seller" && user?.role === "SELLER") {
      setLoading(true);
      void Promise.all([
        apiRequest<{ items: any[] }>("/api/seller/orders")
          .then((d) => setSellerOrders(d.items))
          .catch(() => undefined),
        apiRequest<{ products: any[] }>("/api/seller/products")
          .then((d) => setSellerProducts(d.products))
          .catch(() => undefined),
        apiRequest<{ reviews: any[] }>("/api/seller/reviews")
          .then((d) => setSellerReviews(d.reviews))
          .catch(() => undefined),
        apiRequest<{ tickets: any[] }>("/api/seller/tickets")
          .then((d) => setSellerTickets(d.tickets))
          .catch(() => undefined),
        apiRequest<{ profile: any }>("/api/seller/profile")
          .then((d) => setSellerProfile(d.profile))
          .catch(() => undefined),
        apiRequest<{ disputes: any[] }>("/api/seller/disputes")
          .then((d) => setSellerDisputes(d.disputes))
          .catch(() => undefined),
        apiRequest<{ summary: SellerFinance }>("/api/seller/finance")
          .then((d) => setSellerFinance(d.summary))
          .catch(() => undefined),
      ]).finally(() => setLoading(false));
    }
  }, [tab, user?.role]);

  async function requestRefund(order: Order) {
    const reason = window.prompt(
      "Tell us what went wrong (at least 20 characters):",
    );
    if (!reason) return;
    try {
      await apiRequest(`/api/commerce/orders/${order.id}/refunds`, {
        method: "POST",
        body: { reason },
      });
      setMessage(
        "Refund request submitted. Support will review the order record.",
      );
      const data = await apiRequest<{ orders: Order[] }>(
        "/api/commerce/orders",
      );
      setOrders(data.orders);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not submit the request.",
      );
    }
  }
  async function openDispute(order: Order) {
    const subject = window.prompt("Dispute subject (5+ characters):");
    if (!subject || subject.trim().length < 5) return;
    const description = window.prompt("Describe the issue (20+ characters):");
    if (!description || description.trim().length < 20) return;
    try {
      const demandRefund = window.confirm(
        "Also demand a refund with this dispute?",
      );
      await apiRequest(`/api/commerce/orders/${order.id}/disputes`, {
        method: "POST",
        body: { subject, description, demandRefund },
      });
      setMessage(
        "Dispute opened. Admin support can now review the order, chat, and delivery record.",
      );
      const data = await apiRequest<{ orders: Order[] }>(
        "/api/commerce/orders",
      );
      setOrders(data.orders);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not open a dispute.",
      );
    }
  }
  async function closeDispute(disputeId: string) {
    const resolution =
      window.prompt("Optional closing note:") ?? "Closed by buyer.";
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/close`, {
        method: "POST",
        body: { resolution },
      });
      setMessage("Dispute closed.");
      const data = await apiRequest<{ disputes: Dispute[] }>(
        "/api/commerce/disputes",
      );
      setDisputes(data.disputes);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not close dispute.",
      );
    }
  }

  async function demandDisputeRefund(disputeId: string) {
    const reason =
      window.prompt("Refund demand reason:") ?? "Refund demanded from dispute.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/commerce/disputes/${disputeId}/refund`, {
        method: "POST",
        body: { reason },
      });
      setMessage("Refund demand sent to admin.");
      const data = await apiRequest<{ disputes: Dispute[] }>(
        "/api/commerce/disputes",
      );
      setDisputes(data.disputes);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not demand refund.",
      );
    }
  }

  async function sellerRefund(orderId: string, amountCents: number) {
    const reason =
      window.prompt("Refund reason to admin:") ?? "Seller requested refund.";
    if (reason.trim().length < 10) return;
    try {
      await apiRequest(`/api/seller/orders/${orderId}/refund`, {
        method: "POST",
        body: { reason, amountCents },
      });
      setMessage("Seller refund request sent to admin.");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not request seller refund.",
      );
    }
  }

  async function createTicket() {
    const subject = window.prompt("Subject (5+ characters):");
    if (!subject || subject.length < 5) return;
    const body = window.prompt("Describe the issue (10+ characters):");
    if (!body || body.length < 10) return;
    try {
      await apiRequest("/api/commerce/tickets", {
        method: "POST",
        body: { category: "TECHNICAL_ISSUE", subject, body },
      });
      setMessage("Support ticket created.");
      const data = await apiRequest<{ tickets: Ticket[] }>(
        "/api/commerce/tickets",
      );
      setTickets(data.tickets);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not create ticket.",
      );
    }
  }
  async function replyToTicket(ticketId: string) {
    const body = window.prompt("Your reply:");
    if (!body) return;
    try {
      await apiRequest(`/api/commerce/tickets/${ticketId}/messages`, {
        method: "POST",
        body: { body },
      });
      setMessage("Reply sent.");
      const data = await apiRequest<{ tickets: Ticket[] }>(
        "/api/commerce/tickets",
      );
      setTickets(data.tickets);
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not send reply.",
      );
    }
  }
  async function submitSellerReply(reviewId: string) {
    const response = window.prompt("Your response (public):");
    if (!response) return;
    try {
      await apiRequest(`/api/seller/reviews/${reviewId}/respond`, {
        method: "POST",
        body: { response },
      });
      setMessage("Review response posted.");
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : "Could not respond.",
      );
    }
  }

  async function leaveReview(orderItemId: string) {
    const rating = Number(window.prompt("Rating from 1 to 5:", "5"));
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return setMessage("Choose a rating from 1 to 5.");
    const body = window.prompt(
      "Share your experience (at least 10 characters):",
    );
    if (!body || body.trim().length < 10) return;
    try {
      await apiRequest("/api/commerce/reviews", {
        method: "POST",
        body: { orderItemId, rating, body: body.trim(), mediaUrls: [] },
      });
      setMessage("Review submitted. Thank you for helping other buyers.");
      const data = await apiRequest<{ reviews: Review[] }>(
        "/api/commerce/reviews",
      );
      setReviews(data.reviews);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not submit your review.",
      );
    }
  }

  if (!user) return null;
  const redirectPath = roleDashboardRedirect(user.role);
  if (redirectPath) return <Navigate to={redirectPath} replace />;

  const sellerRevenue =
    sellerFinance?.totalSellerEarningsCents ??
    sellerOrders?.reduce((sum: number, item: any) => {
      if (
        item.order?.status &&
        !["REFUNDED", "CANCELLED"].includes(item.order.status)
      )
        return sum + item.totalCents;
      return sum;
    }, 0) ??
    0;
  const pendingSellerOrders =
    sellerOrders?.filter((item: any) =>
      ["PROCESSING", "PAID", "DISPUTED"].includes(item.order?.status),
    ).length ?? 0;

  return (
    <main className="account-dashboard-page buyer-premium-dashboard">
      <Seo
        title="Account dashboard"
        description="Manage Ysello orders, downloads, invoices, support, and seller activity."
        noIndex
      />

      {drawerOpen ? (
        <button
          className="buyer-drawer-backdrop"
          aria-label="Close buyer menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <nav
        className={`dashboard-sidebar buyer-sidebar ${drawerOpen ? "open" : ""}`}
      >
        <Link className="brand-lockup" to="/">
          <img
            className="brand-glyph"
            src="/ysello-mark.svg"
            alt=""
            width="44"
            height="44"
          />
          <span>
            <strong>YSELLO</strong>
            <small>BUYER CENTER</small>
          </span>
        </Link>
        <button
          className="buyer-sidebar-close"
          aria-label="Close buyer menu"
          onClick={() => setDrawerOpen(false)}
        >
          <X />
        </button>
        <div className="sidebar-user">
          <span className="sidebar-avatar">
            {user.firstName[0]}
            {user.lastName[0]}
          </span>
          <div>
            <strong>
              {user.firstName} {user.lastName}
            </strong>
            <small>@{user.username}</small>
          </div>
          <span className="role-pill-small">
            <BadgeCheck size={12} /> Verified buyer
          </span>
        </div>
        <div className="panel-mobile-sidebar-tools">
          <LocaleSwitcher compact />
          <Link to="/sign-out">
            <LogOut size={16} /> Sign out
          </Link>
        </div>
        <div className="sidebar-nav buyer-grouped-nav">
          {buyerMenuGroups.map((group) => (
            <section key={group.label}>
              <button
                type="button"
                className="buyer-nav-group"
                onClick={() =>
                  setExpandedGroups({
                    ...expandedGroups,
                    [group.label]: !expandedGroups[group.label],
                  })
                }
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={expandedGroups[group.label] ? "rotated" : ""}
                />
              </button>
              {expandedGroups[group.label] ? (
                <div>
                  {group.items.map(({ tab: itemTab, label, icon: Icon }) => (
                    <button
                      key={`${group.label}-${itemTab}`}
                      className={tab === itemTab ? "active" : ""}
                      onClick={() => selectTab(itemTab)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {itemTab === "active-orders" && activeOrders ? (
                        <b>{activeOrders}</b>
                      ) : null}
                      {itemTab === "chats" && chats.length ? (
                        <b>{chats.length}</b>
                      ) : null}
                      {itemTab === "notifications" &&
                      tickets.filter(
                        (ticket) =>
                          !["CLOSED", "RESOLVED"].includes(ticket.status),
                      ).length ? (
                        <b>
                          {
                            tickets.filter(
                              (ticket) =>
                                !["CLOSED", "RESOLVED"].includes(ticket.status),
                            ).length
                          }
                        </b>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
        <div className="sidebar-footer">
          <Link to="/" className="secondary-button">
            <Home size={16} /> Home
          </Link>
          <Link to="/catalog" className="secondary-button">
            <Sparkles size={16} /> Explore marketplace
          </Link>
          <Link to="/sign-out" className="danger-button">
            <LogOut size={16} /> Logout
          </Link>
        </div>
      </nav>

      <section className="dashboard-main">
        <div className="dashboard-command-bar">
          <button
            className="buyer-mobile-menu"
            aria-label="Open buyer menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu />
          </button>
          <label>
            <Search size={16} />
            <input
              aria-label="Search dashboard"
              value={dashboardQuery}
              onChange={(event) => setDashboardQuery(event.target.value)}
              placeholder="Search orders, messages, disputes…"
            />
            {dashboardQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setDashboardQuery("")}
              >
                <X size={15} />
              </button>
            ) : null}
          </label>
          <div>
            <span className="buyer-sync-pill">
              <i /> ACCOUNT
            </span>
            <Link className="panel-home-link" to="/" aria-label="Go to home">
              <Home size={17} /> Home
            </Link>
            <LocaleSwitcher />
            <button
              className="command-icon"
              aria-label="Notifications"
              onClick={() => selectTab("notifications")}
            >
              <Bell size={18} />
              <span />
            </button>
            <Link
              className="account-switcher"
              to="/sign-out"
              title="Open sign-out page"
            >
              <span>
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <b>{user.firstName}</b>
              <LogOut size={15} />
            </Link>
          </div>
        </div>
        {dashboardQuery ? (
          <div
            className="buyer-command-results"
            role="region"
            aria-label="Dashboard search results"
          >
            {dashboardMatches.length ? (
              dashboardMatches.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    type="button"
                    key={`${result.tab}-${result.key}`}
                    onClick={() => {
                      selectTab(result.tab);
                      setDashboardQuery("");
                    }}
                  >
                    <Icon />
                    <span>
                      <strong>{result.label}</strong>
                      <small>{result.detail}</small>
                    </span>
                    <ArrowRight />
                  </button>
                );
              })
            ) : (
              <p>
                <Search /> No dashboard records match “{dashboardQuery}”.
              </p>
            )}
          </div>
        ) : null}
        {message ? (
          <div className="dashboard-message" onClick={() => setMessage("")}>
            {message} <small>(click to dismiss)</small>
          </div>
        ) : null}
        {dataIssue ? (
          <div className="dashboard-load-warning" role="alert">
            <ShieldAlert />
            <span>
              <strong>{dataIssue}</strong>
              <small>Your existing records have not been changed.</small>
            </span>
            <button
              type="button"
              onClick={() => void loadBuyerData()}
              disabled={loading}
            >
              <RefreshCw /> {loading ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : null}

        {tab === "overview" && (
          <div className="tab-content overview-tab">
            <section className="buyer-welcome-hero">
              <div>
                <span className="buyer-live-badge">
                  <i /> BUYER WORKSPACE
                </span>
                <h1>Welcome back, {user.firstName}.</h1>
                <p>
                  Start with what needs attention, then move into orders, your
                  library, messages, or account security.
                </p>
                <div>
                  <b>
                    <PackageCheck /> Digital delivery center
                  </b>
                  <b>
                    <BadgeCheck />{" "}
                    {user.emailVerified
                      ? "Verified account"
                      : "Verification pending"}
                  </b>
                </div>
              </div>
              <aside>
                <small>AVAILABLE BALANCE</small>
                <strong>{formatMoney(walletBalance)}</strong>
                <button type="button" onClick={() => selectTab("wallet")}>
                  <PlusCircle /> Add funds
                </button>
              </aside>
            </section>
            <div className="metrics-grid buyer-metrics-grid">
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("orders")}
              >
                <ShoppingBag size={22} />
                <span>
                  <strong>{orders.length}</strong>
                  <small>Total orders</small>
                </span>
                <ArrowRight />
              </button>
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("orders")}
              >
                <Activity size={22} />
                <span>
                  <strong>{activeOrders}</strong>
                  <small>Orders in progress</small>
                </span>
                <ArrowRight />
              </button>
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("purchased-products")}
              >
                <Download size={22} />
                <span>
                  <strong>{availableFileCount}</strong>
                  <small>Library items</small>
                </span>
                <ArrowRight />
              </button>
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("wallet")}
              >
                <Wallet size={22} />
                <span>
                  <strong>{formatMoney(walletBalance)}</strong>
                  <small>Available balance</small>
                </span>
                <ArrowRight />
              </button>
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("purchased-products")}
              >
                <TrendingUp size={22} />
                <span>
                  <strong>{formatMoney(totalSpent)}</strong>
                  <small>Purchase history</small>
                </span>
                <ArrowRight />
              </button>
              <button
                type="button"
                className="metric-card dashboard-metric-link"
                onClick={() => selectTab("tickets")}
              >
                <TicketCheck size={22} />
                <span>
                  <strong>
                    {
                      tickets.filter(
                        (t) => t.status !== "CLOSED" && t.status !== "RESOLVED",
                      ).length
                    }
                  </strong>
                  <small>Open tickets</small>
                </span>
                <ArrowRight />
              </button>
            </div>
            <button
              type="button"
              className="buyer-topup-hero"
              onClick={() => selectTab("wallet")}
            >
              <span className="buyer-topup-icon">
                <Wallet />
              </span>
              <span>
                <small>BUYER BALANCE</small>
                <strong>Top up your wallet securely</strong>
                <b>
                  {formatMoney(walletBalance)} available · USDT and crypto
                  supported
                </b>
              </span>
              <i>
                Top up now <ArrowRight />
              </i>
            </button>
            {orders.length > 0 && (
              <div className="recent-section">
                <div className="section-heading-row">
                  <h2>Recent orders</h2>
                  <Link to="#orders" onClick={() => selectTab("orders")}>
                    View all <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="compact-orders">
                  {orders.slice(0, 3).map((order) => (
                    <Link
                      className="compact-order"
                      to={`/orders/${order.id}`}
                      key={order.id}
                    >
                      <div className="co-left">
                        <span
                          className={`status-dot ${order.status.toLowerCase()}`}
                        />
                        <div>
                          <strong>{order.orderNumber}</strong>
                          <small>
                            {order.items.map((i) => i.productName).join(", ")}
                          </small>
                        </div>
                      </div>
                      <div className="co-right">
                        <span>{formatMoney(order.totalCents)}</span>
                        <small>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {user.role === "SELLER" && (
              <div className="recent-section">
                <div className="section-heading-row">
                  <h2>Seller snapshot</h2>
                  <Link to="#seller" onClick={() => selectTab("seller")}>
                    Open seller hub <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="quick-seller-stats">
                  <div>
                    <Store size={18} />
                    <span>
                      <strong>{sellerProfile?.storeName ?? "Store"}</strong>
                      <small>
                        {sellerProfile?.isVerified ? "Verified" : "Pending"}
                      </small>
                    </span>
                  </div>
                  <div>
                    <ShoppingBag size={18} />
                    <span>
                      <strong>{sellerProducts?.length ?? 0}</strong>
                      <small>Products</small>
                    </span>
                  </div>
                  <div>
                    <TrendingUp size={18} />
                    <span>
                      <strong>{formatMoney(sellerRevenue)}</strong>
                      <small>Revenue</small>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="quick-actions">
              <Link
                to="#wallet"
                onClick={() => selectTab("wallet")}
                className="action-card action-card-topup"
              >
                <Wallet size={20} />
                <span>
                  <strong>Top up balance</strong>
                  <small>Fund purchases with crypto</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/catalog" className="action-card">
                <PackageCheck size={20} />
                <span>
                  <strong>Browse marketplace</strong>
                  <small>Discover new products</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/support" className="action-card">
                <Headphones size={20} />
                <span>
                  <strong>Get help</strong>
                  <small>Support center & tickets</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="#orders"
                onClick={() => selectTab("orders")}
                className="action-card"
              >
                <ShoppingBag size={20} />
                <span>
                  <strong>My orders</strong>
                  <small>{orders.length} orders</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="#chats"
                onClick={() => selectTab("chats")}
                className="action-card"
              >
                <MessageSquare size={20} />
                <span>
                  <strong>Order chats</strong>
                  <small>{chats.length} conversations</small>
                </span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="#disputes"
                onClick={() => selectTab("disputes")}
                className="action-card"
              >
                <Gavel size={20} />
                <span>
                  <strong>Disputes</strong>
                  <small>{disputes.length} cases</small>
                </span>
                <ArrowRight size={16} />
              </Link>
            </div>
            <section className="buyer-discovery-strip">
              <header>
                <div>
                  <span>DISCOVER MORE</span>
                  <h2>Continue shopping</h2>
                </div>
                <Link to="/catalog">
                  Explore all products <ArrowRight />
                </Link>
              </header>
              <div>
                <Link to="/catalog">
                  <Sparkles />
                  <span>
                    <strong>Recommended for you</strong>
                    <small>Curated digital products</small>
                  </span>
                </Link>
                <Link to="/catalog">
                  <TrendingUp />
                  <span>
                    <strong>Trending products</strong>
                    <small>Popular with buyers now</small>
                  </span>
                </Link>
                <Link to="/catalog">
                  <Gift />
                  <span>
                    <strong>New arrivals</strong>
                    <small>Fresh marketplace releases</small>
                  </span>
                </Link>
              </div>
            </section>
          </div>
        )}

        {[
          "orders",
          "active-orders",
          "completed-orders",
          "pending-orders",
          "cancelled-orders",
        ].includes(tab) && (
          <div className="tab-content orders-tab">
            <header className="tab-header">
              <span className="section-index">ORDERS & DELIVERY</span>
              <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              <p>Downloads, invoices, support, and refunds for every order.</p>
            </header>
            <div className="buyer-order-filter-tabs">
              <button
                className={tab === "orders" ? "active" : ""}
                onClick={() => selectTab("orders")}
              >
                All <b>{orders.length}</b>
              </button>
              <button
                className={tab === "active-orders" ? "active" : ""}
                onClick={() => selectTab("active-orders")}
              >
                Active <b>{activeOrders}</b>
              </button>
              <button
                className={tab === "completed-orders" ? "active" : ""}
                onClick={() => selectTab("completed-orders")}
              >
                Completed
              </button>
              <button
                className={tab === "pending-orders" ? "active" : ""}
                onClick={() => selectTab("pending-orders")}
              >
                Pending
              </button>
              <button
                className={tab === "cancelled-orders" ? "active" : ""}
                onClick={() => selectTab("cancelled-orders")}
              >
                Cancelled
              </button>
            </div>
            {loading ? (
              <div className="buyer-skeleton-list">
                <i />
                <i />
                <i />
              </div>
            ) : visibleOrders.length ? (
              <div className="orders-list">
                {visibleOrders.map((order) => (
                  <article className="order-card-full" key={order.id}>
                    <header>
                      <div>
                        <span
                          className={`status-pill ${order.status.toLowerCase()}`}
                        >
                          {order.status.replaceAll("_", " ")}
                        </span>
                        <strong>{order.orderNumber}</strong>
                        <small>
                          {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                          {order.payment?.method?.replaceAll("_", " ") ??
                            "Awaiting payment"}
                        </small>
                      </div>
                      <b>{formatMoney(order.totalCents)}</b>
                    </header>
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div className="order-item-row" key={item.id}>
                          <div className="oi-info">
                            <BuyerMedia
                              src={item.product.coverImageUrl}
                              alt={item.productName}
                              className="oi-thumb"
                              fallback={<PackageCheck size={22} />}
                            />
                            <div>
                              <Link to={`/product/${item.product.slug}`}>
                                {item.productName}
                              </Link>
                              <small>
                                {item.product.type === "SERVICE"
                                  ? "Service delivery"
                                  : `${item.downloadGrants.length} file${item.downloadGrants.length === 1 ? "" : "s"}`}
                              </small>
                            </div>
                          </div>
                          <div className="oi-actions">
                            {item.product.type === "SERVICE" ? (
                              <Link
                                to={`/orders/${order.id}`}
                                className="action-link"
                              >
                                <MessageCircle size={14} /> Delivery chat
                              </Link>
                            ) : (
                              <>
                                {item.downloadGrants.length ? (
                                  <a
                                    href={apiDownloadUrl(
                                      `/api/commerce/order-items/${item.id}/download.zip`,
                                    )}
                                    className="action-link"
                                  >
                                    <Download size={14} /> Download ZIP
                                  </a>
                                ) : null}
                                {item.downloadGrants.map((grant) => (
                                  <a
                                    key={grant.id}
                                    href={apiDownloadUrl(
                                      `/api/commerce/downloads/${grant.id}`,
                                    )}
                                    className="action-link"
                                  >
                                    <Download size={14} />{" "}
                                    {grant.productFile.displayName}{" "}
                                    <small>
                                      (
                                      {grant.maxDownloads - grant.downloadCount}{" "}
                                      left)
                                    </small>
                                  </a>
                                ))}
                              </>
                            )}
                          </div>
                          {item.inventoryItems?.length ? (
                            <div className="delivery-file-panel">
                              <div>
                                <PackageOpen />
                                <span>
                                  <strong>
                                    {item.inventoryItems.length} delivered
                                    account
                                    {item.inventoryItems.length === 1
                                      ? ""
                                      : "s"}
                                  </strong>
                                  <small>
                                    Saved as protected files instead of exposing
                                    credentials on screen
                                  </small>
                                </span>
                              </div>
                              <div className="delivery-file-actions">
                                <a
                                  className="action-link"
                                  href={apiDownloadUrl(
                                    `/api/commerce/order-items/${item.id}/delivery?format=zip`,
                                  )}
                                >
                                  <Download size={14} /> Download ZIP
                                </a>
                                <a
                                  className="action-link"
                                  href={apiDownloadUrl(
                                    `/api/commerce/order-items/${item.id}/delivery?format=csv`,
                                  )}
                                >
                                  <FileText size={14} /> Download CSV
                                </a>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <footer>
                      <a
                        href={apiDownloadUrl(
                          `/api/commerce/orders/${order.id}/invoice`,
                        )}
                        className="action-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={14} /> Invoice {order.invoiceNumber}
                      </a>
                      <Link to={`/orders/${order.id}`} className="action-link">
                        <MessageCircle size={14} /> Order chat
                      </Link>
                      <button
                        disabled={Boolean(order.refunds.length)}
                        onClick={() => void requestRefund(order)}
                        className="action-link"
                      >
                        <RefreshCw size={14} />{" "}
                        {order.refunds.length
                          ? `Refund ${order.refunds[0].status.toLowerCase()}`
                          : "Request refund"}
                      </button>
                      <button
                        disabled={!order.canOpenDispute}
                        onClick={() => void openDispute(order)}
                        className="action-link"
                      >
                        <ShieldCheck size={14} />{" "}
                        {order.disputes.length
                          ? `Dispute ${order.disputes[0].status.toLowerCase().replaceAll("_", " ")}`
                          : order.canOpenDispute
                            ? "Open dispute"
                            : `Dispute until ${order.disputeDeadline ? new Date(order.disputeDeadline).toLocaleString() : "after payment"}`}
                      </button>
                      {order.items[0] ? (
                        <button
                          onClick={() => void leaveReview(order.items[0].id)}
                          className="action-link"
                        >
                          <Star size={14} /> Leave review
                        </button>
                      ) : null}
                      {order.items[0] ? (
                        <Link
                          to={`/product/${order.items[0].product.slug}`}
                          className="action-link"
                        >
                          <RefreshCw size={14} /> Buy again
                        </Link>
                      ) : null}
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <PackageCheck size={48} />
                <h2>No orders yet</h2>
                <p>
                  When you buy something, its invoice, delivery, and support
                  history will live here.
                </p>
                <Link to="/catalog" className="primary-button">
                  Browse marketplace <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        )}

        {[
          "downloads",
          "purchased-products",
          "license-keys",
          "activation-codes",
          "delivery-history",
        ].includes(tab) && (
          <div className="tab-content downloads-tab">
            <header className="tab-header">
              <span className="section-index">DIGITAL LIBRARY</span>
              <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              <p>
                Your purchased products, protected delivery records and latest
                available files.
              </p>
            </header>

            {tab === "purchased-products" &&
              (purchasedItems.length ? (
                <div className="downloads-grid buyer-library-grid buyer-purchased-grid">
                  {purchasedItems.map(({ order, item }) => (
                    <article
                      className="download-card purchased-product-card"
                      key={`${order.id}-${item.id}`}
                    >
                      <Link
                        className="dc-icon"
                        to={`/product/${item.product.slug}`}
                        aria-label={`Open ${item.productName}`}
                      >
                        <BuyerMedia
                          src={item.product.coverImageUrl}
                          alt={item.productName}
                          fallback={<PackageOpen size={26} />}
                        />
                      </Link>
                      <div className="dc-info">
                        <span className="buyer-library-badge">PURCHASED</span>
                        <Link
                          className="purchased-product-title"
                          to={`/product/${item.product.slug}`}
                        >
                          {item.productName}
                        </Link>
                        <small>
                          Order {order.orderNumber} ·{" "}
                          {new Date(order.createdAt).toLocaleDateString()}
                        </small>
                        <small>
                          {item.inventoryItems?.length
                            ? `${item.inventoryItems.length} protected account delivery`
                            : item.downloadGrants.length
                              ? `${item.downloadGrants.length} downloadable file${item.downloadGrants.length === 1 ? "" : "s"}`
                              : "Order delivery available"}
                        </small>
                      </div>
                      <div className="purchased-product-actions">
                        <Link to={`/orders/${order.id}`}>
                          <MessageCircle /> Open order
                        </Link>
                        {item.inventoryItems?.length ? (
                          <a
                            href={apiDownloadUrl(
                              `/api/commerce/order-items/${item.id}/delivery?format=zip`,
                            )}
                          >
                            <Download /> Download ZIP
                          </a>
                        ) : item.downloadGrants.length ? (
                          <a
                            href={apiDownloadUrl(
                              `/api/commerce/order-items/${item.id}/download.zip`,
                            )}
                          >
                            <Download /> Download files
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state-large">
                  <PackageOpen size={48} />
                  <h2>No purchased products yet</h2>
                  <p>
                    Your paid products will appear here with their order and
                    delivery actions.
                  </p>
                  <Link to="/catalog" className="primary-button">
                    Browse marketplace <ArrowRight size={16} />
                  </Link>
                </div>
              ))}

            {tab === "downloads" &&
              (downloads.length || deliveredItems.length ? (
                <div className="downloads-grid buyer-library-grid">
                  {downloads.map(({ order, item, grant }) => {
                    const unavailable =
                      Boolean(grant.revokedAt) ||
                      grant.downloadCount >= grant.maxDownloads ||
                      new Date(grant.expiresAt).getTime() <= Date.now();
                    return unavailable ? (
                      <article
                        className="download-card download-unavailable"
                        key={grant.id}
                        aria-label={`${item.productName} download unavailable`}
                      >
                        <div className="dc-icon">
                          <BuyerMedia
                            src={item.product.coverImageUrl}
                            alt={item.productName}
                            fallback={<Download size={26} />}
                          />
                        </div>
                        <div className="dc-info">
                          <span className="buyer-library-badge">
                            UNAVAILABLE
                          </span>
                          <strong>{item.productName}</strong>
                          <small>
                            {grant.productFile.displayName} · v
                            {grant.productFile.version}
                          </small>
                          <small>
                            {grant.revokedAt
                              ? "Access was revoked"
                              : grant.downloadCount >= grant.maxDownloads
                                ? "Download limit reached"
                                : "Download link expired"}
                          </small>
                        </div>
                        <span className="buyer-download-button disabled">
                          <LockKeyhole size={15} /> Unavailable
                        </span>
                      </article>
                    ) : (
                      <a
                        href={apiDownloadUrl(
                          `/api/commerce/downloads/${grant.id}`,
                        )}
                        className="download-card"
                        key={grant.id}
                      >
                        <div className="dc-icon">
                          <BuyerMedia
                            src={item.product.coverImageUrl}
                            alt={item.productName}
                            fallback={<Download size={26} />}
                          />
                        </div>
                        <div className="dc-info">
                          <span className="buyer-library-badge">PURCHASED</span>
                          <strong>{item.productName}</strong>
                          <small>
                            {grant.productFile.displayName} · v
                            {grant.productFile.version}
                          </small>
                          <small>
                            Purchased{" "}
                            {new Date(order.createdAt).toLocaleDateString()}
                          </small>
                          <span className="download-remaining">
                            {grant.maxDownloads - grant.downloadCount} downloads
                            remaining
                          </span>
                          {grant.expiresAt ? (
                            <small className="download-expiry">
                              Expires{" "}
                              {new Date(grant.expiresAt).toLocaleDateString()}
                            </small>
                          ) : null}
                        </div>
                        <span className="buyer-download-button">
                          <Download size={15} /> Download
                        </span>
                      </a>
                    );
                  })}
                  {deliveredItems.map(({ order, item }) => (
                    <article
                      className="download-card protected-download-card"
                      key={`delivery-${item.id}`}
                    >
                      <div className="dc-icon">
                        <BuyerMedia
                          src={item.product.coverImageUrl}
                          alt={item.productName}
                          fallback={<ShieldCheck size={26} />}
                        />
                      </div>
                      <div className="dc-info">
                        <span className="buyer-library-badge protected">
                          PROTECTED DELIVERY
                        </span>
                        <strong>{item.productName}</strong>
                        <small>
                          {item.inventoryItems?.length} delivered account
                          {item.inventoryItems?.length === 1 ? "" : "s"} · Order{" "}
                          {order.orderNumber}
                        </small>
                        <small>Choose the file format you need.</small>
                      </div>
                      <div className="protected-download-actions">
                        <a
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=txt`,
                          )}
                        >
                          <FileText /> TXT
                        </a>
                        <a
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=csv`,
                          )}
                        >
                          <Download /> CSV
                        </a>
                        <a
                          className="primary"
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=zip`,
                          )}
                        >
                          <PackageOpen /> ZIP
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state-large">
                  <Download size={48} />
                  <h2>No files yet</h2>
                  <p>
                    Purchased downloads and their latest updates will appear
                    here.
                  </p>
                  <Link to="/catalog" className="primary-button">
                    Browse marketplace <ArrowRight size={16} />
                  </Link>
                </div>
              ))}

            {["license-keys", "activation-codes", "delivery-history"].includes(
              tab,
            ) ? (
              <section className="buyer-code-vault">
                <header>
                  <div>
                    <KeyRound />
                    <span>
                      <h2>Protected delivery vault</h2>
                      <p>
                        Activation codes and delivered inventory are tied to
                        their original order.
                      </p>
                    </span>
                  </div>
                  <ShieldCheck />
                </header>
                {deliveredItems.length ? (
                  deliveredItems.map(({ order, item }) => (
                    <article key={item.id}>
                      <div>
                        <small>{order.orderNumber}</small>
                        <strong>{item.productName}</strong>
                        <p>
                          {item.inventoryItems?.length} delivered account
                          {item.inventoryItems?.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="protected-delivery-badge">
                        <ShieldCheck /> Protected file
                      </span>
                      <div className="vault-download-actions">
                        <a
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=txt`,
                          )}
                        >
                          <FileText /> TXT
                        </a>
                        <a
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=csv`,
                          )}
                        >
                          <Download /> CSV
                        </a>
                        <a
                          href={apiDownloadUrl(
                            `/api/commerce/order-items/${item.id}/delivery?format=zip`,
                          )}
                        >
                          <PackageOpen /> ZIP
                        </a>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state-large">
                    <KeyRound />
                    <h2>No activation codes</h2>
                    <p>
                      License keys and delivered inventory will appear here
                      after purchase.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        )}

        {["chats", "messages"].includes(tab) && (
          <div className="tab-content chats-tab">
            <header className="tab-header">
              <span className="section-index">ORDER CHATS</span>
              <h1>
                {tab === "messages" ? "Messages" : "Seller conversations"}
              </h1>
              <p>
                Every post-order chat appears here. Open the workspace to send
                messages or screenshots.
              </p>
            </header>
            {chats.length ? (
              <div className="compact-orders">
                {chats.map((chat) => (
                  <Link
                    className="compact-order chat-list-item"
                    to={`/orders/${chat.id}`}
                    key={chat.id}
                  >
                    <div className="co-left">
                      <MessageSquare size={16} />
                      <div>
                        <strong>{chat.orderNumber}</strong>
                        <small>
                          {chat.items
                            .map((item) => item.productName)
                            .join(", ")}
                        </small>
                        {chat.messages[0] ? (
                          <small>
                            {chat.messages[0].author.firstName}:{" "}
                            {chat.messages[0].body.slice(0, 90)}
                            {chat.messages[0].body.length > 90 ? "…" : ""}
                          </small>
                        ) : null}
                      </div>
                    </div>
                    <div className="co-right">
                      <span
                        className={`status-pill ${chat.status.toLowerCase()}`}
                      >
                        {chat.status.replaceAll("_", " ")}
                      </span>
                      <small>
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </small>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <MessageSquare size={48} />
                <h2>No chats yet</h2>
                <p>
                  Open an order and message the seller to start a conversation.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "refunds" && (
          <div className="tab-content refunds-tab">
            <header className="tab-header">
              <span className="section-index">REFUND CENTER</span>
              <h1>Refund requests</h1>
              <p>
                Track refund progress, status, amount and the related order
                history.
              </p>
            </header>
            {orders.filter((order) => order.refunds.length).length ? (
              <div className="buyer-refund-list">
                {orders
                  .filter((order) => order.refunds.length)
                  .map((order) => (
                    <article key={order.id}>
                      <span>
                        <RefreshCw />
                      </span>
                      <div>
                        <small>{order.orderNumber}</small>
                        <h3>
                          {order.items
                            .map((item) => item.productName)
                            .join(", ")}
                        </h3>
                        <p>
                          Requested amount · {formatMoney(order.totalCents)}
                        </p>
                        <div className="buyer-refund-timeline">
                          <i className="done" />
                          <b>Submitted</b>
                          <i className="active" />
                          <b>Under review</b>
                          <i />
                          <b>Resolution</b>
                        </div>
                      </div>
                      <strong
                        className={`status-pill ${order.refunds[0].status.toLowerCase()}`}
                      >
                        {order.refunds[0].status.replaceAll("_", " ")}
                      </strong>
                      <Link to={`/orders/${order.id}`}>
                        View order <ArrowRight />
                      </Link>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <RefreshCw size={48} />
                <h2>No refund requests</h2>
                <p>
                  Request a refund from an eligible order and its progress will
                  appear here.
                </p>
                <button
                  className="primary-button"
                  onClick={() => selectTab("orders")}
                >
                  View orders <ArrowRight />
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "disputes" && (
          <div className="tab-content disputes-tab">
            <header className="tab-header">
              <span className="section-index">DISPUTES</span>
              <h1>Open disputes and refund demands</h1>
              <p>
                If one party does not reply within 24 hours, the dispute is
                automatically closed against that party.
              </p>
            </header>
            {disputes.length ? (
              <div className="orders-list dispute-list">
                {disputes.map((dispute) => (
                  <article
                    className="order-card-full dispute-card"
                    key={dispute.id}
                  >
                    <header>
                      <div>
                        <span
                          className={`status-pill ${dispute.status.toLowerCase()}`}
                        >
                          {dispute.status.replaceAll("_", " ")}
                        </span>
                        <strong>{dispute.subject}</strong>
                        <small>
                          Order {dispute.order.orderNumber} ·{" "}
                          {new Date(dispute.createdAt).toLocaleString()}
                        </small>
                      </div>
                      {dispute.closedInFavorOf ? (
                        <b>Favored {dispute.closedInFavorOf.toLowerCase()}</b>
                      ) : dispute.autoCloseAt ? (
                        <b>
                          Due {new Date(dispute.autoCloseAt).toLocaleString()}
                        </b>
                      ) : null}
                    </header>
                    <p>{dispute.description}</p>
                    {dispute.resolution ? (
                      <div className="notice success">{dispute.resolution}</div>
                    ) : null}
                    <footer>
                      <Link
                        to={`/orders/${dispute.order.id}`}
                        className="action-link"
                      >
                        <MessageCircle size={14} /> Open chat
                      </Link>
                      <button
                        className="action-link"
                        onClick={() => void closeDispute(dispute.id)}
                      >
                        <ShieldCheck size={14} /> Close dispute
                      </button>
                      <button
                        className="action-link"
                        disabled={dispute.refundDemanded}
                        onClick={() => void demandDisputeRefund(dispute.id)}
                      >
                        <RefreshCw size={14} />{" "}
                        {dispute.refundDemanded
                          ? "Refund demanded"
                          : "Demand refund"}
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Gavel size={48} />
                <h2>No disputes</h2>
                <p>
                  Open a dispute from any paid order during its after-sales
                  window.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "tickets" && (
          <div className="tab-content tickets-tab">
            <header className="tab-header">
              <span className="section-index">SUPPORT CENTER</span>
              <h1>Help & tickets</h1>
              <p>Create tickets, track responses, and get human support.</p>
            </header>
            <button
              className="primary-button"
              onClick={() => void createTicket()}
            >
              <Headphones size={16} /> Create new ticket
            </button>
            {tickets.length ? (
              <div className="tickets-list">
                {tickets.map((ticket) => (
                  <article className="ticket-card" key={ticket.id}>
                    <header>
                      <div>
                        <span
                          className={`status-pill ${ticket.status.toLowerCase()}`}
                        >
                          {ticket.status.replaceAll("_", " ")}
                        </span>
                        <strong>{ticket.ticketNumber}</strong>
                        <small>
                          {ticket.category.replaceAll("_", " ")} ·{" "}
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </small>
                      </div>
                    </header>
                    <h3>{ticket.subject}</h3>
                    {ticket.messages.length > 0 && (
                      <div className="ticket-messages">
                        {ticket.messages.slice(-2).map((msg) => (
                          <div className="ticket-msg" key={msg.id}>
                            <strong>{msg.author?.firstName ?? "You"}</strong>
                            <p>
                              {msg.body.length > 200
                                ? msg.body.slice(0, 200) + "…"
                                : msg.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <footer>
                      <button
                        onClick={() => void replyToTicket(ticket.id)}
                        className="action-link"
                      >
                        <MessageCircle size={14} /> Reply
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Headphones size={48} />
                <h2>No tickets yet</h2>
                <p>
                  Support requests, refund inquiries, and technical help will
                  appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="tab-content buyer-notification-center">
            <header className="tab-header">
              <span className="section-index">ACTION CENTER</span>
              <h1>What needs your attention</h1>
              <p>
                Current order, conversation, dispute, and support signals
                calculated from your account records.
              </p>
            </header>
            <div className="buyer-notification-toolbar">
              <button
                type="button"
                onClick={() => void loadBuyerData()}
                disabled={loading}
              >
                <RefreshCw /> {loading ? "Refreshing…" : "Refresh activity"}
              </button>
            </div>
            <section>
              <h2>Current activity</h2>
              {activeOrders ? (
                <article>
                  <span className="blue">
                    <ShoppingBag />
                  </span>
                  <div>
                    <strong>
                      {activeOrders} active order{activeOrders === 1 ? "" : "s"}
                    </strong>
                    <p>
                      Track delivery progress or open the protected order
                      conversation.
                    </p>
                    <small>Live order state</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTab("active-orders")}
                  >
                    View
                  </button>
                </article>
              ) : null}
              {chats.length ? (
                <article>
                  <span className="purple">
                    <MessageSquare />
                  </span>
                  <div>
                    <strong>
                      {chats.length} seller conversation
                      {chats.length === 1 ? "" : "s"}
                    </strong>
                    <p>Your order-linked messages are available in Messages.</p>
                    <small>Order conversations</small>
                  </div>
                  <button type="button" onClick={() => selectTab("messages")}>
                    View
                  </button>
                </article>
              ) : null}
              {disputes.filter(
                (dispute) =>
                  !["CLOSED", "RESOLVED_BUYER", "RESOLVED_SELLER"].includes(
                    dispute.status,
                  ),
              ).length ? (
                <article>
                  <span className="amber">
                    <Gavel />
                  </span>
                  <div>
                    <strong>Open dispute activity</strong>
                    <p>Review case status and any response deadline.</p>
                    <small>Buyer protection</small>
                  </div>
                  <button type="button" onClick={() => selectTab("disputes")}>
                    View
                  </button>
                </article>
              ) : null}
              {tickets.filter(
                (ticket) => !["CLOSED", "RESOLVED"].includes(ticket.status),
              ).length ? (
                <article>
                  <span className="amber">
                    <TicketCheck />
                  </span>
                  <div>
                    <strong>Open support request</strong>
                    <p>Review the latest ticket conversation and status.</p>
                    <small>Support</small>
                  </div>
                  <button type="button" onClick={() => selectTab("tickets")}>
                    View
                  </button>
                </article>
              ) : null}
              {!activeOrders &&
              !chats.length &&
              !disputes.filter(
                (dispute) =>
                  !["CLOSED", "RESOLVED_BUYER", "RESOLVED_SELLER"].includes(
                    dispute.status,
                  ),
              ).length &&
              !tickets.filter(
                (ticket) => !["CLOSED", "RESOLVED"].includes(ticket.status),
              ).length ? (
                <div className="seller-all-caught">
                  <CheckCircle2 />
                  <strong>You’re all caught up</strong>
                  <p>No order or support action is waiting.</p>
                </div>
              ) : null}
            </section>
          </div>
        )}

        {["wishlist", "favorites", "cart"].includes(tab) && (
          <div className="tab-content buyer-shopping-center">
            <header className="tab-header">
              <span className="section-index">SHOPPING</span>
              <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              <p>
                Keep your next digital purchase organized and easy to reach.
              </p>
            </header>
            {tab === "cart" ? (
              <section className="buyer-cart-bridge">
                <span>
                  <ShoppingBag />
                </span>
                <div>
                  <small>SECURE CHECKOUT</small>
                  <h2>Continue to your shopping cart</h2>
                  <p>
                    Review products, quantities, pricing and the final order
                    total in the existing protected checkout flow.
                  </p>
                </div>
                <Link to="/cart">
                  Open cart <ArrowRight />
                </Link>
              </section>
            ) : (
              <div className="empty-state-large">
                <Heart size={48} />
                <h2>
                  Your {tab === "wishlist" ? "wishlist" : "favorites"} is empty
                </h2>
                <p>
                  Save products while browsing and they will be organized here.
                </p>
                <Link to="/catalog" className="primary-button">
                  Discover products <Sparkles />
                </Link>
              </div>
            )}
            <section className="buyer-discovery-strip">
              <header>
                <div>
                  <span>MARKETPLACE</span>
                  <h2>Products worth exploring</h2>
                </div>
                <Link to="/catalog">
                  View catalog <ArrowRight />
                </Link>
              </header>
              <div>
                <Link to="/catalog">
                  <TrendingUp />
                  <span>
                    <strong>Best sellers</strong>
                    <small>Trusted by active buyers</small>
                  </span>
                </Link>
                <Link to="/catalog">
                  <Sparkles />
                  <span>
                    <strong>New arrivals</strong>
                    <small>Recently published</small>
                  </span>
                </Link>
                <Link to="/catalog">
                  <Gift />
                  <span>
                    <strong>Featured picks</strong>
                    <small>Marketplace highlights</small>
                  </span>
                </Link>
              </div>
            </section>
          </div>
        )}

        {["coupons", "gift-cards", "rewards", "cashback"].includes(tab) && (
          <div className="tab-content buyer-rewards-center">
            <header className="tab-header">
              <span className="section-index">COUPONS & REWARDS</span>
              <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              <p>
                View marketplace-issued benefits, expiration status and
                redemption availability.
              </p>
            </header>
            <section className="buyer-reward-hero">
              <span>
                <Award />
              </span>
              <div>
                <small>MEMBER BENEFITS</small>
                <h2>Your rewards wallet</h2>
                <p>No reward balance is currently issued to this account.</p>
              </div>
              <strong>0 points</strong>
            </section>
            <div className="buyer-benefit-grid">
              <article>
                <Tag />
                <span>
                  <small>Active coupons</small>
                  <strong>0</strong>
                </span>
              </article>
              <article>
                <Gift />
                <span>
                  <small>Gift cards</small>
                  <strong>0</strong>
                </span>
              </article>
              <article>
                <Percent />
                <span>
                  <small>Cashback</small>
                  <strong>{formatMoney(0)}</strong>
                </span>
              </article>
              <article>
                <Award />
                <span>
                  <small>Reward points</small>
                  <strong>0</strong>
                </span>
              </article>
            </div>
            <div className="empty-state-large">
              <Gift size={48} />
              <h2>
                No {tabs.find((item) => item.id === tab)?.label.toLowerCase()}{" "}
                yet
              </h2>
              <p>
                Eligible marketplace-issued benefits will appear here with their
                expiry and redemption terms.
              </p>
              <Link to="/catalog" className="primary-button">
                Continue shopping <ArrowRight />
              </Link>
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="tab-content reviews-tab">
            <header className="tab-header">
              <span className="section-index">YOUR REVIEWS</span>
              <h1>Product reviews</h1>
              <p>Reviews you've written for purchased products.</p>
            </header>
            {reviews.length ? (
              <div className="reviews-grid">
                {reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < review.rating ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                    <p>{review.body}</p>
                    <div className="review-meta">
                      <Link to={`/product/${review.product.slug}`}>
                        <strong>{review.product.name}</strong>
                      </Link>
                      <small>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    {review.sellerResponse ? (
                      <div className="seller-response">
                        <strong>Seller response:</strong>{" "}
                        {review.sellerResponse}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <Star size={48} />
                <h2>No reviews yet</h2>
                <p>
                  After purchasing and using a product, leave a review to help
                  other buyers.
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "seller" && user.role === "SELLER" && (
          <div className="tab-content seller-tab">
            <header className="tab-header">
              <span className="section-index">SELLER HUB</span>
              <h1>{sellerProfile?.storeName ?? "Your store"}</h1>
              <p>
                {sellerProfile?.isVerified
                  ? "Verified store · Active"
                  : "Pending verification"}
              </p>
            </header>
            <div className="seller-center-hero">
              <div>
                <span className="section-index">REAL TIME DATA</span>
                <h2>Seller Center</h2>
                <p>
                  Quickly view your balance, frozen revenue, products, disputes,
                  orders, and sales.
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() =>
                  void Promise.all([
                    apiRequest<{ items: any[] }>("/api/seller/orders").then(
                      (d) => setSellerOrders(d.items),
                    ),
                    apiRequest<{ disputes: any[] }>(
                      "/api/seller/disputes",
                    ).then((d) => setSellerDisputes(d.disputes)),
                    apiRequest<{ summary: SellerFinance }>(
                      "/api/seller/finance",
                    ).then((d) => setSellerFinance(d.summary)),
                  ])
                }
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>
            <div className="seller-hub-metrics seller-center-grid">
              <div className="metric-card">
                <Wallet size={22} />
                <span>
                  <small>Seller balance</small>
                  <strong>
                    {formatMoney(
                      sellerFinance?.availableBalanceCents ?? walletBalance,
                    )}
                  </strong>
                  <small>
                    <LockKeyhole size={12} /> frozen:{" "}
                    {formatMoney(sellerFinance?.frozenBalanceCents ?? 0)}
                  </small>
                </span>
              </div>
              <div className="metric-card">
                <PackageCheck size={22} />
                <span>
                  <small>Product</small>
                  <strong>{sellerProducts?.length ?? 0}</strong>
                  <small>
                    {
                      sellerProducts.filter((p: any) => p.status === "APPROVED")
                        .length
                    }{" "}
                    approved ·{" "}
                    {
                      sellerProducts.filter((p: any) => p.status === "PENDING")
                        .length
                    }{" "}
                    pending
                  </small>
                </span>
              </div>
              <div className="metric-card">
                <ShoppingBag size={22} />
                <span>
                  <small>Total order</small>
                  <strong>{sellerOrders?.length ?? 0}</strong>
                  <small>
                    {
                      sellerOrders.filter(
                        (item: any) => item.order?.payment?.status === "PAID",
                      ).length
                    }{" "}
                    paid
                  </small>
                </span>
              </div>
              <div className="metric-card">
                <TrendingUp size={22} />
                <span>
                  <small>Total sales</small>
                  <strong>{formatMoney(sellerRevenue)}</strong>
                  <small>
                    Withdrawn: {formatMoney(sellerFinance?.withdrawnCents ?? 0)}
                  </small>
                </span>
              </div>
              <div className="metric-card">
                <Activity size={22} />
                <span>
                  <small>Today</small>
                  <strong>{sellerFinance?.todayOrderCount ?? 0}</strong>
                  <small>orders</small>
                </span>
              </div>
              <div className="metric-card">
                <DollarSign size={22} />
                <span>
                  <small>Income today</small>
                  <strong>
                    {formatMoney(sellerFinance?.todayIncomeCents ?? 0)}
                  </strong>
                  <small>3-day hold applies</small>
                </span>
              </div>
              <div className="metric-card">
                <Gavel size={22} />
                <span>
                  <small>Disputes</small>
                  <strong>
                    {
                      sellerDisputes.filter(
                        (d: any) =>
                          ![
                            "CLOSED",
                            "RESOLVED_BUYER",
                            "RESOLVED_SELLER",
                          ].includes(d.status),
                      ).length
                    }
                  </strong>
                  <small>{sellerDisputes.length} total</small>
                </span>
              </div>
              <div className="metric-card">
                <Activity size={22} />
                <span>
                  <small>Pending orders</small>
                  <strong>{pendingSellerOrders}</strong>
                  <small>processing/disputed</small>
                </span>
              </div>
            </div>

            <div className="seller-analytics-grid">
              <section className="seller-sales-chart">
                <header>
                  <div>
                    <span className="section-index">SALES STATISTICS</span>
                    <h2>Revenue performance</h2>
                  </div>
                  <select aria-label="Analytics period">
                    <option>Last 15 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                  </select>
                </header>
                <div className="chart-summary">
                  <span>
                    <small>Net income</small>
                    <strong>{formatMoney(sellerRevenue)}</strong>
                  </span>
                  <span>
                    <small>Average order</small>
                    <strong>
                      {formatMoney(
                        sellerOrders.length
                          ? sellerRevenue / sellerOrders.length
                          : 0,
                      )}
                    </strong>
                  </span>
                  <span>
                    <small>Refund risk</small>
                    <strong className="risk-value">
                      {sellerDisputes.length}
                    </strong>
                  </span>
                </div>
                <div className="chart-frame">
                  <EarningsChart
                    label="Seller revenue"
                    color="#635bff"
                    points={[
                      18, 34, 28, 47, 42, 65, 51, 78, 72, 96, 69, 111, 86, 124,
                      103,
                    ].map((value, index) => ({
                      label: `Day ${index + 1}`,
                      value: Math.round(
                        value * Math.max(1, sellerRevenue / 920),
                      ),
                    }))}
                  />
                </div>
              </section>
              <aside className="seller-todo-panel">
                <span className="section-index">TO-DO & WARNINGS</span>
                <h2>Store health</h2>
                <div>
                  <span className="todo-dot danger" />
                  <p>
                    <strong>
                      {
                        sellerProducts.filter(
                          (p: any) => p.status === "REJECTED",
                        ).length
                      }{" "}
                      listings need attention
                    </strong>
                    <small>Review rejected products and resubmit.</small>
                  </p>
                </div>
                <div>
                  <span className="todo-dot warning" />
                  <p>
                    <strong>
                      {
                        sellerProducts.filter(
                          (p: any) =>
                            p.inventoryItems?.filter(
                              (i: any) => i.isActive && !i.deliveredAt,
                            ).length === 0,
                        ).length
                      }{" "}
                      products low on stock
                    </strong>
                    <small>Add delivery inventory before the next sale.</small>
                  </p>
                </div>
                <div>
                  <span className="todo-dot success" />
                  <p>
                    <strong>Payments protected</strong>
                    <small>
                      Seller earnings follow the configured hold period.
                    </small>
                  </p>
                </div>
              </aside>
            </div>

            {sellerOrders?.length > 0 && (
              <div className="section-block">
                <h2>
                  Recent orders <small>({sellerOrders.length} total)</small>
                </h2>
                <div className="compact-orders">
                  {sellerOrders.slice(0, 6).map((item: any) => (
                    <div
                      className="compact-order seller-order-row"
                      key={item.id}
                    >
                      <div className="co-left">
                        <PackageCheck size={16} />
                        <div>
                          <strong>{item.productName}</strong>
                          <small>
                            Order {item.order?.orderNumber} · buyer{" "}
                            {item.order?.buyer?.firstName ?? "customer"}
                          </small>
                          {item.order?.messages?.[0] ? (
                            <small>
                              Last chat:{" "}
                              {item.order.messages[0].body.slice(0, 80)}
                              {item.order.messages[0].body.length > 80
                                ? "…"
                                : ""}
                            </small>
                          ) : null}
                          {item.sellerEarning ? (
                            <small>
                              {item.sellerEarning.status} · releases{" "}
                              {new Date(
                                item.sellerEarning.availableAt,
                              ).toLocaleDateString()}
                            </small>
                          ) : null}
                        </div>
                      </div>
                      <div className="co-right">
                        <span>{formatMoney(item.totalCents)}</span>
                        <small
                          className={`status-pill ${item.order?.status?.toLowerCase()}`}
                        >
                          {item.order?.status?.replaceAll("_", " ")}
                        </small>
                        <div className="seller-row-actions">
                          <Link
                            to={`/orders/${item.order?.id}`}
                            className="action-link"
                          >
                            <MessageCircle size={14} /> Chat
                          </Link>
                          <button
                            className="action-link"
                            onClick={() =>
                              void sellerRefund(item.order?.id, item.totalCents)
                            }
                          >
                            <RefreshCw size={14} /> Refund
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerDisputes?.length > 0 && (
              <div className="section-block seller-dispute-section">
                <h2>
                  Disputes <small>({sellerDisputes.length} total)</small>
                </h2>
                <div className="orders-list dispute-list">
                  {sellerDisputes.slice(0, 6).map((dispute: any) => (
                    <article
                      className="order-card-full dispute-card"
                      key={dispute.id}
                    >
                      <header>
                        <div>
                          <span
                            className={`status-pill ${dispute.status.toLowerCase()}`}
                          >
                            {dispute.status.replaceAll("_", " ")}
                          </span>
                          <strong>{dispute.subject}</strong>
                          <small>
                            Order {dispute.order?.orderNumber} · buyer{" "}
                            {dispute.order?.buyer?.email}
                          </small>
                        </div>
                        {dispute.autoCloseAt ? (
                          <b>
                            Reply by{" "}
                            {new Date(dispute.autoCloseAt).toLocaleString()}
                          </b>
                        ) : dispute.closedInFavorOf ? (
                          <b>Favored {dispute.closedInFavorOf.toLowerCase()}</b>
                        ) : null}
                      </header>
                      <p>{dispute.description}</p>
                      <footer>
                        <Link
                          to={`/orders/${dispute.order?.id}`}
                          className="action-link"
                        >
                          <MessageCircle size={14} /> Open chat
                        </Link>
                        <button
                          className="action-link"
                          onClick={() =>
                            void sellerRefund(
                              dispute.order?.id,
                              dispute.orderItem?.totalCents ??
                                dispute.order?.totalCents ??
                                0,
                            )
                          }
                        >
                          <RefreshCw size={14} /> Offer refund
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {sellerProducts?.length > 0 && (
              <div className="section-block">
                <h2>
                  Your products <small>({sellerProducts.length} total)</small>
                </h2>
                <div className="seller-product-grid">
                  {sellerProducts.map((product) => (
                    <div className="sp-card" key={product.id}>
                      <span
                        className={`sp-status ${product.status.toLowerCase()}`}
                      >
                        {product.status}
                      </span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.type} · {formatMoney(product.priceCents)}
                      </small>
                      <span className="sp-files">
                        {product.files?.length ?? 0} file
                        {(product.files?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                      <small>
                        {product.category?.parent?.name
                          ? `${product.category.parent.name} / `
                          : ""}
                        {product.category?.name ?? "Uncategorized"}
                      </small>
                      <Link to="/seller" className="action-link">
                        Manage product
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerReviews?.length > 0 && (
              <div className="section-block">
                <h2>
                  Recent reviews <small>({sellerReviews.length} total)</small>
                </h2>
                <div className="compact-orders">
                  {sellerReviews.slice(0, 3).map((review: any) => (
                    <div className="compact-order" key={review.id}>
                      <div className="co-left">
                        <div className="review-stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < review.rating ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                        <div>
                          <strong>{review.product?.name}</strong>
                          <small>by {review.buyer?.firstName}</small>
                        </div>
                      </div>
                      <div className="co-right">
                        {review.sellerResponse ? (
                          <small className="status-pill">Replied</small>
                        ) : (
                          <button
                            onClick={() => void submitSellerReply(review.id)}
                            className="action-link"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellerTickets?.length > 0 && (
              <div className="section-block">
                <h2>
                  Support tickets <small>({sellerTickets.length} open)</small>
                </h2>
                <div className="compact-orders">
                  {sellerTickets.slice(0, 3).map((ticket: any) => (
                    <div className="compact-order" key={ticket.id}>
                      <div className="co-left">
                        <Headphones size={16} />
                        <div>
                          <strong>{ticket.subject}</strong>
                          <small>
                            {ticket.ticketNumber} · {ticket.creator?.email}
                          </small>
                        </div>
                      </div>
                      <div className="co-right">
                        <span
                          className={`status-pill ${ticket.status.toLowerCase()}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!sellerOrders?.length && !sellerProducts?.length ? (
              <div className="empty-state-large">
                <Store size={48} />
                <h2>Start selling</h2>
                <p>
                  Head to your Seller Studio to create product drafts and submit
                  them for review.
                </p>
                <Link to="/seller" className="primary-button">
                  Open seller studio <ArrowRight size={16} />
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {["wallet", "transactions"].includes(tab) && (
          <WalletTabContent
            mode={tab === "transactions" ? "transactions" : "wallet"}
            user={user}
            setMessage={setMessage}
            initialBalance={walletBalance}
            onBalanceChange={setWalletBalance}
          />
        )}

        {[
          "profile",
          "security",
          "addresses",
          "payment-methods",
          "preferences",
        ].includes(tab) && (
          <div className="tab-content profile-tab">
            <header className="tab-header">
              <span className="section-index">ACCOUNT CENTER</span>
              <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
              <p>Your identity, security, payment and preference controls.</p>
            </header>
            {tab === "profile" ? (
              <div className="profile-card buyer-profile-card">
                <div className="profile-avatar-large">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="profile-details">
                  <div className="profile-row">
                    <label>Full name</label>
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <div className="profile-row">
                    <label>Username</label>
                    <span>@{user.username}</span>
                  </div>
                  <div className="profile-row">
                    <label>Email</label>
                    <span>
                      {user.email}{" "}
                      {user.emailVerified ? <BadgeCheck size={14} /> : null}
                    </span>
                  </div>
                  <div className="profile-row">
                    <label>Phone</label>
                    <span>{user.phone || "—"}</span>
                  </div>
                  <div className="profile-row">
                    <label>Country</label>
                    <span>{user.country || "—"}</span>
                  </div>
                  <div className="profile-row">
                    <label>City</label>
                    <span>{user.city || "—"}</span>
                  </div>
                  <div className="profile-row">
                    <label>Role</label>
                    <span className="role-pill">
                      <ShieldCheck size={12} /> {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="profile-row">
                    <label>Member since</label>
                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : null}
            {tab === "security" ? (
              <div className="buyer-security-grid">
                <article>
                  <span>
                    <BadgeCheck />
                  </span>
                  <div>
                    <small>IDENTITY</small>
                    <h3>Email verification</h3>
                    <p>
                      {user.emailVerified
                        ? "Your email address is verified."
                        : "Verify your email to strengthen account recovery."}
                    </p>
                  </div>
                  <b
                    className={`status-pill ${user.emailVerified ? "completed" : "pending"}`}
                  >
                    {user.emailVerified ? "VERIFIED" : "PENDING"}
                  </b>
                </article>
                <article>
                  <span>
                    <LockKeyhole />
                  </span>
                  <div>
                    <small>PASSWORD</small>
                    <h3>Password protection</h3>
                    <p>
                      Your password and reset flow remain protected by the
                      existing authentication system.
                    </p>
                  </div>
                  <Link to="/forgot-password">
                    Manage <ArrowRight />
                  </Link>
                </article>
                <article>
                  <span>
                    <Smartphone />
                  </span>
                  <div>
                    <small>SESSIONS</small>
                    <h3>Trusted session</h3>
                    <p>
                      This device uses secure, refreshable account sessions.
                    </p>
                  </div>
                  <b className="status-pill completed">ACTIVE</b>
                </article>
                <article>
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <small>PRIVACY</small>
                    <h3>Buyer protection</h3>
                    <p>
                      Orders, delivery records and disputes are retained for
                      account protection.
                    </p>
                  </div>
                  <Link to="/privacy">
                    Review <ArrowRight />
                  </Link>
                </article>
              </div>
            ) : null}
            {tab === "addresses" ? (
              <div className="buyer-account-empty">
                <MapPin />
                <h2>Saved addresses</h2>
                <p>
                  Digital orders do not require a shipping address. Your country
                  and city remain available in Profile.
                </p>
                <button onClick={() => selectTab("profile")}>
                  View profile <ArrowRight />
                </button>
              </div>
            ) : null}
            {tab === "payment-methods" ? (
              <div className="buyer-payment-methods">
                <article>
                  <span>
                    <Wallet />
                  </span>
                  <div>
                    <small>PRIMARY PAYMENT</small>
                    <h3>Marketplace wallet</h3>
                    <p>Available balance: {formatMoney(walletBalance)}</p>
                  </div>
                  <button onClick={() => selectTab("wallet")}>
                    Top up <ArrowRight />
                  </button>
                </article>
                <article>
                  <span>
                    <Bitcoin />
                  </span>
                  <div>
                    <small>VERIFIED TOP-UP</small>
                    <h3>Configured crypto networks</h3>
                    <p>
                      Only payment networks and destination addresses configured
                      by marketplace administration are shown.
                    </p>
                  </div>
                  <button onClick={() => selectTab("wallet")}>
                    View availability <ArrowRight />
                  </button>
                </article>
              </div>
            ) : null}
            {tab === "preferences" ? (
              <div className="buyer-preference-list">
                <article>
                  <div>
                    <Bell />
                    <span>
                      <strong>Order updates</strong>
                      <small>Keep delivery and payment progress visible.</small>
                    </span>
                  </div>
                  <b>Enabled</b>
                </article>
                <article>
                  <div>
                    <MessageSquare />
                    <span>
                      <strong>Seller messages</strong>
                      <small>
                        Show alerts for protected order conversations.
                      </small>
                    </span>
                  </div>
                  <b>Enabled</b>
                </article>
                <article>
                  <div>
                    <Sparkles />
                    <span>
                      <strong>Marketplace recommendations</strong>
                      <small>
                        Display useful discovery sections in your dashboard.
                      </small>
                    </span>
                  </div>
                  <b>Enabled</b>
                </article>
                <article>
                  <div>
                    <SlidersHorizontal />
                    <span>
                      <strong>Responsive display</strong>
                      <small>
                        Comfortable spacing automatically follows your device.
                      </small>
                    </span>
                  </div>
                  <b>Automatic</b>
                </article>
              </div>
            ) : null}
          </div>
        )}
      </section>
      <nav className="buyer-mobile-bottom-nav">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => selectTab("overview")}
        >
          <Home />
          <span>Home</span>
        </button>
        <button
          className={
            [
              "orders",
              "active-orders",
              "completed-orders",
              "pending-orders",
              "cancelled-orders",
            ].includes(tab)
              ? "active"
              : ""
          }
          onClick={() => selectTab("orders")}
        >
          <ShoppingBag />
          <span>Orders</span>
        </button>
        <button
          className="buyer-mobile-fab"
          onClick={() => selectTab("wallet")}
          aria-label="Top up wallet"
        >
          <PlusCircle />
        </button>
        <button
          className={
            [
              "downloads",
              "purchased-products",
              "license-keys",
              "activation-codes",
              "delivery-history",
            ].includes(tab)
              ? "active"
              : ""
          }
          onClick={() => selectTab("purchased-products")}
        >
          <PackageOpen />
          <span>Library</span>
        </button>
        <button
          className={["messages", "chats"].includes(tab) ? "active" : ""}
          onClick={() => selectTab("messages")}
        >
          <MessageSquare />
          <span>Messages</span>
        </button>
      </nav>
    </main>
  );
}

type Deposit = {
  id: string;
  amountCents: number;
  networkFeeCents: number;
  totalPayableCents: number;
  method: string;
  status: string;
  reference?: string;
  depositAddress?: string;
  txHash?: string | null;
  screenshotUrl?: string | null;
  adminNotes?: string | null;
  expiresAt?: string;
  createdAt: string;
};
type TopupMethodConfig = {
  method: string;
  label: string;
  network: string;
  asset: string;
  address: string;
  networkFeeCents: number;
  feePolicy?: string;
  amountPolicy?: string;
};
type Withdrawal = {
  id: string;
  amountCents: number;
  blockchain: string;
  walletAddress: string;
  status: string;
  providerReference?: string | null;
  adminNotes?: string | null;
  processedAt?: string | null;
  createdAt: string;
};
type WalletSummary = {
  balanceCents: number;
  availableBalanceCents: number;
  sellerAvailableBalanceCents: number;
  frozenSellerBalanceCents: number;
  pendingWithdrawalCents: number;
  withdrawals: Withdrawal[];
};
type WalletLedgerEntry = {
  id: string;
  type: string;
  balanceKind: "BUYER" | "SELLER";
  amountCents: number;
  balanceAfter: number;
  description: string;
  reference?: string | null;
  createdAt: string;
};

function WalletTabContent({
  user,
  setMessage,
  initialBalance,
  onBalanceChange,
  mode = "wallet",
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  setMessage: (m: string) => void;
  initialBalance: number;
  onBalanceChange: (balanceCents: number) => void;
  mode?: "wallet" | "transactions";
}) {
  const { formatMoney, t } = useLocale();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [topupMethods, setTopupMethods] = useState<TopupMethodConfig[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<WalletLedgerEntry[]>([]);
  const [balance, setBalance] = useState(
    initialBalance ?? user.balanceCents ?? 0,
  );
  const [sellerBalance, setSellerBalance] = useState(
    user.sellerBalanceCents ?? 0,
  );
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [pendingWithdrawalCents, setPendingWithdrawalCents] = useState(0);
  const [busy, setBusy] = useState(false);
  const [depositMethod, setDepositMethod] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [activeTopup, setActiveTopup] = useState<Deposit | null>(null);
  const [proofTx, setProofTx] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [withdrawBlockchain, setWithdrawBlockchain] = useState("USDT TRC20");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [topupFeedback, setTopupFeedback] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    setBalance(initialBalance ?? user.balanceCents ?? 0);
  }, [initialBalance, user.balanceCents]);

  useEffect(() => {
    if (!activeTopup) return;
    window.requestAnimationFrame(() =>
      document
        .getElementById("topup-payment-request")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }, [activeTopup]);

  const refreshWallet = useCallback(async () => {
    const [summary, depositHistory, methodData, ledger] = await Promise.all([
      apiRequest<WalletSummary>("/api/wallet/balance"),
      apiRequest<{ deposits: Deposit[] }>("/api/wallet/deposits"),
      apiRequest<{ methods: TopupMethodConfig[] }>(
        "/api/wallet/topup-methods",
      ).catch(() => ({ methods: [] })),
      apiRequest<{ transactions: WalletLedgerEntry[] }>(
        "/api/wallet/transactions",
      ).catch(() => ({ transactions: [] })),
    ]);
    setBalance(summary.availableBalanceCents ?? summary.balanceCents);
    setSellerBalance(summary.sellerAvailableBalanceCents ?? 0);
    setFrozenBalance(summary.frozenSellerBalanceCents ?? 0);
    setPendingWithdrawalCents(summary.pendingWithdrawalCents ?? 0);
    setWithdrawals(summary.withdrawals ?? []);
    onBalanceChange(summary.availableBalanceCents ?? summary.balanceCents);
    setDeposits(depositHistory.deposits);
    setTopupMethods(methodData.methods);
    setTransactions(ledger.transactions);
    setDepositMethod((current) =>
      methodData.methods.some((method) => method.method === current)
        ? current
        : (methodData.methods[0]?.method ?? ""),
    );
  }, [onBalanceChange]);

  useEffect(() => {
    void refreshWallet().catch(() => undefined);
    const interval = window.setInterval(
      () => void refreshWallet().catch(() => undefined),
      12000,
    );
    return () => window.clearInterval(interval);
  }, [refreshWallet]);

  async function submitDeposit() {
    if (
      !depositMethod ||
      !topupMethods.some((method) => method.method === depositMethod)
    ) {
      const text =
        "Top-up methods are not configured yet. No payment has been created.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
      return;
    }
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!cents || cents < 100 || cents > 10_000_000) {
      const text = "Enter an amount between $1.00 and $100,000.00.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ message: string; topup: Deposit }>(
        "/api/wallet/topups",
        {
          method: "POST",
          body: { amountCents: cents, method: depositMethod },
        },
      );
      setMessage(data.message);
      setTopupFeedback({
        kind: "success",
        text: "Payment request created. Send the exact amount, then add your TXID and screenshot below.",
      });
      setActiveTopup(data.topup);
      setProofTx("");
      setProofFile(null);
      await refreshWallet();
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : "We could not create the payment request. Your balance was not charged. Please try again.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!activeTopup || !proofTx.trim() || !proofFile) {
      const text =
        "Add the transaction ID and payment screenshot before sending your proof.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
      return;
    }
    const normalizedTx = proofTx.trim().toLowerCase();
    const evmTopup = ["CRYPTO_BEP20", "CRYPTO_ERC20", "ETH"].includes(
      activeTopup.method,
    );
    const validTx = evmTopup
      ? /^0x[a-f0-9]{64}$/.test(normalizedTx)
      : /^[a-f0-9]{64}$/.test(normalizedTx);
    if (!validTx) {
      const text = evmTopup
        ? "Enter the complete 0x transaction hash (66 characters) for this network."
        : "Enter the complete 64-character transaction ID for this network.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
      return;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append("txHash", proofTx.trim());
      payload.append("screenshot", proofFile);
      const data = await apiRequest<{ message: string }>(
        `/api/wallet/topups/${activeTopup.id}/proof`,
        { method: "POST", body: payload },
      );
      setMessage(data.message);
      setTopupFeedback({ kind: "success", text: data.message });
      setDepositAmount("");
      setActiveTopup(null);
      setProofTx("");
      setProofFile(null);
      await refreshWallet();
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : "We could not submit the proof. The payment request is still saved; please retry without sending another payment.";
      setTopupFeedback({ kind: "error", text });
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function submitWithdrawal() {
    const cents = Math.round(parseFloat(withdrawAmount) * 100);
    if (!cents || cents < 500) {
      setMessage("Minimum withdrawal is $5.00.");
      return;
    }
    if (cents > sellerBalance) {
      setMessage("Withdrawal amount is higher than your available balance.");
      return;
    }
    if (withdrawAddress.trim().length < 12) {
      setMessage("Enter a valid wallet address.");
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/wallet/withdrawals", {
        method: "POST",
        body: {
          amountCents: cents,
          blockchain: withdrawBlockchain,
          walletAddress: withdrawAddress.trim(),
        },
      });
      setMessage(
        "Withdrawal request submitted. It stays pending until admin approval.",
      );
      setWithdrawAmount("");
      setWithdrawAddress("");
      await refreshWallet();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Withdrawal request failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  const methods = topupMethods.map((method) => ({
    ...method,
    value: method.method,
    icon: ["BTC", "CRYPTO_TRC20", "CRYPTO_BEP20", "CRYPTO_ERC20"].includes(
      method.method,
    )
      ? Bitcoin
      : DollarSign,
  }));
  const selectedMethod =
    methods.find((method) => method.value === depositMethod) ?? null;
  const quotedAmountCents = Number.isFinite(Number(depositAmount))
    ? Math.max(0, Math.round(Number(depositAmount) * 100))
    : 0;
  const quotedFeeCents = selectedMethod?.networkFeeCents ?? 0;
  const quotedTotalCents = quotedAmountCents + quotedFeeCents;
  const chains = [
    "USDT TRC20",
    "USDT ERC20",
    "USDT BEP20",
    "Bitcoin",
    "Ethereum",
  ];

  return (
    <div className="tab-content wallet-tab">
      <header className="tab-header">
        <span className="section-index">{t("buyerWallet").toUpperCase()}</span>
        <h1>
          {mode === "transactions" ? t("transactionsTitle") : t("topupTitle")}
        </h1>
        <p>
          {mode === "transactions"
            ? t("topupTransactionIntro")
            : t("topupIntro")}
        </p>
      </header>

      {mode === "wallet" ? (
        <div className="topup-progress" aria-label="Top-up steps">
          <span className="active">
            <b>1</b>
            {t("topupStepNetwork")}
          </span>
          <span className={depositAmount ? "active" : ""}>
            <b>2</b>
            {t("topupStepAmount")}
          </span>
          <span className={activeTopup ? "active" : ""}>
            <b>3</b>
            {t("topupStepPayment")}
          </span>
          <span className={proofFile && proofTx ? "active" : ""}>
            <b>4</b>
            {t("topupStepProof")}
          </span>
          <span className={activeTopup?.txHash ? "active" : ""}>
            <b>5</b>
            {t("topupStepApproval")}
          </span>
        </div>
      ) : null}

      {topupFeedback ? (
        <div
          className={`wallet-inline-notice ${topupFeedback.kind}`}
          role={topupFeedback.kind === "error" ? "alert" : "status"}
        >
          {topupFeedback.kind === "error" ? (
            <ShieldAlert />
          ) : topupFeedback.kind === "success" ? (
            <CheckCircle2 />
          ) : (
            <Clock3 />
          )}
          <span>{topupFeedback.text}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setTopupFeedback(null)}
          >
            <X />
          </button>
        </div>
      ) : null}

      <div className="wallet-summary-grid">
        <div className="wallet-balance-banner">
          <Wallet size={32} />
          <div>
            <strong>{formatMoney(balance)}</strong>
            <small>{t("availableBalance")}</small>
          </div>
        </div>
        {user.role === "SELLER" ? (
          <div className="wallet-balance-banner muted">
            <DollarSign size={28} />
            <div>
              <strong>{formatMoney(sellerBalance)}</strong>
              <small>{t("availableSellerBalance")}</small>
            </div>
          </div>
        ) : null}
        {user.role === "SELLER" ? (
          <div className="wallet-balance-banner muted">
            <LockKeyhole size={28} />
            <div>
              <strong>{formatMoney(frozenBalance)}</strong>
              <small>{t("frozenEarnings")}</small>
            </div>
          </div>
        ) : null}
        {user.role === "SELLER" ? (
          <div className="wallet-balance-banner muted">
            <RefreshCw size={28} />
            <div>
              <strong>{formatMoney(pendingWithdrawalCents)}</strong>
              <small>{t("pendingWithdrawalReview")}</small>
            </div>
          </div>
        ) : null}
      </div>

      {mode === "wallet" && user.role !== "SELLER" ? (
        <Link className="seller-application-cta" to="/seller/apply">
          <Store size={21} />
          <span>
            <small>GROW WITH YSELLO</small>
            <strong>Apply to become a seller</strong>
            <b>
              Open application <ArrowRight size={15} />
            </b>
          </span>
        </Link>
      ) : null}

      {mode === "wallet" ? (
        <div className="wallet-action-grid">
          <form
            className="wallet-deposit-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitDeposit();
            }}
          >
            <h2>{t("cryptoTopup")}</h2>
            <p>{t("cryptoTopupHelp")}</p>
            {methods.length ? (
              <div className="deposit-method-tabs">
                {methods.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={depositMethod === m.value ? "active" : ""}
                      onClick={() => setDepositMethod(m.value)}
                    >
                      <Icon size={16} /> {m.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty compact" role="status">
                <ShieldAlert />
                <h3>Top-up is temporarily unavailable</h3>
                <p>
                  No verified payment destination is configured. Please return
                  later or contact support—do not send funds to an address from
                  another source.
                </p>
              </div>
            )}
            {selectedMethod ? (
              <div className="topup-network-address">
                <span>
                  <Bitcoin />
                  <small>{t("selectedPaymentAddress").toUpperCase()}</small>
                  <strong>{selectedMethod.label}</strong>
                  <b>{selectedMethod.network}</b>
                </span>
                <code>{selectedMethod.address}</code>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard?.writeText(selectedMethod.address)
                  }
                >
                  <ClipboardCopy /> {t("copyAddress")}
                </button>
                <small>{selectedMethod.amountPolicy}</small>
              </div>
            ) : null}
            <div className="deposit-input-row">
              <div className="field">
                <span>{t("amountUsd")}</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="0.01"
                  placeholder="50.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="primary-button"
                disabled={busy}
              >
                <PlusCircle size={16} />{" "}
                {busy ? t("creatingPayment") : t("createPayment")}
              </button>
            </div>
            {selectedMethod && quotedAmountCents > 0 ? (
              <dl className="topup-fee-breakdown" aria-label="Top-up quote">
                <div>
                  <dt>Wallet credit</dt>
                  <dd>{formatMoney(quotedAmountCents)}</dd>
                </div>
                <div>
                  <dt>Estimated blockchain fee (buyer pays)</dt>
                  <dd>{formatMoney(quotedFeeCents)}</dd>
                </div>
                <div>
                  <dt>Estimated total buyer cost</dt>
                  <dd>{formatMoney(quotedTotalCents)}</dd>
                </div>
              </dl>
            ) : null}
            <div className="wallet-safety-note">
              <ShieldAlert size={16} />
              <span>
                Transfer the exact wallet-credit amount. Your wallet or
                exchange charges the network fee in addition; live fees may
                vary from this estimate.
              </span>
            </div>
          </form>

          {user.role === "SELLER" ? (
            <div className="wallet-deposit-form withdrawal-form">
              <h2>{t("withdrawFunds")}</h2>
              <p>{t("withdrawHelp")}</p>
              <div className="withdraw-grid">
                <div className="field">
                  <span>{t("blockchainNetwork")}</span>
                  <select
                    value={withdrawBlockchain}
                    onChange={(e) => setWithdrawBlockchain(e.target.value)}
                  >
                    {chains.map((chain) => (
                      <option value={chain} key={chain}>
                        {chain}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <span>{t("amountUsd")}</span>
                  <input
                    type="number"
                    min="5"
                    step="0.01"
                    placeholder="25.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div className="field wide">
                  <span>{t("walletAddress")}</span>
                  <input
                    placeholder="Paste your wallet address"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => void submitWithdrawal()}
              >
                <Wallet size={16} />{" "}
                {busy ? t("submitting") : t("requestWithdrawal")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "wallet" && activeTopup ? (
        <section className="topup-proof-card" id="topup-payment-request">
          <header>
            <div>
              <span className="section-index">
                {t("paymentRequest").toUpperCase()}
              </span>
              <h2>
                Wallet credit {formatMoney(activeTopup.amountCents)}
              </h2>
              <p>
                {activeTopup.method.replaceAll("_", " ")} · request{" "}
                {activeTopup.reference}
              </p>
            </div>
            <span className="status-pill pending">
              {t("awaitingPayment").toUpperCase()}
            </span>
          </header>
          <dl className="topup-fee-breakdown" aria-label="Saved top-up quote">
            <div>
              <dt>Wallet credit</dt>
              <dd>{formatMoney(activeTopup.amountCents)}</dd>
            </div>
            <div>
              <dt>Estimated blockchain fee (buyer pays)</dt>
              <dd>{formatMoney(activeTopup.networkFeeCents)}</dd>
            </div>
            <div>
              <dt>Estimated total buyer cost</dt>
              <dd>{formatMoney(activeTopup.totalPayableCents)}</dd>
            </div>
          </dl>
          <div className="topup-address-box">
            <small>{t("sendOnlyAddress")}</small>
            <code>{activeTopup.depositAddress}</code>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard?.writeText(
                  activeTopup.depositAddress ?? "",
                )
              }
            >
              <ClipboardCopy size={15} /> {t("copyAddress")}
            </button>
          </div>
          <div className="topup-proof-grid">
            <label>
              <span>{t("transactionId")} *</span>
              <input
                value={proofTx}
                maxLength={66}
                onChange={(event) => setProofTx(event.target.value)}
                placeholder="Paste the complete on-chain transaction hash"
              />
              <small>
                Use the full TXID shown by your wallet or exchange. You can
                submit the form to see exact validation for the selected
                network.
              </small>
            </label>
            <label className="topup-upload">
              <UploadCloud size={24} />
              <span>
                {proofFile ? proofFile.name : `${t("uploadScreenshot")} *`}
              </span>
              <small>{t("proofFileRules")}</small>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (
                    file &&
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setProofFile(null);
                    setTopupFeedback({
                      kind: "error",
                      text: "Use a JPEG, PNG, or WebP screenshot.",
                    });
                    event.currentTarget.value = "";
                    return;
                  }
                  if (file && file.size > 8 * 1024 * 1024) {
                    setProofFile(null);
                    setTopupFeedback({
                      kind: "error",
                      text: "The screenshot is larger than 8 MB. Choose a smaller image.",
                    });
                    event.currentTarget.value = "";
                    return;
                  }
                  setProofFile(file);
                  if (file)
                    setTopupFeedback({
                      kind: "info",
                      text: "Screenshot attached. Confirm the TXID, then submit the proof for admin review.",
                    });
                }}
              />
            </label>
          </div>
          <footer>
            <small>
              <Clock3 size={17} /> {t("approvalProofNote")}
            </small>
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={() => void submitProof()}
            >
              <CheckCircle2 size={18} />{" "}
              {busy ? t("confirming") : t("confirmPayment")}
            </button>
          </footer>
        </section>
      ) : null}

      {mode === "transactions" ? (
        <section className="section-block wallet-ledger">
          <header className="wallet-ledger-heading">
            <div>
              <span className="section-index">
                {t("auditableLedger").toUpperCase()}
              </span>
              <h2>{t("balanceActivity")}</h2>
            </div>
            <small>{t("separateBalances")}</small>
          </header>
          {transactions.length ? (
            <div className="wallet-ledger-list">
              {transactions.map((entry) => (
                <article key={entry.id}>
                  <span
                    className={
                      entry.amountCents >= 0 ? "ledger-credit" : "ledger-debit"
                    }
                  >
                    <ReceiptText />
                  </span>
                  <div>
                    <strong>{entry.description}</strong>
                    <small>
                      {entry.balanceKind === "SELLER"
                        ? "Seller balance"
                        : "Buyer balance"}{" "}
                      · {new Date(entry.createdAt).toLocaleString()}
                    </small>
                    {entry.reference ? <code>{entry.reference}</code> : null}
                  </div>
                  <b
                    className={entry.amountCents >= 0 ? "positive" : "negative"}
                  >
                    {entry.amountCents >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(entry.amountCents))}
                  </b>
                  <small>After: {formatMoney(entry.balanceAfter)}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state-large">
              <ReceiptText size={42} />
              <h2>No balance activity yet</h2>
              <p>
                Approved top-ups, purchases, releases, and withdrawals appear
                here.
              </p>
            </div>
          )}
        </section>
      ) : null}

      {user.role === "SELLER" && withdrawals.length > 0 && (
        <div className="section-block">
          <h2>
            Withdrawal history <small>({withdrawals.length} total)</small>
          </h2>
          <div className="compact-orders">
            {withdrawals.map((withdrawal) => (
              <div className="compact-order" key={withdrawal.id}>
                <div className="co-left">
                  <Wallet size={16} />
                  <div>
                    <strong>{formatMoney(withdrawal.amountCents)}</strong>
                    <small>
                      {withdrawal.blockchain} · {withdrawal.walletAddress}
                    </small>
                    {withdrawal.adminNotes ? (
                      <small>{withdrawal.adminNotes}</small>
                    ) : null}
                  </div>
                </div>
                <div className="co-right">
                  <span
                    className={`status-pill ${withdrawal.status.toLowerCase()}`}
                  >
                    {withdrawal.status}
                  </span>
                  <small>
                    {new Date(withdrawal.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {deposits.length > 0 && (
        <div className="section-block">
          <h2>
            Deposit history <small>({deposits.length} total)</small>
          </h2>
          <div className="compact-orders">
            {deposits.map((deposit) => (
              <div className="compact-order" key={deposit.id}>
                <div className="co-left">
                  <Bitcoin size={16} />
                  <div>
                    <strong>{formatMoney(deposit.amountCents)}</strong>
                    <small>
                      {deposit.method.replaceAll("_", " ")} ·{" "}
                      {deposit.reference}
                    </small>
                    {deposit.txHash ? (
                      <small>
                        TXID: {deposit.txHash.slice(0, 18)}…{" "}
                        {deposit.screenshotUrl ? "· proof attached" : ""}
                      </small>
                    ) : (
                      <button
                        className="action-link"
                        onClick={() => setActiveTopup(deposit)}
                      >
                        Continue payment proof
                      </button>
                    )}
                  </div>
                </div>
                <div className="co-right">
                  <span
                    className={`status-pill ${deposit.status.toLowerCase()}`}
                  >
                    {deposit.status === "PENDING"
                      ? deposit.txHash && deposit.screenshotUrl
                        ? "PENDING APPROVAL"
                        : "AWAITING PROOF"
                      : deposit.status}
                  </span>
                  <small>
                    {new Date(deposit.createdAt).toLocaleDateString()}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!deposits.length && (user.role !== "SELLER" || !withdrawals.length) && (
        <div className="empty-state-large">
          <Bitcoin size={48} />
          <h2>No wallet history yet</h2>
          <p>
            Your top-ups will appear here after submission, with a clear
            pending, completed, or rejected status.
          </p>
        </div>
      )}
    </div>
  );
}
