import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  FileText,
  FolderPlus,
  Gavel,
  Headphones,
  LayoutTemplate,
  LogOut,
  ImagePlus,
  PackageOpen,
  PackagePlus,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Store,
  Tag,
  UserRoundX,
  Users,
  WalletCards,
  Landmark,
  MessageSquare,
  Send,
  Activity,
  Bell,
  ChevronDown,
  ChevronLeft,
  Command,
  Database,
  HardDrive,
  Home,
  Menu,
  Moon,
  Server,
  ShieldCheck,
  Sun,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ApiError,
  apiRequest,
  type Role,
  type SellerApplication,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Seo } from "../components/Seo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import {
  mergeSellerTaxonomy,
  sellerCategorySelection,
} from "../commerce/sellerTaxonomy";
import { catalogAttributePresets } from "../data/enterpriseCatalog";

type Tab =
  | "overview"
  | "sellers"
  | "products"
  | "suppliers"
  | "users"
  | "orders"
  | "payments"
  | "deposits"
  | "withdrawals"
  | "refunds"
  | "disputes"
  | "tickets"
  | "chats"
  | "categories"
  | "coupons"
  | "reports"
  | "homepage";

type Overview = {
  pendingSellers: number;
  pendingProducts: number;
  openTickets: number;
  openDisputes: number;
  refundRequests: number;
  awaitingPayments: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  users: number;
  orders: number;
  totalRevenueCents: number;
  todayRevenueCents: number;
  monthlyRevenueCents: number;
  annualRevenueCents: number;
  marketplaceCommissionCents: number;
  netProfitCents: number;
  frozenBalanceCents: number;
  verifiedUsers: number;
  suspendedUsers: number;
  totalSellers: number;
  activeSellers: number;
  totalBuyers: number;
  totalProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  ordersToday: number;
  ordersThisMonth: number;
  publicStorageBytes: number;
  conversionRate: number;
  revenueSeries: Array<{ label: string; value: number }>;
};

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: Role;
  emailVerified: boolean;
  isSuspended: boolean;
  suspensionReason?: string | null;
};

type Product = {
  id: string;
  name: string;
  status: string;
  isOfficial?: boolean;
  officialStoreName?: string | null;
  priceCents: number;
  priceUsdCents?: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  rejectionReason?: string | null;
  coverImageUrl?: string | null;
  type?: string;
  category: {
    id?: string;
    name: string;
    parent?: {
      id?: string;
      name: string;
      parent?: { id?: string; name: string } | null;
    } | null;
  };
  files: Array<{ id: string; displayName?: string }>;
  inventoryItems: Array<{
    id: string;
    deliveredAt?: string | null;
    isActive: boolean;
  }>;
  seller: {
    id: string;
    email: string;
    username: string;
    sellerProfile?: { storeName: string; isSuspended: boolean } | null;
  };
};

type DarkShoppingCategory = {
  id: number;
  name: string;
  icon?: string;
};

type DarkShoppingCategoryMapping = {
  remoteCategoryId: number;
  categoryId: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type DarkShoppingProduct = {
  id: number;
  name: string;
  miniature?: string;
  description: string;
  price: number;
  minimum_order: number;
  quantity: number;
  is_manual_order_delivery: 0 | 1 | boolean;
  category: DarkShoppingCategory;
  group?: { id: number; name: string };
  rating?: number | string | null;
  quality_percent?: number | null;
};

type DarkShoppingListing = {
  id: string;
  remoteProductId: number;
  supplierPriceRubCents: number;
  marginPercent: number;
  remoteQuantity: number;
  remoteMinimumOrder: number;
  isEnabled: boolean;
  lastSyncedAt: string;
  lastError?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    status: string;
    priceUsdCents: number;
    priceRubCents: number;
    stockQuantity: number;
    category: { id: string; name: string; slug: string };
  };
};

type DarkShoppingFulfillment = {
  id: string;
  remoteOrderId?: number | null;
  status: string;
  supplierUnitPriceRubCents: number;
  quantity: number;
  attempts: number;
  lastError?: string | null;
  lastCheckedAt?: string | null;
  fulfilledAt?: string | null;
  orderItem: {
    productName: string;
    order: { id: string; orderNumber: string };
  };
};

type DarkShoppingResale = {
  configuration: {
    configured: boolean;
    configurationIssue?: string | null;
    marginPercent: number;
    requestsPerSecond: number;
    deployment?: {
      project: string | null;
      service: string | null;
      environment: string | null;
      repository: string | null;
      branch: string | null;
      commit: string | null;
      expectedRepository: string;
      expectedBranch: string;
      sourceMatchesExpectedRepository: boolean | null;
    };
  };
  supplierAccess?: {
    status:
      | "ready"
      | "not_configured"
      | "invalid_key"
      | "access_denied"
      | "rate_limited"
      | "unavailable";
    message: string;
    providerStatus: number | null;
    settingsUrl: string;
  };
  balance: { balance: number; currency: string } | null;
  categoryMappings?: DarkShoppingCategoryMapping[];
  listings: DarkShoppingListing[];
  fulfillments: DarkShoppingFulfillment[];
};

type Order = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  buyer: { firstName: string; lastName: string; email: string };
  payment?: { id: string; method: string; status: string } | null;
  items: Array<{ id: string; productName: string }>;
};

type Deposit = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  reference?: string | null;
  depositAddress?: string | null;
  txHash?: string | null;
  screenshotUrl?: string | null;
  proofSubmittedAt?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    balanceCents: number;
    sellerBalanceCents?: number;
  };
};

type Refund = {
  id: string;
  status: string;
  amountCents: number;
  reason: string;
  createdAt: string;
  order: { orderNumber: string; payment?: { method: string } | null };
  requestedBy: { email: string };
};

type Withdrawal = {
  id: string;
  amountCents: number;
  blockchain: string;
  walletAddress: string;
  status: string;
  providerReference?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  processedAt?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    balanceCents: number;
    sellerBalanceCents?: number;
    role?: string;
  };
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
    id?: string;
    orderNumber: string;
    buyer?: { email: string };
    items?: Array<{ productName?: string; product?: { name?: string } }>;
  };
  openedBy: { email: string };
};
type Ticket = {
  id: string;
  ticketNumber: string;
  status: string;
  category: string;
  subject: string;
  updatedAt: string;
  creator: { email: string };
  messages: Array<{
    id: string;
    body: string;
    isInternal: boolean;
    author: { firstName: string; role: string };
  }>;
};
type Category = {
  id: string;
  parentId?: string | null;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  backingId?: string | null;
  isTaxonomyOption?: boolean;
};
type Coupon = {
  id: string;
  code: string;
  percentOff?: number | null;
  amountOffCents?: number | null;
  redemptionCount: number;
  maxRedemptions?: number | null;
  isActive: boolean;
  expiresAt?: string | null;
};
type Report = {
  id: string;
  status: string;
  reason: string;
  details?: string | null;
  createdAt: string;
  adminNotes?: string | null;
  product: { name: string; slug: string; status: string };
  reporter: { email: string };
};
type HomepageSection = {
  id: string;
  key: string;
  title: string;
  subtitle?: string | null;
  isVisible: boolean;
  sortOrder: number;
};
type ChatSession = {
  id: string;
  subject?: string | null;
  status: string;
  updatedAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  messages: Array<{
    id: string;
    role: string;
    body: string;
    createdAt: string;
  }>;
};

function chatDisplayName(session: ChatSession) {
  if (session.user) {
    return (
      `${session.user.firstName} ${session.user.lastName}`.trim() ||
      session.user.email
    );
  }
  return session.guestName?.trim() || "Website visitor";
}

function chatInitials(session: ChatSession) {
  return chatDisplayName(session)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
type AdminSearchResult = {
  id: string;
  type: string;
  label: string;
  meta: string;
  tab: Tab;
};

type NavItem = { id: Tab; label: string; icon: LucideIcon };

const nav: NavItem[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "sellers", label: "Seller applications", icon: Store },
  { id: "products", label: "Product approvals", icon: Boxes },
  { id: "suppliers", label: "Dark Shopping resale", icon: Database },
  { id: "users", label: "Users & sellers", icon: Users },
  { id: "orders", label: "All orders", icon: PackageCheck },
  { id: "payments", label: "Order approvals", icon: CircleDollarSign },
  { id: "deposits", label: "Deposit approvals", icon: WalletCards },
  { id: "withdrawals", label: "Withdrawals", icon: Landmark },
  { id: "refunds", label: "Refunds", icon: RefreshCw },
  { id: "disputes", label: "Disputes", icon: Gavel },
  { id: "tickets", label: "Support tickets", icon: Headphones },
  { id: "chats", label: "Admin chat inbox", icon: MessageSquare },
  { id: "categories", label: "Categories", icon: FolderPlus },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "reports", label: "Safety reports", icon: ShieldAlert },
  { id: "homepage", label: "Homepage", icon: LayoutTemplate },
];

const navGroups: Array<{ label: string; icon: LucideIcon; items: Tab[] }> = [
  { label: "Command center", icon: Command, items: ["overview"] },
  {
    label: "Marketplace",
    icon: Store,
    items: [
      "products",
      "suppliers",
      "categories",
      "sellers",
      "homepage",
      "coupons",
    ],
  },
  { label: "Users & access", icon: Users, items: ["users"] },
  {
    label: "Orders & resolution",
    icon: PackageCheck,
    items: ["orders", "refunds", "disputes"],
  },
  {
    label: "Finance",
    icon: CircleDollarSign,
    items: ["payments", "deposits", "withdrawals"],
  },
  {
    label: "Support & safety",
    icon: ShieldCheck,
    items: ["tickets", "chats", "reports"],
  },
];

const adminPathTabs: Record<string, Tab> = {
  "/admin/seller-applications": "sellers",
  "/admin/approvals": "products",
  "/admin/live": "chats",
  "/admin/kb/editor": "tickets",
  "/admin/earnings": "overview",
};

function money(cents = 0) {
  return `$${(cents / 100).toFixed(2)}`;
}

function rubles(cents = 0) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(cents / 100);
}

function supplierRetailRubCents(priceRub: number, marginPercent: number) {
  return Math.ceil((Math.round(priceRub * 100) * (100 + marginPercent)) / 100);
}

function categoryPath(category: Category, categories: Category[]) {
  const names = [category.name];
  let parentId = category.parentId;
  let guard = 0;
  while (parentId && guard < 4) {
    const parent = categories.find((entry) => entry.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
    guard += 1;
  }
  return names.join(" / ");
}

function categoryLevel(category: Category, categories: Category[]) {
  let level = 1;
  let parentId = category.parentId;
  let guard = 0;
  while (parentId && guard < 4) {
    const parent = categories.find((entry) => entry.id === parentId);
    if (!parent) break;
    level += 1;
    parentId = parent.parentId;
    guard += 1;
  }
  return level;
}

function Status({ value }: { value: string }) {
  return (
    <span className={`status-pill ${value.toLowerCase()}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function OperationsAdminPage() {
  const { user } = useAuth();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    return nav.some((item) => item.id === hash)
      ? hash
      : (adminPathTabs[window.location.pathname] ?? "overview");
  });
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<
    AdminSearchResult[]
  >([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const activeGroup = navGroups.find((group) => group.items.includes(tab));
    return [activeGroup?.label ?? "Command center"];
  });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(
    [],
  );
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    parentId: "",
    sortOrder: 1000,
  });
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [productCreatorOpen, setProductCreatorOpen] = useState(false);
  const [productStatusFilter, setProductStatusFilter] = useState("PENDING");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productCreating, setProductCreating] = useState(false);
  const [adminCoverImage, setAdminCoverImage] = useState<File | null>(null);
  const [adminCoverPreview, setAdminCoverPreview] = useState("");
  const [adminProductForm, setAdminProductForm] = useState({
    categoryPathIds: [] as string[],
    officialStoreName: "Ysello Official",
    name: "",
    shortDescription: "",
    description: "",
    type: "DOWNLOAD",
    priceUsd: "",
    priceCny: "",
    priceRub: "",
    afterSalesServiceHours: 12,
    deliveryNote: "",
    inventoryLines: "",
    brand: "",
    platform: "",
    region: "",
    country: "",
    server: "",
    language: "English",
    deliveryMethod: "Protected order delivery",
    productKind: "",
    condition: "New",
    stockType: "Single",
    duration: "",
    warranty: "",
    refundPolicy: "",
    stockQuantity: 0,
    minimumOrder: 1,
    maximumOrder: 1,
    sku: "",
    tags: "",
    instantDelivery: false,
    manualDelivery: true,
    digitalDownload: true,
    productAttributes: {} as Record<string, string>,
    publish: true,
  });
  const [darkResale, setDarkResale] = useState<DarkShoppingResale | null>(null);
  const [darkCategories, setDarkCategories] = useState<DarkShoppingCategory[]>(
    [],
  );
  const [darkProducts, setDarkProducts] = useState<DarkShoppingProduct[]>([]);
  const [darkProductPage, setDarkProductPage] = useState(1);
  const [darkProductPageCount, setDarkProductPageCount] = useState(1);
  const [darkCategoryId, setDarkCategoryId] = useState("");
  const [darkProductSearch, setDarkProductSearch] = useState("");
  const [darkSelectedProductIds, setDarkSelectedProductIds] = useState<
    number[]
  >([]);
  const [darkTargetCategoryId, setDarkTargetCategoryId] = useState("");
  const [darkMarginPercent, setDarkMarginPercent] = useState(30);
  const [darkPublish, setDarkPublish] = useState(false);

  function selectTab(next: Tab) {
    setTabState(next);
    const activeGroup = navGroups.find((group) => group.items.includes(next));
    setOpenGroups([activeGroup?.label ?? "Command center"]);
    setGlobalSearch("");
    setMobileNavOpen(false);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${next}`,
    );
  }

  function toggleGroup(label: string) {
    setOpenGroups((current) => (current.includes(label) ? [] : [label]));
  }

  useEffect(() => {
    if (!adminCoverImage) {
      setAdminCoverPreview("");
      return;
    }
    const preview = URL.createObjectURL(adminCoverImage);
    setAdminCoverPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [adminCoverImage]);

  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (nav.some((item) => item.id === hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>(".admin-global-search input")
          ?.focus();
      }
      if (event.key === "Escape") {
        setNotificationOpen(false);
        setMobileNavOpen(false);
        setGlobalSearch("");
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const load = useCallback(async () => {
    setMessage("");
    setLoading(true);
    if (tab === "suppliers") setDarkResale(null);
    const paths: Record<Tab, string> = {
      overview: "/api/admin/overview",
      sellers: "/api/admin/seller-applications",
      products: "/api/admin/products",
      suppliers: "/api/admin/dark-shopping/resale",
      users: "/api/admin/users",
      orders: "/api/admin/orders",
      payments: "/api/admin/orders",
      deposits: "/api/admin/wallet-deposits",
      withdrawals: "/api/admin/withdrawals",
      refunds: "/api/admin/refunds",
      disputes: "/api/admin/disputes",
      tickets: "/api/admin/tickets",
      chats: "/api/nexus/admin/chats",
      categories: "/api/admin/categories",
      coupons: "/api/admin/coupons",
      reports: "/api/admin/reports",
      homepage: "/api/admin/homepage",
    };

    try {
      const data = await apiRequest<Record<string, unknown>>(paths[tab]);
      if (tab === "overview") setOverview(data.overview as Overview);
      if (tab === "sellers")
        setApplications(data.applications as SellerApplication[]);
      if (tab === "products") {
        setProducts(data.products as Product[]);
        const categoryData = await apiRequest<{ categories: Category[] }>(
          "/api/admin/categories",
        );
        setCategories(categoryData.categories);
      }
      if (tab === "suppliers") {
        const resale = data as unknown as DarkShoppingResale;
        setDarkResale(resale);
        setDarkMarginPercent(resale.configuration.marginPercent ?? 30);
        const categoryData = await apiRequest<{ categories: Category[] }>(
          "/api/admin/categories",
        );
        setCategories(categoryData.categories);
        if (
          resale.configuration.configured &&
          (!resale.supplierAccess || resale.supplierAccess.status === "ready")
        ) {
          const remoteCategories = await apiRequest<{
            data: { items: DarkShoppingCategory[] };
          }>("/api/admin/dark-shopping/categories?perPage=1000");
          setDarkCategories(remoteCategories.data.items);
        } else {
          setDarkCategories([]);
        }
      }
      if (tab === "users") setUsers(data.users as AdminUser[]);
      if (tab === "orders" || tab === "payments")
        setOrders(data.orders as Order[]);
      if (tab === "deposits") setDeposits(data.deposits as Deposit[]);
      if (tab === "withdrawals")
        setWithdrawals(data.withdrawals as Withdrawal[]);
      if (tab === "refunds") setRefunds(data.refunds as Refund[]);
      if (tab === "disputes") setDisputes(data.disputes as Dispute[]);
      if (tab === "tickets") setTickets(data.tickets as Ticket[]);
      if (tab === "chats") setChatSessions(data.sessions as ChatSession[]);
      if (tab === "categories") setCategories(data.categories as Category[]);
      if (tab === "coupons") setCoupons(data.coupons as Coupon[]);
      if (tab === "reports") setReports(data.reports as Report[]);
      if (tab === "homepage")
        setHomepageSections(data.sections as HomepageSection[]);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not load this workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (
      tab === "chats" &&
      chatSessions.length &&
      !chatSessions.some((session) => session.id === activeChatId)
    ) {
      setActiveChatId(chatSessions[0].id);
    }
  }, [activeChatId, chatSessions, tab]);

  async function sendAdminChat(event: FormEvent) {
    event.preventDefault();
    if (!activeChatId || !chatReply.trim()) return;
    const text = chatReply.trim();
    setChatReply("");
    await post(activeChatId, `/api/nexus/admin/chats/${activeChatId}/reply`, {
      body: text,
    });
  }

  async function searchDarkShoppingProducts(event?: FormEvent, page = 1) {
    event?.preventDefault();
    setBusy("dark-shopping-search");
    setMessage("");
    try {
      const query = new URLSearchParams({
        onlyInStock: "true",
        deliveryType: "auto",
        perPage: "100",
        page: String(page),
      });
      if (darkCategoryId) query.set("categoryId", darkCategoryId);
      if (darkProductSearch.trim()) query.set("name", darkProductSearch.trim());
      const result = await apiRequest<{
        data: {
          items: DarkShoppingProduct[];
          _meta?: { currentPage: number; pageCount: number };
        };
      }>(`/api/admin/dark-shopping/products?${query.toString()}`);
      setDarkProducts(result.data.items);
      setDarkProductPage(result.data._meta?.currentPage ?? page);
      setDarkProductPageCount(result.data._meta?.pageCount ?? 1);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Supplier products could not be loaded.",
      );
    } finally {
      setBusy("");
    }
  }

  async function testDarkShoppingConnection() {
    setBusy("dark-shopping-test");
    setMessage("");
    try {
      const result = await apiRequest<{
        data: { balance: number; currency: string };
      }>("/api/admin/dark-shopping/balance");
      await load();
      setMessage(
        `Connection successful. Supplier balance: ${Number(result.data.balance).toFixed(2)} ${result.data.currency}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Dark Shopping connection test failed.",
      );
    } finally {
      setBusy("");
    }
  }

  async function importDarkCategory() {
    const remoteCategoryId = Number(darkCategoryId);
    if (!Number.isSafeInteger(remoteCategoryId) || remoteCategoryId <= 0) {
      setMessage("Choose a Dark Shopping category first.");
      return;
    }
    setBusy("dark-shopping-category-import");
    setMessage("");
    try {
      const result = await apiRequest<{
        category: Category;
        imported: boolean;
        reactivated: boolean;
      }>("/api/admin/dark-shopping/resale/categories/import", {
        method: "POST",
        body: { remoteCategoryId },
      });
      setDarkTargetCategoryId(result.category.id);
      await load();
      setMessage(
        result.imported
          ? `Dark Shopping category “${result.category.name}” added to Ysello.`
          : result.reactivated
            ? `Ysello category “${result.category.name}” reactivated.`
            : `Dark Shopping category “${result.category.name}” is already in Ysello.`,
      );
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Dark Shopping category could not be added.",
      );
    } finally {
      setBusy("");
    }
  }

  function toggleDarkProduct(productId: number) {
    setDarkSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }
      if (current.length >= 100) {
        setMessage("Select at most 100 supplier products per import.");
        return current;
      }
      return [...current, productId];
    });
  }

  async function importDarkProducts() {
    if (!darkSelectedProductIds.length || !darkTargetCategoryId) {
      setMessage("Select supplier products and a Ysello category first.");
      return;
    }
    setBusy("dark-shopping-import");
    setMessage("");
    try {
      const result = await apiRequest<{
        imported: Array<{ remoteProductId: number }>;
        skipped: Array<{ remoteProductId: number; reason: string }>;
      }>("/api/admin/dark-shopping/resale/import", {
        method: "POST",
        body: {
          remoteProductIds: darkSelectedProductIds,
          categoryId: darkTargetCategoryId,
          publish: darkPublish,
        },
      });
      setDarkSelectedProductIds([]);
      setMessage(
        `${result.imported.length} supplier product${result.imported.length === 1 ? "" : "s"} imported${darkPublish ? " and published" : " as draft"}.${result.skipped.length ? ` ${result.skipped.length} skipped: ${result.skipped.map((item) => item.reason).join("; ")}` : ""}`,
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Supplier products could not be imported.",
      );
    } finally {
      setBusy("");
    }
  }

  async function syncDarkListings(listingId?: string) {
    setBusy(listingId ?? "dark-shopping-sync");
    setMessage("");
    try {
      const result = await apiRequest<{ synced: number; unavailable: number }>(
        "/api/admin/dark-shopping/resale/sync",
        { method: "POST", body: { listingId } },
      );
      setMessage(
        `${result.synced} supplier listing${result.synced === 1 ? "" : "s"} synchronized.${result.unavailable ? ` ${result.unavailable} unavailable.` : ""}`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Sync failed.");
    } finally {
      setBusy("");
    }
  }

  async function updateDarkListing(
    listing: DarkShoppingListing,
    input: { isEnabled?: boolean },
  ) {
    setBusy(listing.id);
    setMessage("");
    try {
      await apiRequest(
        `/api/admin/dark-shopping/resale/listings/${listing.id}`,
        {
          method: "PATCH",
          body: input,
        },
      );
      setMessage("Supplier listing updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Update failed.");
    } finally {
      setBusy("");
    }
  }

  async function retryDarkFulfillment(fulfillmentId: string) {
    setBusy(fulfillmentId);
    setMessage("");
    try {
      await apiRequest(
        `/api/admin/dark-shopping/resale/fulfillments/${fulfillmentId}/retry`,
        { method: "POST" },
      );
      setMessage("Supplier fulfillment retry started.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Retry failed.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "chats") return;
    const refreshChats = () =>
      void apiRequest<{ sessions: ChatSession[] }>("/api/nexus/admin/chats")
        .then((data) => setChatSessions(data.sessions))
        .catch(() => undefined);
    const interval = window.setInterval(refreshChats, 5000);
    return () => window.clearInterval(interval);
  }, [tab]);

  useEffect(() => {
    const query = globalSearch.trim();
    if (query.length < 2) {
      setGlobalSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void apiRequest<{ results: AdminSearchResult[] }>(
        `/api/admin/search?q=${encodeURIComponent(query)}`,
      )
        .then((data) => setGlobalSearchResults(data.results))
        .catch(() => setGlobalSearchResults([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [globalSearch]);

  const act = async (
    id: string,
    path: string,
    body: Record<string, unknown>,
  ) => {
    setBusy(id);
    setMessage("");
    try {
      await apiRequest(path, { method: "PATCH", body });
      setMessage("Change saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };

  const moderateProduct = async (
    product: Product,
    status: "APPROVED" | "REJECTED" | "REMOVED",
    reason?: string,
  ) => {
    setBusy(product.id);
    setMessage("");
    try {
      const result = await apiRequest<{
        product: Product;
        message?: string;
        deliveryReady?: boolean;
      }>(`/api/admin/products/${product.id}/status`, {
        method: "PATCH",
        body: { status, ...(reason ? { reason } : {}) },
      });
      setProducts((current) =>
        current.map((entry) =>
          entry.id === product.id ? { ...entry, ...result.product } : entry,
        ),
      );
      setMessage(result.message ?? "Product status updated.");
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Product status could not be updated.",
      );
    } finally {
      setBusy("");
    }
  };

  const post = async (
    id: string,
    path: string,
    body: Record<string, unknown> = {},
  ) => {
    setBusy(id);
    setMessage("");
    try {
      await apiRequest(path, { method: "POST", body });
      setMessage("Action completed.");
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Action failed.");
    } finally {
      setBusy("");
    }
  };

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setCategoryCreating(true);
    setMessage("");
    try {
      await apiRequest("/api/admin/categories", {
        method: "POST",
        body: {
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description,
          parentId: categoryForm.parentId || null,
          sortOrder: categoryForm.sortOrder,
        },
      });
      setCategoryForm({
        name: "",
        slug: "",
        description: "",
        parentId: "",
        sortOrder: 1000,
      });
      setMessage(
        "Category created. It is now available on the homepage and seller product form.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Category could not be created.",
      );
    } finally {
      setCategoryCreating(false);
    }
  }

  async function toggleCategory(category: Category) {
    await act(category.id, `/api/admin/categories/${category.id}`, {
      isActive: !category.isActive,
    });
  }

  const filteredUsers = useMemo(
    () =>
      users.filter((entry) =>
        `${entry.firstName} ${entry.lastName} ${entry.email} ${entry.username}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search, users],
  );
  const pendingOrders = orders.filter(
    (order) => order.payment?.status === "REQUIRES_ACTION",
  );
  const adminCatalogCategories = useMemo(
    () => mergeSellerTaxonomy(categories),
    [categories],
  );
  const adminCategoryLevels = useMemo(() => {
    const levels: Category[][] = [];
    let parentId: string | null = null;
    for (let depth = 0; depth < 12; depth += 1) {
      const choices = adminCatalogCategories.filter(
        (category) => (category.parentId ?? null) === parentId,
      );
      if (!choices.length) break;
      levels.push(choices);
      const selected = adminProductForm.categoryPathIds[depth];
      if (!selected || !choices.some((category) => category.id === selected))
        break;
      parentId = selected;
    }
    return levels;
  }, [adminCatalogCategories, adminProductForm.categoryPathIds]);
  const adminSelectedTaxonomyId =
    adminProductForm.categoryPathIds[
      adminProductForm.categoryPathIds.length - 1
    ] ?? "";
  const adminCategorySelection = sellerCategorySelection(
    adminSelectedTaxonomyId,
    adminCatalogCategories,
  );
  const adminSelectedCategoryId = adminCategorySelection?.backingId ?? "";
  const adminSelectedPath = adminCategorySelection?.path ?? [];
  const adminSelectedRoot = adminSelectedPath[0];
  const adminIsSocialAccountListing =
    adminSelectedRoot?.slug === "social-media";
  const adminSocialPlatform = adminIsSocialAccountListing
    ? (adminSelectedPath[1]?.name ?? "")
    : "";
  const adminSocialAccountType = adminIsSocialAccountListing
    ? (adminSelectedPath[adminSelectedPath.length - 1]?.name ?? "")
    : "";
  const adminResolvedPlatform = adminIsSocialAccountListing
    ? adminSocialPlatform
    : adminProductForm.platform.trim();
  const adminResolvedProductKind = adminIsSocialAccountListing
    ? "Social media account"
    : adminProductForm.productKind.trim();
  const adminResolvedCondition = adminIsSocialAccountListing
    ? adminSocialAccountType === "New accounts"
      ? "New"
      : adminSocialAccountType === "Old accounts"
        ? "Old"
        : adminSocialAccountType
    : adminProductForm.condition.trim();
  const adminDynamicAttributes = adminSelectedRoot?.slug
    ? (catalogAttributePresets[adminSelectedRoot.slug] ?? [])
    : [];
  const canManageCatalog =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const availableCategoryParents = categories.filter(
    (category) => category.isActive && categoryLevel(category, categories) < 3,
  );
  const pendingAttention =
    (overview?.pendingSellers ?? 0) +
    (overview?.pendingProducts ?? 0) +
    (overview?.pendingDeposits ?? 0) +
    (overview?.pendingWithdrawals ?? 0) +
    (overview?.openTickets ?? 0);
  const productBelongsToCategory = useCallback(
    (product: Product, categoryId: string) =>
      !categoryId ||
      [
        product.category.id,
        product.category.parent?.id,
        product.category.parent?.parent?.id,
      ].includes(categoryId),
    [],
  );
  const visibleAdminProducts = products.filter(
    (product) =>
      (productStatusFilter === "ALL" ||
        product.status === productStatusFilter) &&
      productBelongsToCategory(product, productCategoryFilter),
  );
  const selectedCategoryProducts = products.filter((product) =>
    productBelongsToCategory(product, adminSelectedCategoryId),
  );

  async function createAdminProduct(event: FormEvent) {
    event.preventDefault();
    if (!adminSelectedCategoryId) {
      setMessage("Choose a category path for the catalog product.");
      return;
    }
    if (adminCategoryLevels[adminProductForm.categoryPathIds.length]?.length) {
      setMessage(
        "Complete every category, platform, product, and account type.",
      );
      return;
    }
    if (!adminCoverImage) {
      setMessage("Choose a clear product image.");
      return;
    }
    if (adminCoverImage.size > 8 * 1024 * 1024) {
      setMessage("Product image must be 8 MB or smaller.");
      return;
    }
    setProductCreating(true);
    setMessage("");
    const data = new FormData();
    data.append("categoryId", adminSelectedCategoryId);
    data.append("officialStoreName", adminProductForm.officialStoreName.trim());
    data.append("name", adminProductForm.name);
    data.append("shortDescription", adminProductForm.shortDescription);
    data.append("description", adminProductForm.description);
    data.append("type", adminProductForm.type);
    data.append(
      "priceUsdCents",
      String(Math.round(Number(adminProductForm.priceUsd) * 100)),
    );
    if (adminProductForm.priceCny)
      data.append(
        "priceCnyCents",
        String(Math.round(Number(adminProductForm.priceCny) * 100)),
      );
    if (adminProductForm.priceRub)
      data.append(
        "priceRubCents",
        String(Math.round(Number(adminProductForm.priceRub) * 100)),
      );
    data.append(
      "afterSalesServiceHours",
      String(adminProductForm.afterSalesServiceHours),
    );
    data.append("deliveryNote", adminProductForm.deliveryNote);
    data.append("inventoryLines", adminProductForm.inventoryLines);
    data.append("brand", adminProductForm.brand);
    data.append("platform", adminResolvedPlatform);
    data.append("region", adminProductForm.region);
    data.append("country", adminProductForm.country);
    data.append("server", adminProductForm.server);
    data.append("language", adminProductForm.language);
    data.append("deliveryMethod", adminProductForm.deliveryMethod);
    data.append("productKind", adminResolvedProductKind);
    data.append("condition", adminResolvedCondition);
    data.append("stockType", adminProductForm.stockType);
    data.append("duration", adminProductForm.duration);
    data.append("warranty", adminProductForm.warranty);
    data.append("refundPolicy", adminProductForm.refundPolicy);
    data.append("stockQuantity", String(adminProductForm.stockQuantity));
    data.append("minimumOrder", String(adminProductForm.minimumOrder));
    data.append("maximumOrder", String(adminProductForm.maximumOrder));
    data.append("sku", adminProductForm.sku);
    data.append("tags", adminProductForm.tags);
    data.append("instantDelivery", String(adminProductForm.instantDelivery));
    data.append("manualDelivery", String(adminProductForm.manualDelivery));
    data.append("digitalDownload", String(adminProductForm.digitalDownload));
    data.append(
      "productAttributes",
      JSON.stringify({
        ...adminProductForm.productAttributes,
        marketplaceCategoryPath: adminSelectedPath
          .map((category) => category.name)
          .join(" / "),
      }),
    );
    data.append("publish", String(adminProductForm.publish));
    data.append("coverImage", adminCoverImage);
    try {
      const result = await apiRequest<{ message?: string }>(
        "/api/admin/products",
        { method: "POST", body: data },
      );
      setMessage(result.message ?? "Catalog product created.");
      setProductCreatorOpen(false);
      setAdminCoverImage(null);
      setAdminProductForm((current) => ({
        ...current,
        officialStoreName: "Ysello Official",
        name: "",
        shortDescription: "",
        description: "",
        priceUsd: "",
        priceCny: "",
        priceRub: "",
        deliveryNote: "",
        inventoryLines: "",
        brand: "",
        platform: "",
        region: "",
        country: "",
        server: "",
        productKind: "",
        duration: "",
        warranty: "",
        refundPolicy: "",
        stockQuantity: 0,
        sku: "",
        tags: "",
        productAttributes: {},
      }));
      await load();
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Catalog product could not be created.",
      );
    } finally {
      setProductCreating(false);
    }
  }

  return (
    <main
      className={`ops-admin admin-enterprise ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${darkMode ? "admin-theme-dark" : ""}`}
    >
      <Seo
        title="Admin dashboard"
        description="Ysello administration for seller approval, product moderation, deposits, orders, and support."
        noIndex
      />
      {mobileNavOpen ? (
        <button
          className="admin-drawer-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`ops-sidebar admin-enterprise-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}
      >
        <div className="admin-brand-row">
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
              <small>CONTROL CENTER</small>
            </span>
          </Link>
          <button
            type="button"
            className="admin-collapse-button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
          <button
            type="button"
            className="admin-mobile-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="panel-mobile-sidebar-tools">
          <LocaleSwitcher compact />
          <Link to="/sign-out">
            <LogOut size={16} /> Sign out
          </Link>
        </div>
        <label className="admin-menu-search">
          <Search />
          <input
            value={menuSearch}
            onChange={(event) => setMenuSearch(event.target.value)}
            placeholder="Search menu"
          />
        </label>
        <nav className="admin-grouped-nav" aria-label="Admin navigation">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const items = group.items
              .map((id) => nav.find((entry) => entry.id === id)!)
              .filter(
                (item) =>
                  (item.id !== "suppliers" || canManageCatalog) &&
                  (!menuSearch.trim() ||
                    item.label
                      .toLowerCase()
                      .includes(menuSearch.trim().toLowerCase())),
              );
            if (!items.length) return null;
            const open =
              openGroups.includes(group.label) ||
              Boolean(menuSearch.trim()) ||
              sidebarCollapsed;
            return (
              <section key={group.label}>
                <button
                  type="button"
                  className="admin-nav-group"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={open}
                >
                  <GroupIcon />
                  <span>{group.label}</span>
                  <ChevronDown className={open ? "rotated" : ""} />
                </button>
                {open ? (
                  <div>
                    {items.map(({ id, label, icon: Icon }) => (
                      <span className="admin-nav-item" key={id}>
                        <button
                          className={tab === id ? "active" : ""}
                          onClick={() => selectTab(id)}
                          title={label}
                        >
                          <Icon />
                          <span>{label}</span>
                          {id !== "overview" && (
                            <b>
                              {id === "sellers"
                                ? overview?.pendingSellers
                                : id === "products"
                                  ? overview?.pendingProducts
                                  : id === "deposits"
                                    ? overview?.pendingDeposits
                                    : id === "withdrawals"
                                      ? overview?.pendingWithdrawals
                                      : id === "tickets"
                                        ? overview?.openTickets
                                        : null}
                            </b>
                          )}
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <div>
            <span>
              {user?.firstName[0]}
              {user?.lastName[0]}
            </span>
            <div>
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
              <small>{user?.role.replace("_", " ")}</small>
            </div>
          </div>
          <Link className="secondary-button" to="/">
            <Home size={14} /> Home
          </Link>
          <Link className="secondary-button" to="/sign-out">
            <LogOut size={14} /> Sign out
          </Link>
        </div>
      </aside>

      <section className="ops-main">
        <header className="ops-topbar admin-enterprise-topbar">
          <div className="admin-topbar-leading">
            <button
              type="button"
              className="admin-mobile-menu"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span className="admin-mobile-title">
              <ShieldCheck />
              <span>
                <small>YSELLO</small>
                <strong>Admin workspace</strong>
              </span>
            </span>
            <div className="admin-global-search">
              <Search />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search users, orders, products, tickets…"
              />
              <kbd>⌘ K</kbd>
              {globalSearchResults.length ? (
                <div>
                  {globalSearchResults.map((result) => {
                    const Icon =
                      nav.find((item) => item.id === result.tab)?.icon ??
                      Search;
                    return (
                      <button
                        type="button"
                        key={`${result.type}-${result.id}`}
                        onClick={() => selectTab(result.tab)}
                      >
                        <Icon />
                        <span>
                          <strong>{result.label}</strong>
                          <small>
                            {result.type} · {result.meta}
                          </small>
                        </span>
                        <ChevronRight />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-system-pill">
              <i /> All systems operational
            </span>
            <button
              type="button"
              className="admin-icon-button"
              onClick={() => setDarkMode((value) => !value)}
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun /> : <Moon />}
            </button>
            <button
              type="button"
              className="admin-icon-button notification"
              onClick={() => setNotificationOpen((value) => !value)}
              aria-label="Notifications"
            >
              <Bell />
              {pendingAttention ? (
                <b>{Math.min(99, pendingAttention)}</b>
              ) : null}
            </button>
            <LocaleSwitcher />
            <Link
              className="panel-topbar-signout"
              to="/sign-out"
              aria-label="Sign out"
            >
              <LogOut size={16} /> Sign out
            </Link>
            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => void load()}
            >
              <RefreshCw className={loading ? "spinning" : ""} />
              <span>Sync</span>
            </button>
            <div className="admin-profile-chip">
              <span>
                {user?.firstName[0]}
                {user?.lastName[0]}
              </span>
              <div>
                <strong>
                  {user?.firstName} {user?.lastName}
                </strong>
                <small>{user?.role.replace("_", " ")}</small>
              </div>
            </div>
          </div>
          {notificationOpen ? (
            <aside className="admin-notification-popover">
              <header>
                <div>
                  <strong>Command alerts</strong>
                  <small>{pendingAttention} items need attention</small>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationOpen(false)}
                >
                  <X />
                </button>
              </header>
              <button type="button" onClick={() => selectTab("deposits")}>
                <WalletCards />
                <span>
                  <strong>Deposit approvals</strong>
                  <small>
                    {overview?.pendingDeposits ?? 0} awaiting review
                  </small>
                </span>
              </button>
              <button type="button" onClick={() => selectTab("products")}>
                <Boxes />
                <span>
                  <strong>Product moderation</strong>
                  <small>
                    {overview?.pendingProducts ?? 0} pending products
                  </small>
                </span>
              </button>
              <button type="button" onClick={() => selectTab("tickets")}>
                <Headphones />
                <span>
                  <strong>Support queue</strong>
                  <small>{overview?.openTickets ?? 0} open tickets</small>
                </span>
              </button>
            </aside>
          ) : null}
          {loading ? <span className="admin-loading-line" /> : null}
        </header>
        <div className="ops-heading admin-page-heading">
          <div>
            <span className="section-index">ENTERPRISE ADMINISTRATION</span>
            <h1>
              {tab === "overview"
                ? `Welcome back, ${user?.firstName ?? "Admin"}`
                : nav.find((item) => item.id === tab)?.label}
            </h1>
            <p>
              {tab === "overview"
                ? "Review marketplace activity, approval queues, customer operations, and available financial records from one command center."
                : "Search, review and act with protected permissions, clear status visibility and a complete operational workflow."}
            </p>
          </div>
          <div className="admin-heading-actions">
            <button type="button" onClick={() => selectTab("deposits")}>
              <WalletCards /> Review deposits
            </button>
            {canManageCatalog ? (
              <button
                type="button"
                className="primary"
                onClick={() => setProductCreatorOpen(true)}
              >
                <PackagePlus /> Add product
              </button>
            ) : null}
          </div>
        </div>
        {message ? (
          <div
            className={`ops-message ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("could not") ? "error" : ""}`}
          >
            {message}
          </div>
        ) : null}

        {tab === "overview" &&
          (loading && !overview ? (
            <AdminOverviewSkeleton />
          ) : (
            <OverviewPanel overview={overview} onOpen={selectTab} />
          ))}

        {tab === "sellers" && (
          <section className="ops-grid">
            {applications.length ? (
              applications.map((app) => (
                <article className="ops-card" key={app.id}>
                  <header>
                    <div>
                      <span className="store-avatar">
                        {app.storeName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <h2>{app.storeName}</h2>
                        <p>
                          {app.fullLegalName} · {app.email}
                        </p>
                      </div>
                    </div>
                    <Status value={app.status} />
                  </header>
                  <p>{app.storeDescription}</p>
                  <dl>
                    <div>
                      <dt>Location</dt>
                      <dd>
                        {app.city}, {app.country}
                      </dd>
                    </div>
                    <div>
                      <dt>Categories</dt>
                      <dd>{app.productCategories.join(", ")}</dd>
                    </div>
                    <div>
                      <dt>Document</dt>
                      <dd>
                        {app.documentType?.replaceAll("_", " ") ??
                          "Not provided"}
                      </dd>
                    </div>
                  </dl>
                  <div className="seller-document-actions">
                    {app.documentFrontOriginalName ? (
                      <a
                        href={`/api/admin/seller-applications/${app.id}/documents/front`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={14} /> Front side
                      </a>
                    ) : (
                      <span>Front missing</span>
                    )}
                    {app.documentBackOriginalName ? (
                      <a
                        href={`/api/admin/seller-applications/${app.id}/documents/back`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText size={14} /> Back side
                      </a>
                    ) : (
                      <span>Back missing</span>
                    )}
                  </div>
                  <footer>
                    <button
                      className="approve"
                      disabled={busy === app.id}
                      onClick={() =>
                        void act(
                          app.id,
                          `/api/admin/seller-applications/${app.id}`,
                          { status: "APPROVED" },
                        )
                      }
                    >
                      <BadgeCheck size={14} /> Approve
                    </button>
                    <button
                      className="danger"
                      disabled={busy === app.id}
                      onClick={() =>
                        void act(
                          app.id,
                          `/api/admin/seller-applications/${app.id}`,
                          {
                            status: "REJECTED",
                            adminNotes:
                              window.prompt("Reason for rejection") ||
                              "Application does not meet seller requirements.",
                          },
                        )
                      }
                    >
                      <AlertTriangle size={14} /> Reject
                    </button>
                  </footer>
                </article>
              ))
            ) : (
              <EmptyState label="No seller applications found." />
            )}
          </section>
        )}

        {tab === "products" && (
          <section className="admin-products-workspace">
            <header className="admin-workspace-toolbar">
              <div>
                <span className="section-index">CATALOG CONTROL</span>
                <h2>Products and approvals</h2>
                <p>
                  Review seller products or publish an official catalog listing
                  with a full category path.
                </p>
              </div>
              {canManageCatalog ? (
                <button
                  className="primary-button"
                  onClick={() => setProductCreatorOpen(true)}
                >
                  <PackagePlus size={16} /> Add catalog product
                </button>
              ) : (
                <small>
                  Only an administrator can publish catalog products.
                </small>
              )}
            </header>
            <div
              className="admin-product-filter"
              role="group"
              aria-label="Filter products by status"
            >
              {["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => (
                <button
                  type="button"
                  key={status}
                  className={productStatusFilter === status ? "active" : ""}
                  aria-pressed={productStatusFilter === status}
                  onClick={() => setProductStatusFilter(status)}
                >
                  {status === "ALL" ? "All products" : status.toLowerCase()}
                  <span>
                    {status === "ALL"
                      ? products.length
                      : products.filter((product) => product.status === status)
                          .length}
                  </span>
                </button>
              ))}
              <label>
                <span className="sr-only">Filter products by category</span>
                <select
                  value={productCategoryFilter}
                  onChange={(event) =>
                    setProductCategoryFilter(event.target.value)
                  }
                >
                  <option value="">Every category</option>
                  {categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {"—".repeat(categoryLevel(category, categories))}{" "}
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <section className="admin-product-grid">
              {visibleAdminProducts.length ? (
                visibleAdminProducts.map((product) => (
                  <article className="admin-product-card" key={product.id}>
                    <div className="admin-product-identity">
                      <span aria-hidden="true">
                        <PackageOpen />
                      </span>
                      <small>{product.type ?? "DIGITAL"}</small>
                    </div>
                    <div className="admin-product-copy">
                      <div>
                        <Status value={product.status} />
                        {product.isOfficial ? (
                          <span className="status-pill approved">OFFICIAL</span>
                        ) : null}
                        <small>{product.type ?? "DIGITAL"}</small>
                      </div>
                      <h3>{product.name}</h3>
                      <p>
                        {[
                          product.category.parent?.parent?.name,
                          product.category.parent?.name,
                          product.category.name,
                        ]
                          .filter(Boolean)
                          .join(" / ")}{" "}
                        · {money(product.priceUsdCents ?? product.priceCents)}
                      </p>
                      <small>
                        {product.officialStoreName ??
                          product.seller.sellerProfile?.storeName ??
                          product.seller.username}{" "}
                        · {product.seller.email}
                      </small>
                      <small>
                        {product.files.length} files ·{" "}
                        {
                          product.inventoryItems.filter(
                            (item) => item.isActive && !item.deliveredAt,
                          ).length
                        }{" "}
                        unsold rows
                      </small>
                      {product.rejectionReason ? (
                        <b>{product.rejectionReason}</b>
                      ) : null}
                    </div>
                    <footer>
                      <button
                        className="approve"
                        disabled={
                          busy === product.id || product.status === "APPROVED"
                        }
                        onClick={() =>
                          void moderateProduct(product, "APPROVED")
                        }
                      >
                        <BadgeCheck size={14} />{" "}
                        {product.status === "APPROVED" ? "Approved" : "Approve"}
                      </button>
                      <button
                        disabled={busy === product.id}
                        onClick={() =>
                          void moderateProduct(
                            product,
                            "REJECTED",
                            window.prompt("Reason for rejection") ||
                              "Product needs changes before approval.",
                          )
                        }
                      >
                        Reject
                      </button>
                      <button
                        className="danger"
                        disabled={busy === product.id}
                        onClick={() =>
                          void moderateProduct(
                            product,
                            "REMOVED",
                            window.prompt("Removal reason") ||
                              "Removed by marketplace admin.",
                          )
                        }
                      >
                        Remove
                      </button>
                    </footer>
                  </article>
                ))
              ) : (
                <EmptyState
                  label={`No ${productStatusFilter === "ALL" ? "" : productStatusFilter.toLowerCase()} products found.`}
                />
              )}
            </section>
          </section>
        )}

        {tab === "suppliers" && (
          <section className="dark-resale-workspace">
            <header className="admin-workspace-toolbar dark-resale-heading">
              <div>
                <span className="section-index">DARK SHOPPING SUPPLIER</span>
                <h2>Add Dark Shopping categories and products</h2>
                <p>
                  Import only the supplier categories and automatic-delivery
                  products you choose. Price and stock are rechecked before
                  every Ysello checkout.
                </p>
              </div>
              <div className="dark-resale-balance">
                <small>Supplier balance</small>
                <strong>
                  {darkResale?.balance
                    ? `${darkResale.balance.balance.toFixed(2)} ${darkResale.balance.currency}`
                    : "Not available"}
                </strong>
                <span>
                  Global markup {darkResale?.configuration.marginPercent ?? 30}
                  %
                </span>
                <button
                  type="button"
                  disabled={
                    busy === "dark-shopping-test" ||
                    !darkResale?.configuration.configured
                  }
                  onClick={() => void testDarkShoppingConnection()}
                >
                  <ShieldCheck size={15} />
                  {busy === "dark-shopping-test"
                    ? "Testing…"
                    : "Test connection"}
                </button>
              </div>
            </header>

            {!darkResale ? (
              <div className="ops-message error">
                <strong>Dark Shopping status did not load.</strong> The frontend
                may be calling an outdated or incorrect API deployment. Confirm
                the ysello.com <code>/api</code> rewrite points to the Railway
                service serving api.ysello.com, then reconnect that service to
                Imtiaz6228/ysello branch main and redeploy the latest commit.
              </div>
            ) : !darkResale.configuration.configured ? (
              <div className="ops-message error">
                <strong>
                  {darkResale.configuration.configurationIssue ??
                    "Dark Shopping configuration has not loaded."}
                </strong>{" "}
                Add a newly rotated key to the Railway service serving
                api.ysello.com—not Vercel, Postgres, or another service—then
                deploy the staged variable change.
                {darkResale.configuration.deployment && (
                  <>
                    <br />
                    <span>
                      Runtime:{" "}
                      {darkResale.configuration.deployment.project ??
                        "unknown project"}
                      {" / "}
                      {darkResale.configuration.deployment.service ??
                        "unknown service"}
                      {" / "}
                      {darkResale.configuration.deployment.environment ??
                        "unknown environment"}
                      . Source:{" "}
                      {darkResale.configuration.deployment.repository ??
                        "unknown"}
                      {darkResale.configuration.deployment.branch
                        ? ` (${darkResale.configuration.deployment.branch})`
                        : ""}
                      {darkResale.configuration.deployment.commit
                        ? ` @ ${darkResale.configuration.deployment.commit}`
                        : ""}
                      .
                    </span>
                  </>
                )}
                {darkResale.configuration.deployment
                  ?.sourceMatchesExpectedRepository === false && (
                  <>
                    <br />
                    <strong>
                      Wrong Railway source detected. Reconnect this service to{" "}
                      {darkResale.configuration.deployment.expectedRepository},
                      branch{" "}
                      {darkResale.configuration.deployment.expectedBranch}.
                    </strong>
                  </>
                )}
              </div>
            ) : darkResale.supplierAccess &&
              darkResale.supplierAccess.status !== "ready" ? (
              <div className="ops-message error">
                <strong>{darkResale.supplierAccess.message}</strong>
                {darkResale.supplierAccess.status === "access_denied" && (
                  <>
                    <p>
                      Dark Shopping requires an account balance above zero, a
                      linked and verified Telegram account, and an approved API
                      application. Select resale as the purpose and include
                      https://ysello.com as the website.
                    </p>
                    <p>
                      Categories and products are loaded live after Dark
                      Shopping approves the account. Nothing is published to
                      Ysello until an admin explicitly adds it.
                    </p>
                  </>
                )}
                <a
                  href={darkResale.supplierAccess.settingsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Dark Shopping API settings
                </a>
              </div>
            ) : (
              <>
                <form
                  className="dark-resale-controls"
                  onSubmit={searchDarkShoppingProducts}
                >
                  <label>
                    <span>Dark Shopping category</span>
                    <select
                      value={darkCategoryId}
                      onChange={(event) => {
                        const nextCategoryId = event.target.value;
                        setDarkCategoryId(nextCategoryId);
                        const mapping = darkResale?.categoryMappings?.find(
                          (item) =>
                            item.remoteCategoryId === Number(nextCategoryId),
                        );
                        if (mapping) setDarkTargetCategoryId(mapping.categoryId);
                      }}
                    >
                      <option value="">Every supplier category</option>
                      {darkCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      busy === "dark-shopping-category-import" ||
                      !darkCategoryId
                    }
                    onClick={() => void importDarkCategory()}
                  >
                    <FolderPlus size={16} />
                    {busy === "dark-shopping-category-import"
                      ? "Adding…"
                      : darkResale?.categoryMappings?.some(
                            (item) =>
                              item.remoteCategoryId === Number(darkCategoryId),
                          )
                        ? "Category added"
                        : "Add category to Ysello"}
                  </button>
                  <label>
                    <span>Find supplier products</span>
                    <input
                      value={darkProductSearch}
                      onChange={(event) =>
                        setDarkProductSearch(event.target.value)
                      }
                      placeholder="Search product name"
                    />
                  </label>
                  <button
                    className="primary-button"
                    disabled={busy === "dark-shopping-search"}
                  >
                    <Search size={16} />
                    {busy === "dark-shopping-search"
                      ? "Loading…"
                      : "Load products"}
                  </button>
                </form>

                {darkProducts.length ? (
                  <>
                    <section className="dark-resale-import-bar">
                      <div>
                        <strong>
                          {darkSelectedProductIds.length} selected
                        </strong>
                        <small>
                          Retail price = supplier RUB cost + {darkMarginPercent}
                          %
                        </small>
                      </div>
                      <div className="dark-resale-fixed-markup">
                        <span>Global markup</span>
                        <strong>{darkMarginPercent}% locked</strong>
                      </div>
                      <label>
                        <span>Ysello category</span>
                        <select
                          value={darkTargetCategoryId}
                          onChange={(event) =>
                            setDarkTargetCategoryId(event.target.value)
                          }
                        >
                          <option value="">Choose destination category</option>
                          {categories
                            .filter((category) => category.isActive)
                            .map((category) => (
                              <option key={category.id} value={category.id}>
                                {categoryPath(category, categories)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="dark-resale-publish">
                        <input
                          type="checkbox"
                          checked={darkPublish}
                          onChange={(event) =>
                            setDarkPublish(event.target.checked)
                          }
                        />
                        <span>Publish immediately after review</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const eligible = darkProducts
                            .filter(
                              (product) =>
                                product.is_manual_order_delivery !== true &&
                                product.is_manual_order_delivery !== 1 &&
                                product.minimum_order <= 20,
                            )
                            .map((product) => product.id);
                          setDarkSelectedProductIds((current) => {
                            if (eligible.every((id) => current.includes(id))) {
                              return current.filter(
                                (id) => !eligible.includes(id),
                              );
                            }
                            return [
                              ...new Set([...current, ...eligible]),
                            ].slice(0, 100);
                          });
                        }}
                      >
                        Select eligible page
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          busy === "dark-shopping-import" ||
                          !darkSelectedProductIds.length ||
                          !darkTargetCategoryId
                        }
                        onClick={() => void importDarkProducts()}
                      >
                        <PackagePlus size={16} />
                        {busy === "dark-shopping-import"
                          ? "Importing…"
                          : "Import selected"}
                      </button>
                    </section>
                    <section className="dark-resale-product-grid">
                      {darkProducts.map((product) => {
                        const selected = darkSelectedProductIds.includes(
                          product.id,
                        );
                        const unsupported =
                          Boolean(product.is_manual_order_delivery) ||
                          product.minimum_order > 20;
                        const retailRubCents = supplierRetailRubCents(
                          product.price,
                          darkMarginPercent,
                        );
                        return (
                          <article
                            className={`${selected ? "selected" : ""} ${unsupported ? "unsupported" : ""}`}
                            key={product.id}
                          >
                            <div className="dark-resale-product-image">
                              {product.miniature ? (
                                <img
                                  src={product.miniature}
                                  alt=""
                                  loading="lazy"
                                />
                              ) : (
                                <PackageOpen />
                              )}
                              <label>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={unsupported}
                                  onChange={() => toggleDarkProduct(product.id)}
                                />
                                <span>{selected ? "Selected" : "Select"}</span>
                              </label>
                            </div>
                            <div>
                              <small>
                                {product.category.name} /{" "}
                                {product.group?.name ?? "Other"}
                              </small>
                              <h3>{product.name}</h3>
                              <p>
                                {product.description
                                  .replace(/<[^>]+>/g, " ")
                                  .slice(0, 180)}
                              </p>
                              <dl>
                                <div>
                                  <dt>Supplier</dt>
                                  <dd>{product.price.toFixed(2)} RUB</dd>
                                </div>
                                <div>
                                  <dt>Your retail</dt>
                                  <dd>{rubles(retailRubCents)}</dd>
                                </div>
                                <div>
                                  <dt>Stock</dt>
                                  <dd>{product.quantity}</dd>
                                </div>
                                <div>
                                  <dt>Minimum</dt>
                                  <dd>{product.minimum_order}</dd>
                                </div>
                              </dl>
                              {unsupported ? (
                                <b>
                                  {product.is_manual_order_delivery
                                    ? "Manual supplier delivery is not supported."
                                    : "Supplier minimum exceeds Ysello's 20-unit limit."}
                                </b>
                              ) : null}
                            </div>
                          </article>
                        );
                      })}
                    </section>
                    {darkProductPageCount > 1 ? (
                      <nav
                        className="dark-resale-pagination"
                        aria-label="Supplier product pages"
                      >
                        <button
                          type="button"
                          disabled={
                            darkProductPage <= 1 ||
                            busy === "dark-shopping-search"
                          }
                          onClick={() =>
                            void searchDarkShoppingProducts(
                              undefined,
                              darkProductPage - 1,
                            )
                          }
                        >
                          Previous
                        </button>
                        <span>
                          Page {darkProductPage} of {darkProductPageCount}
                        </span>
                        <button
                          type="button"
                          disabled={
                            darkProductPage >= darkProductPageCount ||
                            busy === "dark-shopping-search"
                          }
                          onClick={() =>
                            void searchDarkShoppingProducts(
                              undefined,
                              darkProductPage + 1,
                            )
                          }
                        >
                          Next
                        </button>
                      </nav>
                    ) : null}
                  </>
                ) : (
                  <EmptyState label="Choose a supplier category or search to load automatic-delivery products." />
                )}
              </>
            )}

            <section className="dark-resale-section">
              <header>
                <div>
                  <h2>Resale listings</h2>
                  <p>Current supplier cost, retail price, stock, and status.</p>
                </div>
                <button
                  type="button"
                  disabled={busy === "dark-shopping-sync"}
                  onClick={() => void syncDarkListings()}
                >
                  <RefreshCw size={15} /> Sync all
                </button>
              </header>
              {darkResale?.listings.length ? (
                <div className="dark-resale-list">
                  {darkResale.listings.map((listing) => (
                    <article key={listing.id}>
                      <div>
                        <strong>{listing.product.name}</strong>
                        <small>
                          Dark #{listing.remoteProductId} →{" "}
                          {listing.product.category.name}
                        </small>
                        {listing.lastError ? <b>{listing.lastError}</b> : null}
                      </div>
                      <span>
                        <small>Supplier</small>
                        <strong>{rubles(listing.supplierPriceRubCents)}</strong>
                      </span>
                      <span>
                        <small>Retail</small>
                        <strong>{rubles(listing.product.priceRubCents)}</strong>
                      </span>
                      <span>
                        <small>Margin / stock</small>
                        <strong>
                          {listing.marginPercent}% / {listing.remoteQuantity}
                        </strong>
                      </span>
                      <div className="row-actions">
                        <button
                          disabled={busy === listing.id}
                          onClick={() => void syncDarkListings(listing.id)}
                        >
                          Sync
                        </button>
                        <button
                          className={listing.isEnabled ? "danger" : "approve"}
                          disabled={busy === listing.id}
                          onClick={() =>
                            void updateDarkListing(listing, {
                              isEnabled: !listing.isEnabled,
                            })
                          }
                        >
                          {listing.isEnabled ? "Pause" : "Enable"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState label="No Dark Shopping products have been selected for resale." />
              )}
            </section>

            <section className="dark-resale-section">
              <header>
                <div>
                  <h2>Supplier fulfillment</h2>
                  <p>Remote order and protected-delivery status.</p>
                </div>
              </header>
              {darkResale?.fulfillments.length ? (
                <div className="dark-resale-list fulfillments">
                  {darkResale.fulfillments.map((fulfillment) => (
                    <article key={fulfillment.id}>
                      <div>
                        <strong>{fulfillment.orderItem.productName}</strong>
                        <small>
                          Ysello {fulfillment.orderItem.order.orderNumber} ·
                          Dark {fulfillment.remoteOrderId ?? "pending"}
                        </small>
                        {fulfillment.lastError ? (
                          <b>{fulfillment.lastError}</b>
                        ) : null}
                      </div>
                      <span>
                        <small>Status</small>
                        <Status value={fulfillment.status} />
                      </span>
                      <span>
                        <small>Supplier cost</small>
                        <strong>
                          {rubles(
                            fulfillment.supplierUnitPriceRubCents *
                              fulfillment.quantity,
                          )}
                        </strong>
                      </span>
                      <span>
                        <small>Attempts</small>
                        <strong>{fulfillment.attempts}</strong>
                      </span>
                      <div className="row-actions">
                        <button
                          disabled={
                            busy === fulfillment.id ||
                            fulfillment.status === "FULFILLED"
                          }
                          onClick={() =>
                            void retryDarkFulfillment(fulfillment.id)
                          }
                        >
                          Retry
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState label="No supplier orders have been created yet." />
              )}
            </section>
          </section>
        )}

        {tab === "users" && (
          <>
            <label className="ops-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
              />
            </label>
            <section className="ops-table">
              <div className="ops-row ops-row-head">
                <span>User</span>
                <span>Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {filteredUsers.map((entry) => (
                <div className="ops-row" key={entry.id}>
                  <div>
                    <strong>
                      {entry.firstName} {entry.lastName}
                    </strong>
                    <small>
                      {entry.email} · @{entry.username}
                    </small>
                  </div>
                  <div>{entry.role.replace("_", " ")}</div>
                  <div>
                    <Status
                      value={
                        entry.isSuspended
                          ? "SUSPENDED"
                          : entry.emailVerified
                            ? "ACTIVE"
                            : "UNVERIFIED"
                      }
                    />
                  </div>
                  <div className="row-actions">
                    <button
                      className={entry.isSuspended ? "approve" : "danger"}
                      disabled={busy === entry.id}
                      onClick={() =>
                        void act(
                          entry.id,
                          `/api/admin/users/${entry.id}/suspension`,
                          {
                            suspended: !entry.isSuspended,
                            reason: entry.isSuspended
                              ? undefined
                              : window.prompt("Suspension reason") ||
                                "Suspended by admin.",
                          },
                        )
                      }
                    >
                      {entry.isSuspended ? (
                        <BadgeCheck size={14} />
                      ) : (
                        <UserRoundX size={14} />
                      )}{" "}
                      {entry.isSuspended ? "Unsuspend" : "Suspend"}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "orders" && (
          <OrdersTable
            orders={orders}
            busy={busy}
            approve={(order) =>
              order.payment
                ? post(
                    order.payment.id,
                    `/api/admin/payments/${order.payment.id}/approve`,
                  )
                : Promise.resolve()
            }
          />
        )}
        {tab === "payments" && (
          <OrdersTable
            orders={pendingOrders}
            busy={busy}
            approve={(order) =>
              order.payment
                ? post(
                    order.payment.id,
                    `/api/admin/payments/${order.payment.id}/approve`,
                  )
                : Promise.resolve()
            }
            emptyLabel="No orders are awaiting admin approval."
          />
        )}

        {tab === "deposits" && (
          <section className="ops-table topup-admin-table">
            <div className="ops-row ops-row-head">
              <span>Payment proof</span>
              <span>Buyer</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {deposits.map((deposit) => (
              <div className="ops-row" key={deposit.id}>
                <div>
                  <strong>{money(deposit.amountCents)}</strong>
                  <small>
                    {deposit.method.replaceAll("_", " ")} ·{" "}
                    {deposit.reference ?? "No reference"}
                  </small>
                  <small>TXID: {deposit.txHash ?? "Proof not submitted"}</small>
                  <small>{new Date(deposit.createdAt).toLocaleString()}</small>
                  {deposit.screenshotUrl ? (
                    <a
                      className="deposit-proof-link"
                      href={deposit.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ImagePlus size={13} /> View screenshot proof
                    </a>
                  ) : null}
                </div>
                <div>
                  <strong>
                    {deposit.user.firstName} {deposit.user.lastName}
                  </strong>
                  <small>{deposit.user.email}</small>
                  <small>Balance: {money(deposit.user.balanceCents)}</small>
                </div>
                <div>
                  <Status
                    value={
                      deposit.status === "PENDING"
                        ? deposit.txHash && deposit.screenshotUrl
                          ? "PENDING APPROVAL"
                          : "AWAITING PROOF"
                        : deposit.status
                    }
                  />
                  <small>{deposit.adminNotes}</small>
                </div>
                <div className="row-actions">
                  <button
                    className="approve"
                    disabled={
                      busy === deposit.id ||
                      !["PENDING", "VERIFIED"].includes(deposit.status) ||
                      !deposit.txHash ||
                      !deposit.screenshotUrl
                    }
                    onClick={() =>
                      void act(
                        deposit.id,
                        `/api/admin/wallet-deposits/${deposit.id}/approve`,
                        {
                          adminNotes: "TXID and screenshot reviewed by admin.",
                        },
                      )
                    }
                  >
                    <BadgeCheck size={14} /> Approve & credit
                  </button>
                  <button
                    className="danger"
                    disabled={
                      busy === deposit.id ||
                      !["PENDING", "VERIFIED"].includes(deposit.status)
                    }
                    onClick={() =>
                      void act(
                        deposit.id,
                        `/api/admin/wallet-deposits/${deposit.id}/reject`,
                        {
                          adminNotes:
                            window.prompt(
                              "Reason for rejecting this deposit",
                            ) || "Deposit proof could not be verified.",
                        },
                      )
                    }
                  >
                    <AlertTriangle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "withdrawals" && (
          <section className="ops-table">
            <div className="ops-row ops-row-head">
              <span>Withdrawal</span>
              <span>User</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {withdrawals.map((withdrawal) => (
              <div className="ops-row" key={withdrawal.id}>
                <div>
                  <strong>{money(withdrawal.amountCents)}</strong>
                  <small>
                    {withdrawal.blockchain} ·{" "}
                    {withdrawal.providerReference ?? "No reference"}
                  </small>
                  <small>{withdrawal.walletAddress}</small>
                  <small>
                    {new Date(withdrawal.createdAt).toLocaleString()}
                  </small>
                </div>
                <div>
                  <strong>
                    {withdrawal.user.firstName} {withdrawal.user.lastName}
                  </strong>
                  <small>
                    {withdrawal.user.email} · @{withdrawal.user.username}
                  </small>
                  <small>
                    Seller balance:{" "}
                    {money(withdrawal.user.sellerBalanceCents ?? 0)}
                  </small>
                </div>
                <div>
                  <Status value={withdrawal.status} />
                  <small>{withdrawal.adminNotes}</small>
                </div>
                <div className="row-actions">
                  <button
                    className="approve"
                    disabled={
                      busy === withdrawal.id || withdrawal.status !== "PENDING"
                    }
                    onClick={() =>
                      void act(
                        withdrawal.id,
                        `/api/admin/withdrawals/${withdrawal.id}/approve`,
                        {
                          adminNotes:
                            window.prompt("Approval note / tx hash") ||
                            "Withdrawal sent by admin.",
                        },
                      )
                    }
                  >
                    <BadgeCheck size={14} /> Approve paid
                  </button>
                  <button
                    className="danger"
                    disabled={
                      busy === withdrawal.id || withdrawal.status !== "PENDING"
                    }
                    onClick={() =>
                      void act(
                        withdrawal.id,
                        `/api/admin/withdrawals/${withdrawal.id}/reject`,
                        {
                          adminNotes:
                            window.prompt("Reason for rejection") ||
                            "Withdrawal rejected by admin.",
                        },
                      )
                    }
                  >
                    <AlertTriangle size={14} /> Reject & return
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "refunds" && (
          <SimpleRows
            rows={refunds.map((refund) => ({
              id: refund.id,
              title: `${refund.order.orderNumber} · ${money(refund.amountCents)}`,
              meta: `${refund.requestedBy.email} · ${refund.reason}`,
              status: refund.status,
              actions: (
                <>
                  <button
                    disabled={busy === refund.id}
                    onClick={() =>
                      void act(refund.id, `/api/admin/refunds/${refund.id}`, {
                        status: "COMPLETED",
                      })
                    }
                  >
                    Complete refund
                  </button>
                  <button
                    disabled={busy === refund.id}
                    onClick={() =>
                      void act(refund.id, `/api/admin/refunds/${refund.id}`, {
                        status: "REJECTED",
                        adminNotes:
                          window.prompt("Reason") || "Rejected by admin.",
                      })
                    }
                  >
                    Reject
                  </button>
                </>
              ),
            }))}
          />
        )}
        {tab === "disputes" && (
          <SimpleRows
            rows={disputes.map((dispute) => ({
              id: dispute.id,
              title: `${dispute.order.orderNumber} · ${dispute.subject}`,
              meta: `${dispute.openedBy.email} · ${dispute.description}${dispute.autoCloseAt ? ` · waiting for ${dispute.awaitingParty} until ${new Date(dispute.autoCloseAt).toLocaleString()}` : ""}`,
              status: dispute.status,
              actions: (
                <>
                  <button
                    className="approve"
                    disabled={busy === dispute.id}
                    onClick={() =>
                      void act(
                        dispute.id,
                        `/api/admin/disputes/${dispute.id}`,
                        {
                          status: "RESOLVED_BUYER",
                          resolution:
                            window.prompt("Buyer-favor resolution") ||
                            "Admin favored buyer.",
                        },
                      )
                    }
                  >
                    Favor buyer
                  </button>
                  <button
                    disabled={busy === dispute.id}
                    onClick={() =>
                      void act(
                        dispute.id,
                        `/api/admin/disputes/${dispute.id}`,
                        {
                          status: "RESOLVED_SELLER",
                          resolution:
                            window.prompt("Seller-favor resolution") ||
                            "Admin favored seller.",
                        },
                      )
                    }
                  >
                    Favor seller
                  </button>
                  <button
                    disabled={busy === dispute.id}
                    onClick={() =>
                      void post(
                        dispute.id,
                        `/api/admin/disputes/${dispute.id}/message`,
                        {
                          body:
                            window.prompt("Admin message") ||
                            "Admin is reviewing this dispute.",
                        },
                      )
                    }
                  >
                    Message
                  </button>
                  <button
                    className="danger"
                    disabled={busy === dispute.id}
                    onClick={() =>
                      void act(
                        dispute.id,
                        `/api/admin/disputes/${dispute.id}`,
                        {
                          status: "CLOSED",
                          resolution:
                            window.prompt("Resolution note") ||
                            "Closed by admin.",
                        },
                      )
                    }
                  >
                    Close
                  </button>
                </>
              ),
            }))}
          />
        )}
        {tab === "tickets" && (
          <SimpleRows
            rows={tickets.map((ticket) => ({
              id: ticket.id,
              title: `${ticket.ticketNumber} · ${ticket.subject}`,
              meta: `${ticket.creator.email} · ${ticket.category}`,
              status: ticket.status,
              actions: (
                <>
                  <button
                    disabled={busy === ticket.id}
                    onClick={() =>
                      void post(
                        ticket.id,
                        `/api/admin/tickets/${ticket.id}/reply`,
                        {
                          body:
                            window.prompt("Reply") ||
                            "Admin reviewed this ticket.",
                          status: "PENDING",
                          isInternal: false,
                        },
                      )
                    }
                  >
                    Reply
                  </button>
                </>
              ),
            }))}
          />
        )}
        {tab === "chats" && (
          <section className="admin-chat-console">
            {chatSessions.length ? (
              <>
                <aside className="admin-chat-list">
                  {chatSessions.map((session) => (
                    <button
                      key={session.id}
                      className={activeChatId === session.id ? "active" : ""}
                      onClick={() => setActiveChatId(session.id)}
                    >
                      <span className="chat-user-avatar">
                        {chatInitials(session)}
                      </span>
                      <span>
                        <strong>{chatDisplayName(session)}</strong>
                        <small>
                          {session.messages[session.messages.length - 1]
                            ?.body ?? "No messages"}
                        </small>
                      </span>
                      <Status value={session.status} />
                    </button>
                  ))}
                </aside>
                {chatSessions
                  .filter((session) => session.id === activeChatId)
                  .map((session) => (
                    <article className="admin-chat-focus" key={session.id}>
                      <header>
                        <div className="chat-user-avatar">
                          {chatInitials(session)}
                        </div>
                        <div>
                          <strong>{chatDisplayName(session)}</strong>
                          <small>
                            {session.user
                              ? `${session.user.email} · ${session.user.role.toLowerCase()}`
                              : `${session.guestEmail ?? "Anonymous visitor"} · guest`}
                          </small>
                        </div>
                        <Status value={session.status} />
                      </header>
                      <div className="admin-chat-thread">
                        {session.messages.map((entry) => (
                          <div
                            className={`admin-chat-message ${entry.role}`}
                            key={entry.id}
                          >
                            <small>
                              {entry.role === "admin"
                                ? "Admin"
                                : entry.role === "assistant"
                                  ? "AI assistant"
                                  : chatDisplayName(session)}
                            </small>
                            <p>{entry.body}</p>
                          </div>
                        ))}
                      </div>
                      <form
                        className="admin-chat-composer"
                        onSubmit={sendAdminChat}
                      >
                        <textarea
                          value={chatReply}
                          onChange={(event) => setChatReply(event.target.value)}
                          placeholder={`Reply to ${chatDisplayName(session)}…`}
                          rows={3}
                        />
                        <button
                          disabled={busy === session.id || !chatReply.trim()}
                        >
                          <Send size={15} />{" "}
                          {busy === session.id ? "Sending…" : "Send reply"}
                        </button>
                      </form>
                    </article>
                  ))}
              </>
            ) : (
              <EmptyState label="No support conversations yet." />
            )}
          </section>
        )}
        {tab === "categories" && (
          <section className="admin-category-workspace">
            {canManageCatalog ? (
              <form
                className="admin-category-creator"
                onSubmit={createCategory}
              >
                <header>
                  <span>
                    <FolderPlus />
                  </span>
                  <div>
                    <h2>Create category or subcategory</h2>
                    <p>
                      New entries instantly flow into homepage browsing and the
                      seller product form.
                    </p>
                  </div>
                </header>
                <div className="form-grid two">
                  <label>
                    <span>Name</span>
                    <input
                      required
                      minLength={2}
                      value={categoryForm.name}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: event.target.value,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                        })
                      }
                      placeholder="Facebook services"
                    />
                  </label>
                  <label>
                    <span>URL slug</span>
                    <input
                      value={categoryForm.slug}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        })
                      }
                      placeholder="facebook-services"
                    />
                  </label>
                  <label>
                    <span>Parent category</span>
                    <select
                      value={categoryForm.parentId}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          parentId: event.target.value,
                        })
                      }
                    >
                      <option value="">Create as main category</option>
                      {availableCategoryParents.map((category) => (
                        <option value={category.id} key={category.id}>
                          {categoryPath(category, categories)}
                        </option>
                      ))}
                    </select>
                    <small>
                      Supports three levels: category → platform → listing type.
                    </small>
                  </label>
                  <label>
                    <span>Sort order</span>
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      value={categoryForm.sortOrder}
                      onChange={(event) =>
                        setCategoryForm({
                          ...categoryForm,
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  <span>Description</span>
                  <textarea
                    required
                    minLength={12}
                    rows={4}
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: event.target.value,
                      })
                    }
                    placeholder="Explain what buyers will find in this category."
                  />
                </label>
                <button className="primary-button" disabled={categoryCreating}>
                  <FolderPlus size={16} />{" "}
                  {categoryCreating ? "Creating…" : "Create category"}
                </button>
              </form>
            ) : (
              <div className="admin-category-creator admin-readonly-card">
                <FolderPlus />
                <h2>Category catalog</h2>
                <p>
                  You can review the structure. An administrator account is
                  required to create or change categories.
                </p>
              </div>
            )}
            <div className="admin-category-tree">
              {categories
                .filter((category) => !category.parentId)
                .map((parent) => (
                  <article
                    key={parent.id}
                    className={!parent.isActive ? "disabled" : ""}
                  >
                    <header>
                      <div>
                        <span>{parent.name.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <strong>{parent.name}</strong>
                          <small>/{parent.slug}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canManageCatalog}
                        onClick={() => void toggleCategory(parent)}
                      >
                        {parent.isActive ? "Visible" : "Hidden"}
                      </button>
                    </header>
                    <p>{parent.description}</p>
                    <div>
                      {categories
                        .filter((child) => child.parentId === parent.id)
                        .map((child) => (
                          <section
                            className="admin-category-branch"
                            key={child.id}
                          >
                            <button
                              type="button"
                              disabled={!canManageCatalog}
                              className={!child.isActive ? "disabled" : ""}
                              onClick={() => void toggleCategory(child)}
                            >
                              <span>{child.name}</span>
                              <small>
                                {child.isActive ? "Live" : "Hidden"}
                              </small>
                            </button>
                            <div>
                              {categories
                                .filter((leaf) => leaf.parentId === child.id)
                                .map((leaf) => (
                                  <button
                                    type="button"
                                    disabled={!canManageCatalog}
                                    key={leaf.id}
                                    className={`category-leaf ${!leaf.isActive ? "disabled" : ""}`}
                                    onClick={() => void toggleCategory(leaf)}
                                  >
                                    <span>{leaf.name}</span>
                                    <small>
                                      {leaf.isActive ? "Live" : "Hidden"}
                                    </small>
                                  </button>
                                ))}
                            </div>
                          </section>
                        ))}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        {tab === "coupons" && (
          <SimpleRows
            rows={coupons.map((coupon) => ({
              id: coupon.id,
              title: coupon.code,
              meta: coupon.percentOff
                ? `${coupon.percentOff}% off`
                : `${money(coupon.amountOffCents ?? 0)} off`,
              status: coupon.isActive ? "ACTIVE" : "INACTIVE",
            }))}
          />
        )}
        {tab === "reports" && (
          <SimpleRows
            rows={reports.map((report) => ({
              id: report.id,
              title: `${report.product.name} · ${report.reason}`,
              meta: `${report.reporter.email} · ${report.details ?? "No details"}`,
              status: report.status,
              actions: (
                <>
                  <button
                    disabled={busy === report.id}
                    onClick={() =>
                      void act(report.id, `/api/admin/reports/${report.id}`, {
                        status: "ACTIONED",
                        adminNotes:
                          window.prompt("Admin note") || "Reviewed by admin.",
                        removeProduct: false,
                      })
                    }
                  >
                    Mark actioned
                  </button>
                  <button
                    className="danger"
                    disabled={busy === report.id}
                    onClick={() =>
                      void act(report.id, `/api/admin/reports/${report.id}`, {
                        status: "ACTIONED",
                        adminNotes:
                          window.prompt("Removal note") ||
                          "Removed after report.",
                        removeProduct: true,
                      })
                    }
                  >
                    Remove product
                  </button>
                </>
              ),
            }))}
          />
        )}
        {tab === "homepage" && (
          <SimpleRows
            rows={homepageSections.map((section) => ({
              id: section.id,
              title: section.title,
              meta: `${section.key} · ${section.subtitle ?? "No subtitle"}`,
              status: section.isVisible ? "VISIBLE" : "HIDDEN",
            }))}
          />
        )}
      </section>

      {productCreatorOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-product-dialog-title"
        >
          <form
            className="seller-product-form admin-product-form"
            onSubmit={createAdminProduct}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close product creator"
              onClick={() => setProductCreatorOpen(false)}
            >
              ×
            </button>
            <span className="section-index">OFFICIAL CATALOG</span>
            <h2 id="admin-product-dialog-title">
              Add an Official marketplace product
            </h2>
            <p className="modal-helper">
              Use the same complete listing flow as a seller. Official products
              publish under the verified store name you choose and carry the
              Official badge.
            </p>
            <div className="seller-flow-steps admin-official-flow-steps">
              <span
                className={
                  adminProductForm.categoryPathIds[0] ? "done" : "active"
                }
              >
                <b>1</b>Category
              </span>
              <span
                className={adminProductForm.categoryPathIds[0] ? "active" : ""}
              >
                <b>2</b>Platform & type
              </span>
              <span className={adminSelectedCategoryId ? "active" : ""}>
                <b>3</b>Official listing
              </span>
            </div>
            <label className="admin-product-image-picker">
              {adminCoverPreview ? (
                <img src={adminCoverPreview} alt="Selected product preview" />
              ) : (
                <ImagePlus size={34} aria-hidden="true" />
              )}
              <span>Product image *</span>
              <input
                required
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setAdminCoverImage(event.target.files?.[0] ?? null)
                }
              />
              <small>JPEG, PNG or WebP · max 8 MB</small>
            </label>
            <section className="seller-category-flow">
              <header>
                <BadgeCheck aria-hidden="true" />
                <div>
                  <strong>Official catalog path</strong>
                  <small>
                    {adminSelectedPath.length
                      ? adminSelectedPath
                          .map((category) => category.name)
                          .join(" → ")
                      : "Choose where the Official product belongs"}
                  </small>
                </div>
              </header>
              <div className="form-grid three">
                {adminCategoryLevels.map((choices, depth) => (
                  <label
                    key={`${depth}-${adminProductForm.categoryPathIds[depth - 1] ?? "root"}`}
                  >
                    <span>
                      {depth + 1}.{" "}
                      {adminIsSocialAccountListing
                        ? depth === 0
                          ? "Marketplace category"
                          : depth === 1
                            ? "Platform"
                            : depth === 2
                              ? "Product"
                              : depth === 3
                                ? "Account type"
                                : `Level ${depth + 1}`
                        : depth === 0
                          ? "Main category"
                          : depth === 1
                            ? "Subcategory / platform"
                            : depth === 2
                              ? "Product / listing type"
                              : `Level ${depth + 1}`}
                    </span>
                    <select
                      required
                      value={adminProductForm.categoryPathIds[depth] ?? ""}
                      onChange={(event) =>
                        setAdminProductForm({
                          ...adminProductForm,
                          categoryPathIds: [
                            ...adminProductForm.categoryPathIds.slice(0, depth),
                            event.target.value,
                          ].filter(Boolean),
                          productAttributes:
                            depth === 0
                              ? {}
                              : adminProductForm.productAttributes,
                        })
                      }
                    >
                      <option value="">
                        Choose {depth === 0 ? "category" : "option"}
                      </option>
                      {choices.map((category) => (
                        <option value={category.id} key={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>
            {adminIsSocialAccountListing &&
            adminSocialPlatform &&
            adminSocialAccountType &&
            !adminCategoryLevels[adminProductForm.categoryPathIds.length]
              ?.length ? (
              <section className="seller-derived-account-summary">
                <div>
                  <BadgeCheck aria-hidden="true" />
                  <span>
                    <strong>Official account details confirmed</strong>
                    <small>
                      Platform and account type come from the selected path.
                    </small>
                  </span>
                </div>
                <p>
                  <span>Platform</span>
                  <b>{adminSocialPlatform}</b>
                  <span>Product</span>
                  <b>Account</b>
                  <span>Account type</span>
                  <b>{adminSocialAccountType}</b>
                </p>
              </section>
            ) : null}
            {adminDynamicAttributes.length ? (
              <section className="seller-auto-attributes">
                <header>
                  <Zap aria-hidden="true" />
                  <div>
                    <strong>Category-specific product details</strong>
                    <small>
                      Complete the official platform fields for this department.
                    </small>
                  </div>
                </header>
                <div className="form-grid three">
                  {adminDynamicAttributes.map((attribute) => (
                    <label key={attribute.key}>
                      <span>
                        {attribute.label}
                        {attribute.optional ? " (optional)" : ""}
                      </span>
                      <select
                        required={!attribute.optional}
                        value={
                          adminProductForm.productAttributes[attribute.key] ??
                          ""
                        }
                        onChange={(event) =>
                          setAdminProductForm({
                            ...adminProductForm,
                            productAttributes: {
                              ...adminProductForm.productAttributes,
                              [attribute.key]: event.target.value,
                            },
                          })
                        }
                      >
                        <option value="">
                          Choose {attribute.label.toLowerCase()}
                        </option>
                        {attribute.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </section>
            ) : null}
            {adminSelectedCategoryId ? (
              <section className="admin-existing-category-products">
                <header>
                  <strong>Already added in this category</strong>
                  <span>{selectedCategoryProducts.length} products</span>
                </header>
                {selectedCategoryProducts.length ? (
                  <div>
                    {selectedCategoryProducts.slice(0, 8).map((product) => (
                      <article key={product.id}>
                        <span>{product.name}</span>
                        <small>
                          {product.isOfficial ? "Official" : "Seller"} ·{" "}
                          {product.status.toLowerCase()}
                        </small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    No products have been added to this selected category yet.
                  </p>
                )}
              </section>
            ) : null}
            <label className="admin-official-store-field">
              <span>
                <Store aria-hidden="true" />
                Official store name
              </span>
              <input
                required
                minLength={2}
                maxLength={120}
                value={adminProductForm.officialStoreName}
                onChange={(event) =>
                  setAdminProductForm({
                    ...adminProductForm,
                    officialStoreName: event.target.value,
                  })
                }
                placeholder="Ysello Official"
              />
              <small>
                Buyers will see this verified store name on product cards and
                product details.
              </small>
            </label>
            <div className="form-grid two">
              <label>
                <span>Product title</span>
                <input
                  required
                  minLength={3}
                  value={adminProductForm.name}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Product type</span>
                <select
                  value={adminProductForm.type}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      type: event.target.value,
                    })
                  }
                >
                  <option value="SERVICE">Service</option>
                  <option value="DOWNLOAD">Digital download</option>
                </select>
              </label>
              <label>
                <span>Price USD</span>
                <input
                  required
                  type="number"
                  min="0.50"
                  step="0.01"
                  value={adminProductForm.priceUsd}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      priceUsd: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Price CNY</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adminProductForm.priceCny}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      priceCny: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Price RUB</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={adminProductForm.priceRub}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      priceRub: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>After-sales hours</span>
                <input
                  required
                  type="number"
                  min={12}
                  max={8760}
                  value={adminProductForm.afterSalesServiceHours}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      afterSalesServiceHours: Number(event.target.value),
                    })
                  }
                />
              </label>
            </div>
            <label>
              <span>Short description</span>
              <input
                required
                minLength={10}
                maxLength={240}
                value={adminProductForm.shortDescription}
                onChange={(event) =>
                  setAdminProductForm({
                    ...adminProductForm,
                    shortDescription: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>Full description</span>
              <textarea
                required
                minLength={30}
                rows={5}
                value={adminProductForm.description}
                onChange={(event) =>
                  setAdminProductForm({
                    ...adminProductForm,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <section className="admin-official-details">
              <header>
                <BadgeCheck aria-hidden="true" />
                <div>
                  <strong>Official product specifications</strong>
                  <small>
                    These details appear in search, filters, and the product
                    page.
                  </small>
                </div>
              </header>
              <div className="form-grid three">
                <label>
                  <span>Brand</span>
                  <input
                    value={adminProductForm.brand}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        brand: event.target.value,
                      })
                    }
                    placeholder="Official brand or publisher"
                  />
                </label>
                {!adminIsSocialAccountListing ? (
                  <label>
                    <span>Platform</span>
                    <input
                      value={adminProductForm.platform}
                      onChange={(event) =>
                        setAdminProductForm({
                          ...adminProductForm,
                          platform: event.target.value,
                        })
                      }
                      placeholder="Windows, Instagram, Web…"
                    />
                  </label>
                ) : null}
                <label>
                  <span>Region</span>
                  <input
                    value={adminProductForm.region}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        region: event.target.value,
                      })
                    }
                    placeholder="Global"
                  />
                </label>
                <label>
                  <span>Country</span>
                  <input
                    value={adminProductForm.country}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        country: event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
                <label>
                  <span>Server</span>
                  <input
                    value={adminProductForm.server}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        server: event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
                <label>
                  <span>Language</span>
                  <input
                    value={adminProductForm.language}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        language: event.target.value,
                      })
                    }
                  />
                </label>
                {!adminIsSocialAccountListing ? (
                  <label>
                    <span>Product kind</span>
                    <input
                      value={adminProductForm.productKind}
                      onChange={(event) =>
                        setAdminProductForm({
                          ...adminProductForm,
                          productKind: event.target.value,
                        })
                      }
                      placeholder="Account, key, download, service…"
                    />
                  </label>
                ) : null}
                <label>
                  <span>Condition</span>
                  <input
                    value={adminResolvedCondition}
                    disabled={adminIsSocialAccountListing}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        condition: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>Delivery method</span>
                  <select
                    value={adminProductForm.deliveryMethod}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        deliveryMethod: event.target.value,
                      })
                    }
                  >
                    <option>Protected order delivery</option>
                    <option>Instant download</option>
                    <option>Seller service</option>
                  </select>
                </label>
                <label>
                  <span>Stock type</span>
                  <select
                    value={adminProductForm.stockType}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        stockType: event.target.value,
                      })
                    }
                  >
                    <option>Single</option>
                    <option>Shared</option>
                    <option>Unlimited service</option>
                  </select>
                </label>
                <label>
                  <span>Stock quantity</span>
                  <input
                    type="number"
                    min={0}
                    value={adminProductForm.stockQuantity}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        stockQuantity: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Minimum order</span>
                  <input
                    type="number"
                    min={1}
                    value={adminProductForm.minimumOrder}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        minimumOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Maximum order</span>
                  <input
                    type="number"
                    min={1}
                    value={adminProductForm.maximumOrder}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        maximumOrder: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>SKU</span>
                  <input
                    value={adminProductForm.sku}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        sku: event.target.value,
                      })
                    }
                    placeholder="OFFICIAL-001"
                  />
                </label>
                <label>
                  <span>Tags</span>
                  <input
                    value={adminProductForm.tags}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        tags: event.target.value,
                      })
                    }
                    placeholder="premium, instant, verified"
                  />
                </label>
                <label>
                  <span>Duration</span>
                  <input
                    value={adminProductForm.duration}
                    onChange={(event) =>
                      setAdminProductForm({
                        ...adminProductForm,
                        duration: event.target.value,
                      })
                    }
                    placeholder="12 months, lifetime…"
                  />
                </label>
              </div>
            </section>
            <label>
              <span>Delivery note</span>
              <textarea
                rows={3}
                value={adminProductForm.deliveryNote}
                onChange={(event) =>
                  setAdminProductForm({
                    ...adminProductForm,
                    deliveryNote: event.target.value,
                  })
                }
              />
            </label>
            {adminProductForm.type === "DOWNLOAD" ? (
              <label>
                <span>Inventory rows</span>
                <textarea
                  rows={5}
                  placeholder="One deliverable per line. Required to publish a download immediately."
                  value={adminProductForm.inventoryLines}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      inventoryLines: event.target.value,
                    })
                  }
                />
              </label>
            ) : null}
            <div className="form-grid two">
              <label>
                <span>Warranty</span>
                <textarea
                  rows={3}
                  value={adminProductForm.warranty}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      warranty: event.target.value,
                    })
                  }
                  placeholder="Official replacement or support terms"
                />
              </label>
              <label>
                <span>Refund policy</span>
                <textarea
                  rows={3}
                  value={adminProductForm.refundPolicy}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      refundPolicy: event.target.value,
                    })
                  }
                  placeholder="Eligibility and timing"
                />
              </label>
            </div>
            <div className="admin-official-delivery-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={adminProductForm.instantDelivery}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      instantDelivery: event.target.checked,
                    })
                  }
                />
                <span>Instant delivery</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={adminProductForm.manualDelivery}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      manualDelivery: event.target.checked,
                    })
                  }
                />
                <span>Protected manual delivery</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={adminProductForm.digitalDownload}
                  onChange={(event) =>
                    setAdminProductForm({
                      ...adminProductForm,
                      digitalDownload: event.target.checked,
                    })
                  }
                />
                <span>Digital download</span>
              </label>
            </div>
            <label className="admin-publish-toggle">
              <input
                type="checkbox"
                checked={adminProductForm.publish}
                onChange={(event) =>
                  setAdminProductForm({
                    ...adminProductForm,
                    publish: event.target.checked,
                  })
                }
              />
              <span>Publish to the catalog immediately</span>
            </label>
            <button className="primary-button" disabled={productCreating}>
              <PackagePlus size={16} />{" "}
              {productCreating ? "Creating…" : "Create catalog product"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function OverviewPanel({
  overview,
  onOpen,
}: {
  overview: Overview | null;
  onOpen: (tab: Tab) => void;
}) {
  const moneyCards = [
    {
      label: "Total revenue",
      value: money(overview?.totalRevenueCents),
      icon: CircleDollarSign,
      tone: "blue",
      detail: "Lifetime paid volume",
    },
    {
      label: "Today's revenue",
      value: money(overview?.todayRevenueCents),
      icon: TrendingUp,
      tone: "green",
      detail: `${overview?.ordersToday ?? 0} orders today`,
    },
    {
      label: "Monthly revenue",
      value: money(overview?.monthlyRevenueCents),
      icon: BarChart3,
      tone: "purple",
      detail: `${overview?.ordersThisMonth ?? 0} orders this month`,
    },
    {
      label: "Marketplace commission",
      value: money(overview?.marketplaceCommissionCents),
      icon: Landmark,
      tone: "amber",
      detail: "Platform earnings",
    },
  ];
  const operationCards: Array<{
    label: string;
    value: number;
    detail: string;
    icon: LucideIcon;
    tab: Tab;
    tone: string;
  }> = [
    {
      label: "Total users",
      value: overview?.users ?? 0,
      detail: `${overview?.verifiedUsers ?? 0} verified`,
      icon: Users,
      tab: "users",
      tone: "blue",
    },
    {
      label: "Active sellers",
      value: overview?.activeSellers ?? 0,
      detail: `${overview?.pendingSellers ?? 0} awaiting approval`,
      icon: Store,
      tab: "sellers",
      tone: "green",
    },
    {
      label: "Products",
      value: overview?.totalProducts ?? 0,
      detail: `${overview?.pendingProducts ?? 0} pending moderation`,
      icon: Boxes,
      tab: "products",
      tone: "purple",
    },
    {
      label: "Completed orders",
      value: overview?.completedOrders ?? 0,
      detail: `${overview?.pendingOrders ?? 0} currently active`,
      icon: PackageCheck,
      tab: "orders",
      tone: "green",
    },
    {
      label: "Deposit queue",
      value: overview?.pendingDeposits ?? 0,
      detail: "Proof awaiting review",
      icon: WalletCards,
      tab: "deposits",
      tone: "blue",
    },
    {
      label: "Withdrawals",
      value: overview?.pendingWithdrawals ?? 0,
      detail: `${money(overview?.frozenBalanceCents)} frozen`,
      icon: Landmark,
      tab: "withdrawals",
      tone: "amber",
    },
    {
      label: "Refunds & disputes",
      value: (overview?.refundRequests ?? 0) + (overview?.openDisputes ?? 0),
      detail: "Resolution queue",
      icon: Gavel,
      tab: "disputes",
      tone: "red",
    },
    {
      label: "Support tickets",
      value: overview?.openTickets ?? 0,
      detail: "Open customer cases",
      icon: Headphones,
      tab: "tickets",
      tone: "purple",
    },
  ];
  const series = overview?.revenueSeries ?? [];
  const maxSeries = Math.max(1, ...series.map((point) => point.value));
  const storageMb = ((overview?.publicStorageBytes ?? 0) / 1024 / 1024).toFixed(
    1,
  );

  return (
    <div className="admin-overview-enterprise">
      <section className="admin-market-health-hero">
        <div>
          <span>
            <Activity /> OPERATIONAL OVERVIEW
          </span>
          <h2>Start with the queues that need a decision.</h2>
          <p>
            This view summarizes current marketplace records. Infrastructure
            health remains unknown until a monitoring provider is connected.
          </p>
          <div>
            <button type="button" onClick={() => onOpen("deposits")}>
              <WalletCards /> Review payment proofs
            </button>
            <button type="button" onClick={() => onOpen("tickets")}>
              <Headphones /> Open support center
            </button>
          </div>
        </div>
        <aside>
          <span>Items requiring review</span>
          <strong>
            {(overview?.pendingSellers ?? 0) +
              (overview?.pendingProducts ?? 0) +
              (overview?.openTickets ?? 0) +
              (overview?.openDisputes ?? 0)}
          </strong>
          <small>
            <i /> Based on available marketplace records
          </small>
        </aside>
      </section>

      <section className="admin-finance-metrics">
        {moneyCards.map(({ label, value, icon: Icon, tone, detail }) => (
          <article className={tone} key={label}>
            <header>
              <span>
                <Icon />
              </span>
              <small>RECORDED</small>
            </header>
            <p>{label}</p>
            <strong>{value}</strong>
            <footer>
              <TrendingUp /> {detail}
            </footer>
          </article>
        ))}
      </section>

      <section className="admin-overview-layout">
        <article className="admin-revenue-chart">
          <header>
            <div>
              <span>ANALYTICS</span>
              <h2>Revenue performance</h2>
              <p>Paid marketplace volume over the last seven days.</p>
            </div>
            <div>
              <button className="active">Weekly</button>
              <button>Monthly</button>
              <button>Yearly</button>
            </div>
          </header>
          <div className="admin-chart-total">
            <strong>
              {money(series.reduce((sum, point) => sum + point.value, 0))}
            </strong>
            <span>
              <TrendingUp /> Current seven-day revenue
            </span>
          </div>
          <div className="admin-css-revenue-chart">
            {series.map((point) => (
              <span key={point.label}>
                <i
                  style={{
                    height: `${Math.max(8, (point.value / maxSeries) * 100)}%`,
                  }}
                >
                  <b>{point.value ? money(point.value) : "$0"}</b>
                </i>
                <small>{point.label}</small>
              </span>
            ))}
          </div>
        </article>
        <article className="admin-health-panel">
          <header>
            <span>MONITORING READINESS</span>
            <h2>Infrastructure signals</h2>
          </header>
          <div>
            <span>
              <Server />
            </span>
            <div>
              <strong>API & delivery</strong>
              <small>No health provider connected</small>
            </div>
            <b>Unknown</b>
          </div>
          <div>
            <span>
              <Database />
            </span>
            <div>
              <strong>Marketplace database</strong>
              <small>No latency or uptime feed</small>
            </div>
            <b>Unknown</b>
          </div>
          <div>
            <span>
              <HardDrive />
            </span>
            <div>
              <strong>Public media storage</strong>
              <small>{storageMb} MB recorded usage</small>
            </div>
            <b>Usage only</b>
          </div>
          <div>
            <span>
              <ShieldCheck />
            </span>
            <div>
              <strong>Security controls</strong>
              <small>Review permissions and audit coverage</small>
            </div>
            <b>Review</b>
          </div>
        </article>
      </section>

      <section className="admin-operations-metrics">
        {operationCards.map(
          ({ label, value, detail, icon: Icon, tab, tone }) => (
            <button
              type="button"
              className={tone}
              key={label}
              onClick={() => onOpen(tab)}
            >
              <span>
                <Icon />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
                <p>{detail}</p>
              </div>
              <ChevronRight />
            </button>
          ),
        )}
      </section>

      <section className="admin-overview-bottom">
        <article>
          <header>
            <div>
              <span>CURRENT QUEUES</span>
              <h2>Priority workflow</h2>
            </div>
            <button type="button" onClick={() => onOpen("orders")}>
              View operations <ArrowLeft />
            </button>
          </header>
          <div className="admin-activity-feed">
            <button type="button" onClick={() => onOpen("sellers")}>
              <span className="purple">
                <Store />
              </span>
              <div>
                <strong>Seller verification queue</strong>
                <small>
                  {overview?.pendingSellers ?? 0} applications require document
                  review
                </small>
              </div>
              <b>Review</b>
            </button>
            <button type="button" onClick={() => onOpen("products")}>
              <span className="blue">
                <Boxes />
              </span>
              <div>
                <strong>Product moderation</strong>
                <small>
                  {overview?.pendingProducts ?? 0} listings are waiting for
                  approval
                </small>
              </div>
              <b>Review</b>
            </button>
            <button type="button" onClick={() => onOpen("refunds")}>
              <span className="amber">
                <RefreshCw />
              </span>
              <div>
                <strong>Customer resolutions</strong>
                <small>
                  {overview?.refundRequests ?? 0} refund requests need attention
                </small>
              </div>
              <b>Resolve</b>
            </button>
            <button type="button" onClick={() => onOpen("tickets")}>
              <span className="green">
                <Headphones />
              </span>
              <div>
                <strong>Support response queue</strong>
                <small>
                  {overview?.openTickets ?? 0} conversations remain open
                </small>
              </div>
              <b>Reply</b>
            </button>
          </div>
        </article>
        <aside>
          <span>QUICK ACTIONS</span>
          <h2>Move work forward</h2>
          <button type="button" onClick={() => onOpen("payments")}>
            <BadgeCheck /> Approve order payment <ChevronRight />
          </button>
          <button type="button" onClick={() => onOpen("deposits")}>
            <WalletCards /> Verify buyer top-up <ChevronRight />
          </button>
          <button type="button" onClick={() => onOpen("categories")}>
            <FolderPlus /> Manage categories <ChevronRight />
          </button>
          <button type="button" onClick={() => onOpen("reports")}>
            <ShieldAlert /> Review safety reports <ChevronRight />
          </button>
          <footer>
            <Zap /> Counts reflect the latest successful refresh
          </footer>
        </aside>
      </section>
    </div>
  );
}

function AdminOverviewSkeleton() {
  return (
    <div
      className="admin-overview-skeleton"
      aria-label="Loading executive dashboard"
    >
      <i className="hero" />
      <section>
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} />
        ))}
      </section>
      <div>
        <i />
        <i />
      </div>
    </div>
  );
}

function OrdersTable({
  orders,
  busy,
  approve,
  emptyLabel = "No orders found.",
}: {
  orders: Order[];
  busy: string;
  approve: (order: Order) => Promise<void>;
  emptyLabel?: string;
}) {
  if (!orders.length) return <EmptyState label={emptyLabel} />;
  return (
    <section className="ops-table">
      <div className="ops-row ops-row-head">
        <span>Order</span>
        <span>Buyer</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {orders.map((order) => (
        <div className="ops-row" key={order.id}>
          <div>
            <strong>{order.orderNumber}</strong>
            <small>
              {order.items.map((item) => item.productName).join(", ")}
            </small>
            <small>{new Date(order.createdAt).toLocaleString()}</small>
          </div>
          <div>
            <strong>
              {order.buyer.firstName} {order.buyer.lastName}
            </strong>
            <small>{order.buyer.email}</small>
          </div>
          <div>
            <Status value={order.status} />
            <small>
              {order.payment?.method?.replaceAll("_", " ") ?? "No payment"} ·{" "}
              {order.payment?.status ?? "—"}
            </small>
          </div>
          <div className="row-actions">
            <a href={`/api/commerce/orders/${order.id}/invoice`}>
              <FileText size={14} /> Invoice
            </a>
            <button
              className="approve"
              disabled={
                busy === order.payment?.id ||
                order.payment?.status !== "REQUIRES_ACTION"
              }
              onClick={() => void approve(order)}
            >
              <BadgeCheck size={14} /> Approve & deliver
            </button>
            <strong>
              {money(order.totalCents)} {order.currency}
            </strong>
          </div>
        </div>
      ))}
    </section>
  );
}

function SimpleRows({
  rows,
}: {
  rows: Array<{
    id: string;
    title: string;
    meta: string;
    status: string;
    actions?: JSX.Element;
  }>;
}) {
  if (!rows.length) return <EmptyState label="Nothing to show yet." />;
  return (
    <section className="ops-table">
      <div className="ops-row ops-row-head">
        <span>Item</span>
        <span>Details</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {rows.map((row) => (
        <div className="ops-row" key={row.id}>
          <div>
            <strong>{row.title}</strong>
          </div>
          <div>
            <small>{row.meta}</small>
          </div>
          <div>
            <Status value={row.status} />
          </div>
          <div className="row-actions">{row.actions ?? <span>—</span>}</div>
        </div>
      ))}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="ops-empty">
      <Boxes size={34} />
      <strong>{label}</strong>
    </div>
  );
}
