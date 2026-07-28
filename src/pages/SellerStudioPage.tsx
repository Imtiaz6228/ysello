import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  FileUp,
  FolderKanban,
  Gift,
  Globe2,
  Grid3X3,
  Home,
  ImageIcon,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  PackagePlus,
  Palette,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  TicketCheck,
  TrendingUp,
  Upload,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ApiError, apiDownloadUrl, apiRequest, mediaUrl } from "../api/client";
import { Seo } from "../components/Seo";
import { LocaleSwitcher } from "../components/LocaleSwitcher";
import { useLocale } from "../i18n/LocaleContext";
import { catalogAttributePresets } from "../data/enterpriseCatalog";
import {
  mergeSellerTaxonomy,
  sellerCategorySelection,
} from "../commerce/sellerTaxonomy";
import {
  SellerProductEditor,
  type SellerEditableProduct,
} from "../components/SellerProductEditor";

type Category = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  backingId?: string | null;
  isTaxonomyOption?: boolean;
  parent?: Category | null;
};

type Product = SellerEditableProduct & { rejectionReason?: string | null };

type SellerProfile = {
  storeName: string;
  slug: string;
  about: string;
  policy?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isVerified: boolean;
  totalSales: number;
  averageRating: number | string;
};

type SellerOrder = {
  id: string;
  productName: string;
  totalCents: number;
  quantity: number;
  deliveredAt?: string | null;
  deliveryMessage?: string | null;
  product?: { type: string };
  inventoryItems?: Array<{
    id: string;
    content: string;
    source: string;
    deliveredAt?: string | null;
  }>;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    buyer: { firstName: string; lastName: string; email: string };
    payment?: { status: string } | null;
    refunds?: Array<{
      id: string;
      status: string;
      amountCents: number;
      reason: string;
      createdAt: string;
    }>;
  };
};

type SellerDispute = {
  id: string;
  status: string;
  subject: string;
  description: string;
  refundDemanded?: boolean;
  awaitingParty?: string | null;
  autoCloseAt?: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string;
    buyer: { firstName: string; lastName: string; email: string };
    items: Array<{
      product: { name: string; slug: string; coverImageUrl?: string | null };
    }>;
  };
};
type SellerReview = {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  sellerResponse?: string | null;
  product: { name: string; slug: string };
  buyer: { firstName: string };
};

type Tab =
  | "overview"
  | "products"
  | "product-groups"
  | "categories"
  | "inventory"
  | "downloads"
  | "drafts"
  | "orders"
  | "processing"
  | "delivered"
  | "refunds"
  | "disputes"
  | "finance"
  | "transactions"
  | "frozen"
  | "earnings"
  | "withdrawals"
  | "messages"
  | "reviews"
  | "tickets"
  | "notifications"
  | "coupons"
  | "promotions"
  | "sponsored"
  | "featured"
  | "analytics"
  | "revenue"
  | "visitors"
  | "conversion"
  | "storefront"
  | "payments"
  | "security"
  | "api"
  | "preferences"
  | "support";
type AnalyticsPeriod = "7d" | "30d" | "year";

const sellerTabs: Array<{ id: Tab; label: string; icon: typeof Store }> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "product-groups", label: "Product groups", icon: FolderKanban },
  { id: "categories", label: "Categories", icon: Grid3X3 },
  { id: "inventory", label: "Inventory", icon: Layers3 },
  { id: "downloads", label: "Uploaded files", icon: Download },
  { id: "drafts", label: "Drafts & review", icon: FileText },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "processing", label: "Processing orders", icon: Clock3 },
  { id: "delivered", label: "Delivered orders", icon: PackageCheck },
  { id: "refunds", label: "Refunds", icon: ArrowDownRight },
  { id: "disputes", label: "Disputes", icon: ShieldCheck },
  { id: "finance", label: "Financial center", icon: WalletCards },
  { id: "transactions", label: "Transactions", icon: FileText },
  { id: "frozen", label: "Frozen funds", icon: LockKeyhole },
  { id: "earnings", label: "Earnings", icon: TrendingUp },
  { id: "withdrawals", label: "Withdrawals", icon: CircleDollarSign },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "reviews", label: "Reviews", icon: BadgeCheck },
  { id: "tickets", label: "Support tickets", icon: TicketCheck },
  { id: "coupons", label: "Coupons", icon: Tag },
  { id: "promotions", label: "Promotions", icon: Gift },
  { id: "sponsored", label: "Sponsored listings", icon: Megaphone },
  { id: "featured", label: "Featured products", icon: Sparkles },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "revenue", label: "Revenue analytics", icon: TrendingUp },
  { id: "visitors", label: "Visitor analytics", icon: Users },
  { id: "conversion", label: "Conversion analytics", icon: ArrowUpRight },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "storefront", label: "Store profile", icon: Store },
  { id: "payments", label: "Payment methods", icon: CreditCard },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "api", label: "API access", icon: KeyRound },
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "support", label: "Seller support", icon: LifeBuoy },
];

const sellerMenuGroups: Array<{
  label: string;
  items: Array<{ label: string; tab: Tab; icon: typeof Store }>;
}> = [
  {
    label: "Workspace",
    items: [{ label: "Dashboard", tab: "overview", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { label: "My products", tab: "products", icon: Boxes },
      { label: "Categories", tab: "categories", icon: Grid3X3 },
      { label: "Inventory & variants", tab: "inventory", icon: Layers3 },
      { label: "Drafts & review", tab: "drafts", icon: FileText },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "All orders", tab: "orders", icon: ShoppingBag },
      { label: "Refunds", tab: "refunds", icon: ArrowDownRight },
      { label: "Disputes", tab: "disputes", icon: ShieldCheck },
    ],
  },
  {
    label: "Finance",
    items: [{ label: "Financial center", tab: "finance", icon: WalletCards }],
  },
  {
    label: "Inbox",
    items: [
      { label: "Buyer messages", tab: "messages", icon: MessageSquare },
      { label: "Reviews", tab: "reviews", icon: BadgeCheck },
      { label: "Support tickets", tab: "tickets", icon: TicketCheck },
      { label: "Notifications", tab: "notifications", icon: Bell },
    ],
  },
  {
    label: "Performance",
    items: [{ label: "Analytics", tab: "analytics", icon: BarChart3 }],
  },
  {
    label: "Store",
    items: [
      { label: "Store profile", tab: "storefront", icon: Store },
      { label: "Security", tab: "security", icon: ShieldCheck },
      { label: "Seller support", tab: "support", icon: LifeBuoy },
    ],
  },
];

type FinanceSummary = {
  availableBalanceCents: number;
  frozenBalanceCents: number;
  releasedSellerEarningsCents: number;
  totalSellerEarningsCents: number;
  totalSellerEarningCount: number;
  withdrawnCents: number;
  todayIncomeCents: number;
  todayOrderCount: number;
};

type Withdrawal = {
  id: string;
  amountCents: number;
  blockchain: string;
  walletAddress: string;
  status: string;
  providerReference?: string | null;
  createdAt: string;
};
type SellerTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority?: string;
  updatedAt: string;
  creator?: { firstName: string; email: string };
  messages?: Array<{ id: string; body: string }>;
};

function MediaPreview({
  src,
  alt,
  fallback,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img src={mediaUrl(src)} alt={alt} onError={() => setFailed(true)} />
  ) : (
    <span className="seller-media-fallback">
      <ImageIcon />
      <b>{fallback}</b>
    </span>
  );
}

const initialForm = {
  categoryPathIds: [] as string[],
  name: "",
  shortDescription: "",
  description: "",
  chineseTitle: "",
  chineseShortDescription: "",
  chineseDescription: "",
  chineseSeoTitle: "",
  chineseSeoDescription: "",
  russianTitle: "",
  russianShortDescription: "",
  russianDescription: "",
  russianSeoTitle: "",
  russianSeoDescription: "",
  type: "DOWNLOAD",
  priceUsd: "",
  priceCny: "",
  priceRub: "",
  deliveryNote: "",
  afterSalesServiceHours: 12,
  downloadLimit: 5,
  downloadExpiryHours: 168,
  buyersGetUpdates: true,
  inventoryLines: "",
  brand: "",
  platform: "",
  region: "",
  country: "",
  server: "",
  language: "English",
  deliveryMethod: "Manual delivery",
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
  salePrice: "",
  wholesalePrice: "",
  discountPercent: 0,
  couponSupport: false,
  instantDelivery: false,
  manualDelivery: true,
  digitalDownload: true,
  productAttributes: {} as Record<string, string>,
};

function cents(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function inventoryRows(value: string) {
  return value
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
}

const sellerExchangeRates = { CNY: 7.24, RUB: 91.5 } as const;

function convertedSellerPrices(usdValue: string) {
  const usd = Number(usdValue);
  if (!Number.isFinite(usd) || usd <= 0) return { priceCny: "", priceRub: "" };
  return {
    priceCny: (usd * sellerExchangeRates.CNY).toFixed(2),
    priceRub: (usd * sellerExchangeRates.RUB).toFixed(2),
  };
}

function showLegacyAdvancedOptions() {
  return false;
}

function validTab(value: string): value is Tab {
  return sellerTabs.some((item) => item.id === value);
}

function errorText(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  const details = error.details as
    | {
        fieldErrors?: Record<string, string[]>;
        formErrors?: string[];
        issues?: Array<{ path?: string; message?: string }>;
      }
    | Array<{ path?: string; message?: string }>
    | undefined;
  if (Array.isArray(details)) {
    const issue = details.find((entry) => entry?.message);
    return issue
      ? `${issue.path ? `${issue.path}: ` : ""}${issue.message}`
      : error.message;
  }
  const fieldMessage = details?.fieldErrors
    ? Object.entries(details.fieldErrors)
        .flatMap(([field, messages]) =>
          messages.map((message) => `${field}: ${message}`),
        )
        .find(Boolean)
    : undefined;
  const issue = details?.issues?.find((entry) => entry.message);
  return (
    fieldMessage ||
    details?.formErrors?.[0] ||
    (issue
      ? `${issue.path ? `${issue.path}: ` : ""}${issue.message}`
      : undefined) ||
    error.message
  );
}

function categoryLabel(
  category?: Product["category"],
  productAttributes?: Record<string, unknown>,
) {
  if (typeof productAttributes?.marketplaceCategoryPath === "string")
    return productAttributes.marketplaceCategoryPath;
  if (!category) return "Uncategorised";
  const names = [
    category.parent?.parent?.name,
    category.parent?.name,
    category.name,
  ].filter(Boolean);
  return names.join(" / ");
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function SellerStudioPage() {
  const { formatMoney } = useLocale();
  const [tab, setTabState] = useState<Tab>(() => {
    const hash = window.location.hash.replace("#", "");
    return validTab(hash) ? hash : "overview";
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [categories, setCategories] = useState<Category[]>(() =>
    mergeSellerTaxonomy([] as Category[]),
  );
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ about: "", policy: "" });
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [busy, setBusy] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [form, setForm] = useState(initialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tickets, setTickets] = useState<SellerTicket[]>([]);
  const [disputes, setDisputes] = useState<SellerDispute[]>([]);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [reviewReply, setReviewReply] = useState<Record<string, string>>({});
  const [dataIssue, setDataIssue] = useState("");
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    blockchain: "USDT TRC20",
    walletAddress: "",
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      Workspace: true,
      Catalog: true,
      Orders: true,
      Finance: true,
      Inbox: true,
      Performance: true,
      Store: true,
    },
  );
  const [mediaUploading, setMediaUploading] = useState("");
  const [deliveryOrder, setDeliveryOrder] = useState<SellerOrder | null>(null);
  const [orderActionId, setOrderActionId] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("7d");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [translatingListing, setTranslatingListing] = useState(false);

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );
  const categoryLevels = useMemo(() => {
    const levels: Category[][] = [];
    let parentId: string | null = null;
    for (let depth = 0; depth < 12; depth += 1) {
      const choices = categories.filter(
        (category) => (category.parentId ?? null) === parentId,
      );
      if (!choices.length) break;
      levels.push(choices);
      const selected = form.categoryPathIds[depth];
      if (!selected || !choices.some((category) => category.id === selected))
        break;
      parentId = selected;
    }
    return levels;
  }, [categories, form.categoryPathIds]);
  const selectedCategoryId =
    form.categoryPathIds[form.categoryPathIds.length - 1] ?? "";
  const selectedCategory = sellerCategorySelection(
    selectedCategoryId,
    categories,
  );
  const selectedPath =
    selectedCategory?.path.map((category) => category.name) ?? [];
  const selectedRoot = categories.find(
    (category) => category.id === form.categoryPathIds[0],
  );
  const dynamicAttributes = selectedRoot?.slug
    ? (catalogAttributePresets[selectedRoot.slug] ?? [])
    : [];
  const pendingProducts = products.filter(
    (product) => product.status === "PENDING",
  ).length;
  const liveProducts = products.filter(
    (product) => product.status === "APPROVED",
  ).length;
  const orderRecords = useMemo(
    () => [
      ...new Map(orders.map((item) => [item.order.id, item.order])).values(),
    ],
    [orders],
  );
  const conversationOrders = useMemo(
    () => [...new Map(orders.map((item) => [item.order.id, item])).values()],
    [orders],
  );
  const grossSales = orders
    .filter(
      (item) =>
        !["AWAITING_PAYMENT", "CANCELLED", "REFUNDED"].includes(
          item.order.status,
        ),
    )
    .reduce((sum, item) => sum + item.totalCents, 0);
  const deliveredOrders = orderRecords.filter((order) =>
    ["COMPLETED", "DELIVERED"].includes(order.status),
  ).length;
  const pendingOrders = orderRecords.filter((order) =>
    ["PAID", "PROCESSING", "DISPUTED"].includes(order.status),
  ).length;
  const uniqueBuyers = new Set(orders.map((item) => item.order.buyer.email))
    .size;
  const averageOrderValue = orderRecords.length
    ? Math.round(grossSales / orderRecords.length)
    : 0;
  const topProductPerformance = useMemo(() => {
    const totals = new Map<string, { revenue: number; units: number }>();
    for (const item of orders.filter(
      (entry) =>
        !["AWAITING_PAYMENT", "CANCELLED", "REFUNDED"].includes(
          entry.order.status,
        ),
    )) {
      const current = totals.get(item.productName) ?? { revenue: 0, units: 0 };
      totals.set(item.productName, {
        revenue: current.revenue + item.totalCents,
        units: current.units + item.quantity,
      });
    }
    return [...totals.entries()]
      .map(([name, totalsForProduct]) => ({
        product: products.find((product) => product.name === name),
        name,
        ...totalsForProduct,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders, products]);
  const filteredProducts = products.filter((product) => {
    const queryMatch =
      !searchQuery ||
      `${product.name} ${categoryLabel(
        product.category,
        product.productAttributes,
      )}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const statusMatch =
      statusFilter === "ALL" || product.status === statusFilter;
    return queryMatch && statusMatch;
  });
  const visibleProducts = filteredProducts.filter(
    (product) =>
      tab !== "drafts" ||
      ["DRAFT", "PENDING", "REJECTED"].includes(product.status),
  );
  const filteredOrders = orders.filter((item) => {
    const queryMatch =
      !searchQuery ||
      `${item.productName} ${item.order.orderNumber} ${item.order.buyer.firstName} ${item.order.buyer.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    if (!queryMatch) return false;
    if (tab === "processing")
      return ["PAID", "PROCESSING", "DISPUTED"].includes(item.order.status);
    if (tab === "delivered")
      return ["DELIVERED", "COMPLETED"].includes(item.order.status);
    if (tab === "refunds")
      return (
        item.order.status === "REFUNDED" || Boolean(item.order.refunds?.length)
      );
    return true;
  });
  const uploadedFiles = products.flatMap((product) =>
    product.files.map((file) => ({ product, file })),
  );
  const revenueChart = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(today);
    let bucketCount = 7;
    let bucketDays = 1;
    let labels: string[] = [];
    if (analyticsPeriod === "7d") {
      start = new Date(today.getTime() - 6 * dayMs);
      labels = Array.from({ length: 7 }, (_, index) =>
        new Date(start.getTime() + index * dayMs).toLocaleDateString(
          undefined,
          { weekday: "short" },
        ),
      );
    } else if (analyticsPeriod === "30d") {
      start = new Date(today.getTime() - 29 * dayMs);
      bucketCount = 10;
      bucketDays = 3;
      labels = Array.from({ length: bucketCount }, (_, index) =>
        new Date(
          start.getTime() + index * bucketDays * dayMs,
        ).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      );
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      bucketCount = 12;
      labels = Array.from({ length: 12 }, (_, index) =>
        new Date(
          start.getFullYear(),
          start.getMonth() + index,
          1,
        ).toLocaleDateString(undefined, { month: "short" }),
      );
    }
    const values = Array.from({ length: bucketCount }, () => 0);
    const periodOrders = orders.filter((item) => {
      const created = new Date(item.order.createdAt);
      if (created < start) return false;
      const index =
        analyticsPeriod === "year"
          ? (created.getFullYear() - start.getFullYear()) * 12 +
            created.getMonth() -
            start.getMonth()
          : Math.floor(
              (created.getTime() - start.getTime()) / (bucketDays * dayMs),
            );
      if (index >= 0 && index < values.length) values[index] += item.totalCents;
      return index >= 0 && index < values.length;
    });
    const maximum = Math.max(1, ...values);
    return {
      labels,
      values,
      heights: values.map((value) =>
        value ? Math.max(8, Math.round((value / maximum) * 100)) : 3,
      ),
      revenue: periodOrders.reduce((sum, item) => sum + item.totalCents, 0),
      orders: new Set(periodOrders.map((item) => item.order.id)).size,
    };
  }, [analyticsPeriod, orders]);

  function showMessage(
    text: string,
    type: "success" | "error" | "info" = "info",
  ) {
    setMessage(text);
    setMessageType(type);
  }

  function selectTab(next: Tab) {
    setTabState(next);
    setDrawerOpen(false);
    setSearchQuery("");
    setStatusFilter("ALL");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}#${next}`,
    );
  }

  useEffect(() => {
    const syncTab = () => {
      const hash = window.location.hash.replace("#", "");
      if (validTab(hash)) setTabState(hash);
    };
    window.addEventListener("hashchange", syncTab);
    return () => window.removeEventListener("hashchange", syncTab);
  }, []);

  const load = useCallback(async () => {
    setDataIssue("");
    const tasks = [
      apiRequest<{ products: Product[] }>("/api/seller/products").then((data) =>
        setProducts(data.products),
      ),
      apiRequest<{ categories: Category[] }>("/api/seller/categories").then(
        (data) => {
          const mergedCategories = mergeSellerTaxonomy(data.categories);
          setCategories(mergedCategories);
          setForm((current) => {
            if (current.categoryPathIds.length) return current;
            const firstRoot = mergedCategories.find(
              (category) => !category.parentId,
            );
            return firstRoot
              ? { ...current, categoryPathIds: [firstRoot.id] }
              : current;
          });
        },
      ),
      apiRequest<{ profile: SellerProfile }>("/api/seller/profile").then(
        (data) => {
          setProfile(data.profile);
          setProfileForm({
            about: data.profile?.about ?? "",
            policy: data.profile?.policy ?? "",
          });
        },
      ),
      apiRequest<{ items: SellerOrder[] }>("/api/seller/orders").then((data) =>
        setOrders(data.items),
      ),
      apiRequest<{ summary: FinanceSummary }>("/api/seller/finance").then(
        (data) => setFinance(data.summary),
      ),
      apiRequest<{ withdrawals: Withdrawal[] }>("/api/wallet/withdrawals").then(
        (data) => setWithdrawals(data.withdrawals),
      ),
      apiRequest<{ tickets: SellerTicket[] }>("/api/seller/tickets").then(
        (data) => setTickets(data.tickets),
      ),
      apiRequest<{ disputes: SellerDispute[] }>("/api/seller/disputes").then(
        (data) => setDisputes(data.disputes),
      ),
      apiRequest<{ reviews: SellerReview[] }>("/api/seller/reviews").then(
        (data) => setReviews(data.reviews),
      ),
    ];
    const results = await Promise.allSettled(tasks);
    const failures = results.filter(
      (result) => result.status === "rejected",
    ).length;
    if (failures) {
      setDataIssue(
        failures === results.length
          ? "Seller data could not be loaded."
          : "Some seller sections could not be refreshed.",
      );
      if (failures === results.length)
        throw (results[0] as PromiseRejectedResult).reason;
    }
  }, []);

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await load();
      showMessage("Seller Center is up to date.", "success");
    } catch (error) {
      showMessage(
        errorText(error, "Seller data could not be refreshed."),
        "error",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function markOrderDelivered(item: SellerOrder) {
    const deliveryMessage = window.prompt(
      "Add the delivery note the buyer will see:",
      "Your service order is complete. Please review the delivered work in this protected order workspace.",
    );
    if (!deliveryMessage) return;
    if (deliveryMessage.trim().length < 10) {
      showMessage("The delivery note must be at least 10 characters.", "error");
      return;
    }

    setOrderActionId(item.order.id);
    try {
      const result = await apiRequest<{
        message: string;
        status: string;
      }>(`/api/seller/orders/${item.order.id}/deliver`, {
        method: "POST",
        body: { message: deliveryMessage.trim() },
      });
      await load();
      showMessage(
        result.status === "DELIVERED"
          ? "Delivery recorded. The buyer can now see the completed order."
          : result.message,
        "success",
      );
    } catch (error) {
      showMessage(
        errorText(error, "The service delivery could not be recorded."),
        "error",
      );
    } finally {
      setOrderActionId("");
    }
  }

  useEffect(() => {
    void load().catch((error) =>
      showMessage(
        errorText(error, "Seller data could not be loaded."),
        "error",
      ),
    );
  }, [load]);

  useEffect(() => {
    if (!coverImage) {
      setCoverPreview("");
      return;
    }
    const url = URL.createObjectURL(coverImage);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverImage]);

  function chooseImage(file?: File) {
    if (!file) {
      setCoverImage(null);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showMessage("Image must be 8 MB or smaller.", "error");
      return;
    }
    setCoverImage(file);
  }

  async function importInventoryFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showMessage("Inventory file must be 5 MB or smaller.", "error");
      return;
    }
    try {
      const text = await file.text();
      const imported = inventoryRows(text.replace(/^\uFEFF/, ""));
      if (!imported.length) {
        showMessage(
          "The selected file does not contain inventory rows.",
          "error",
        );
        return;
      }
      setForm((current) => {
        const merged = [...inventoryRows(current.inventoryLines), ...imported];
        return { ...current, inventoryLines: [...new Set(merged)].join("\n") };
      });
      showMessage(
        `${imported.length} inventory row${imported.length === 1 ? "" : "s"} imported.`,
        "success",
      );
    } catch {
      showMessage("The inventory file could not be read.", "error");
    }
  }

  async function translateListing() {
    if (
      !form.name.trim() ||
      !form.shortDescription.trim() ||
      !form.description.trim()
    ) {
      showMessage(
        "Add the English title, short description, and full description first.",
        "error",
      );
      return;
    }
    setTranslatingListing(true);
    try {
      const seoTitle = `Buy ${form.name.trim()} on Ysello`;
      const seoDescription = form.shortDescription.trim();
      const result = await apiRequest<{
        chinese: Record<string, string>;
        russian: Record<string, string>;
      }>("/api/seller/translate-listing", {
        method: "POST",
        body: {
          title: form.name.trim(),
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          seoTitle,
          seoDescription,
        },
      });
      setForm((current) => ({
        ...current,
        chineseTitle: result.chinese.title,
        chineseShortDescription: result.chinese.shortDescription,
        chineseDescription: result.chinese.description,
        chineseSeoTitle: result.chinese.seoTitle,
        chineseSeoDescription: result.chinese.seoDescription,
        russianTitle: result.russian.title,
        russianShortDescription: result.russian.shortDescription,
        russianDescription: result.russian.description,
        russianSeoTitle: result.russian.seoTitle,
        russianSeoDescription: result.russian.seoDescription,
      }));
      showMessage(
        "English listing translated into Chinese and Russian.",
        "success",
      );
    } catch (error) {
      showMessage(
        errorText(error, "Translation could not be completed."),
        "error",
      );
    } finally {
      setTranslatingListing(false);
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!selectedCategoryId) {
      showMessage(
        "Choose the full category path before creating the product.",
        "error",
      );
      return;
    }
    if (!selectedCategory?.backingId) {
      showMessage(
        "Marketplace categories are ready, but the seller catalog connection could not be resolved. Refresh and try again.",
        "error",
      );
      return;
    }
    const lastLevel = categoryLevels[form.categoryPathIds.length];
    if (lastLevel?.length) {
      showMessage(
        "Complete the category path to the most specific available option.",
        "error",
      );
      return;
    }
    if (!coverImage) {
      showMessage(
        "Upload a clear product image before creating the listing.",
        "error",
      );
      return;
    }
    if (
      !form.name.trim() ||
      !form.shortDescription.trim() ||
      !form.description.trim() ||
      !form.chineseTitle.trim() ||
      !form.chineseShortDescription.trim() ||
      !form.chineseDescription.trim() ||
      !form.russianTitle.trim() ||
      !form.russianShortDescription.trim() ||
      !form.russianDescription.trim()
    ) {
      showMessage(
        "Complete the English, Chinese, and Russian titles and descriptions before submitting.",
        "error",
      );
      return;
    }
    if (cents(form.priceUsd) < 50) {
      showMessage("Set a USD price of at least $0.50.", "error");
      return;
    }
    if (cents(form.priceCny) < 1 || cents(form.priceRub) < 1) {
      showMessage(
        "Set the Chinese yuan and Russian ruble prices before submitting.",
        "error",
      );
      return;
    }

    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.append("categoryId", selectedCategory.backingId);
    data.append("name", form.name.trim());
    data.append("shortDescription", form.shortDescription.trim());
    data.append("description", form.description.trim());
    data.append("type", form.type);
    data.append("priceUsdCents", String(cents(form.priceUsd)));
    data.append("priceCnyCents", String(cents(form.priceCny)));
    data.append("priceRubCents", String(cents(form.priceRub)));
    data.append("currency", "USD");
    data.append("deliveryNote", form.deliveryNote.trim());
    data.append("afterSalesServiceHours", String(form.afterSalesServiceHours));
    data.append("downloadLimit", String(form.downloadLimit));
    data.append("downloadExpiryHours", String(form.downloadExpiryHours));
    data.append("buyersGetUpdates", String(form.buyersGetUpdates));
    data.append("inventoryLines", form.inventoryLines.trim());
    data.append("brand", form.brand.trim());
    data.append("platform", form.platform.trim());
    data.append("region", form.region.trim());
    data.append("country", form.country.trim());
    data.append("server", form.server.trim());
    data.append("language", form.language.trim());
    data.append("deliveryMethod", form.deliveryMethod.trim());
    data.append("productKind", form.productKind.trim());
    data.append("condition", form.condition.trim());
    data.append("stockType", form.stockType.trim());
    data.append("duration", form.duration.trim());
    data.append("warranty", form.warranty.trim());
    data.append("refundPolicy", form.refundPolicy.trim());
    data.append(
      "stockQuantity",
      String(inventoryRows(form.inventoryLines).length),
    );
    data.append("minimumOrder", String(form.minimumOrder));
    data.append("maximumOrder", String(form.maximumOrder));
    data.append("sku", form.sku.trim());
    data.append("tags", form.tags.trim());
    if (form.salePrice)
      data.append("salePriceCents", String(cents(form.salePrice)));
    if (form.wholesalePrice)
      data.append("wholesalePriceCents", String(cents(form.wholesalePrice)));
    data.append("discountPercent", String(form.discountPercent));
    data.append("couponSupport", String(form.couponSupport));
    data.append("instantDelivery", String(form.instantDelivery));
    data.append("manualDelivery", String(form.manualDelivery));
    data.append("digitalDownload", String(form.digitalDownload));
    const productAttributes = {
      ...form.productAttributes,
      marketplaceCategorySlug: selectedCategory.slug,
      marketplaceCategoryName: selectedCategory.name,
      marketplaceCategoryPath: selectedCategory.pathLabel,
    };
    data.append("productAttributes", JSON.stringify(productAttributes));
    const seoTitle = [
      `Buy ${form.name.trim()}`,
      form.platform.trim(),
      form.productKind.trim(),
      form.region.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 70);
    const seoDescription =
      `${form.shortDescription.trim()} Compare delivery, seller details and buyer protection on Ysello.`.slice(
        0,
        170,
      );
    const chineseSeoTitle =
      form.chineseSeoTitle.trim() ||
      `在 Ysello 购买 ${form.chineseTitle.trim()}`.slice(0, 70);
    const chineseSeoDescription =
      form.chineseSeoDescription.trim() ||
      `${form.chineseShortDescription.trim()} 在 Ysello 比较交付方式、卖家信息与买家保障。`.slice(
        0,
        170,
      );
    const russianSeoTitle =
      form.russianSeoTitle.trim() ||
      `Купить ${form.russianTitle.trim()} на Ysello`.slice(0, 70);
    const russianSeoDescription =
      form.russianSeoDescription.trim() ||
      `${form.russianShortDescription.trim()} Сравните условия доставки, продавца и защиту покупателя на Ysello.`.slice(
        0,
        170,
      );
    data.append(
      "translations",
      JSON.stringify({
        en: {
          title: form.name.trim(),
          shortDescription: form.shortDescription.trim(),
          description: form.description.trim(),
          seoTitle,
          seoDescription,
        },
        "zh-CN": {
          title: form.chineseTitle.trim(),
          shortDescription: form.chineseShortDescription.trim(),
          description: form.chineseDescription.trim(),
          seoTitle: chineseSeoTitle,
          seoDescription: chineseSeoDescription,
        },
        ru: {
          title: form.russianTitle.trim(),
          shortDescription: form.russianShortDescription.trim(),
          description: form.russianDescription.trim(),
          seoTitle: russianSeoTitle,
          seoDescription: russianSeoDescription,
        },
      }),
    );
    // SEO limits are intentionally smaller than the visible product fields.
    data.append("seoTitle", seoTitle);
    data.append("seoDescription", seoDescription);
    data.append("coverImage", coverImage);

    try {
      const result = await apiRequest<{ message?: string }>(
        "/api/seller/products",
        { method: "POST", body: data },
      );
      setOpen(false);
      setCoverImage(null);
      setForm((current) => ({
        ...initialForm,
        categoryPathIds: current.categoryPathIds.slice(0, 1),
      }));
      showMessage(
        result.message ?? "Product created and sent for approval.",
        "success",
      );
      selectTab("products");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Product could not be created."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(productId: string, file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024)
      return showMessage("Image must be 8 MB or smaller.", "error");
    const data = new FormData();
    data.append("coverImage", file);
    setMediaUploading(`product:${productId}`);
    showMessage("Uploading product image…");
    try {
      await apiRequest(`/api/seller/products/${productId}/image`, {
        method: "POST",
        body: data,
      });
      showMessage("Product image uploaded successfully.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Image upload failed."), "error");
    } finally {
      setMediaUploading("");
    }
  }

  async function uploadDeliveryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    showMessage("Uploading delivery file…");
    try {
      await apiRequest(`/api/seller/products/${productId}/files`, {
        method: "POST",
        body: data,
      });
      showMessage("Delivery file uploaded.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "File upload failed."), "error");
    }
  }

  async function uploadInventoryFile(productId: string, file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try {
      const result = await apiRequest<{ count: number }>(
        `/api/seller/products/${productId}/inventory/file`,
        { method: "POST", body: data },
      );
      showMessage(
        `${result.count} inventory row${result.count === 1 ? "" : "s"} added.`,
        "success",
      );
      await load();
    } catch (error) {
      showMessage(errorText(error, "Inventory upload failed."), "error");
    }
  }

  async function addInventoryRows(productId: string) {
    const inventoryLines = window.prompt(
      "Paste one digital item, code, or license per line:",
    );
    if (!inventoryLines?.trim()) return;
    try {
      const result = await apiRequest<{ count: number }>(
        `/api/seller/products/${productId}/inventory/manual`,
        {
          method: "POST",
          body: { inventoryLines },
        },
      );
      showMessage(
        `${result.count} inventory row${result.count === 1 ? "" : "s"} added.`,
        "success",
      );
      await load();
    } catch (error) {
      showMessage(
        errorText(error, "Inventory rows could not be added."),
        "error",
      );
    }
  }

  async function submit(productId: string) {
    try {
      await apiRequest(`/api/seller/products/${productId}/submit`, {
        method: "POST",
      });
      showMessage("Product submitted for admin approval.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Product could not be submitted."), "error");
    }
  }

  function editProduct(product: Product) {
    setEditingProduct(product);
  }

  async function productAction(
    productId: string,
    action: "duplicate" | "remove" | "hide" | "pause",
  ) {
    if (
      action === "remove" &&
      !window.confirm("Remove this product from your catalog?")
    )
      return;
    try {
      if (action === "duplicate")
        await apiRequest(`/api/seller/products/${productId}/duplicate`, {
          method: "POST",
        });
      else if (action === "remove")
        await apiRequest(`/api/seller/products/${productId}`, {
          method: "DELETE",
        });
      else
        await apiRequest(`/api/seller/products/${productId}/status`, {
          method: "PATCH",
          body: { status: action === "hide" ? "HIDDEN" : "PAUSED" },
        });
      showMessage(
        action === "duplicate"
          ? "Product cloned as a draft."
          : action === "remove"
            ? "Product removed from your catalog."
            : `Product ${action} action completed.`,
        "success",
      );
      await load();
    } catch (error) {
      showMessage(errorText(error, "Product action failed."), "error");
    }
  }

  async function bulkStatus(
    status:
      "DRAFT" | "PENDING" | "HIDDEN" | "PAUSED" | "OUT_OF_STOCK" | "REMOVED",
  ) {
    if (!selectedProductIds.length)
      return showMessage("Select one or more products first.", "error");
    if (
      status === "REMOVED" &&
      !window.confirm(
        `Remove ${selectedProductIds.length} selected product${selectedProductIds.length === 1 ? "" : "s"} from your catalog?`,
      )
    )
      return;
    try {
      const result = await apiRequest<{ updated: number }>(
        "/api/seller/products/bulk/update",
        { method: "PATCH", body: { ids: selectedProductIds, status } },
      );
      showMessage(`${result.updated} products updated.`, "success");
      setSelectedProductIds([]);
      await load();
    } catch (error) {
      showMessage(errorText(error, "Bulk update failed."), "error");
    }
  }

  async function importProducts(file?: File) {
    if (!file) return;
    const data = new FormData();
    data.append("file", file);
    try {
      const result = await apiRequest<{ imported: number; message: string }>(
        "/api/seller/products-import",
        { method: "POST", body: data },
      );
      showMessage(result.message, "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Products could not be imported."), "error");
    }
  }

  async function uploadStoreMedia(kind: "logo" | "banner", file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024)
      return showMessage("Image must be 8 MB or smaller.", "error");
    const data = new FormData();
    data.append(kind, file);
    setMediaUploading(`store:${kind}`);
    setBusy(true);
    showMessage(`Uploading store ${kind}…`);
    try {
      const result = await apiRequest<{
        profile: SellerProfile;
        message?: string;
      }>(`/api/seller/profile/${kind}`, { method: "POST", body: data });
      setProfile(result.profile);
      showMessage(result.message ?? `Store ${kind} uploaded.`, "success");
    } catch (error) {
      showMessage(errorText(error, `Store ${kind} upload failed.`), "error");
    } finally {
      setBusy(false);
      setMediaUploading("");
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiRequest<{ profile: SellerProfile }>(
        "/api/seller/profile",
        { method: "PATCH", body: profileForm },
      );
      setProfile(result.profile);
      showMessage("Store information saved.", "success");
    } catch (error) {
      showMessage(
        errorText(error, "Store information could not be saved."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestWithdrawal(event: FormEvent) {
    event.preventDefault();
    const amountCents = cents(withdrawalForm.amount);
    if (amountCents < 500)
      return showMessage("Minimum withdrawal is $5.00.", "error");
    if (!withdrawalForm.walletAddress.trim())
      return showMessage("Enter the receiving wallet address.", "error");
    setBusy(true);
    try {
      const result = await apiRequest<{
        message?: string;
        withdrawal: Withdrawal;
      }>("/api/wallet/withdrawals", {
        method: "POST",
        body: {
          amountCents,
          blockchain: withdrawalForm.blockchain,
          walletAddress: withdrawalForm.walletAddress.trim(),
        },
      });
      setWithdrawals((current) => [result.withdrawal, ...current]);
      setWithdrawalForm({ ...withdrawalForm, amount: "", walletAddress: "" });
      showMessage(result.message ?? "Withdrawal request submitted.", "success");
      await load();
    } catch (error) {
      showMessage(
        errorText(error, "Withdrawal request could not be submitted."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function replyToTicket(ticketId: string) {
    const body = window.prompt("Write your reply to this support ticket:");
    if (!body?.trim()) return;
    try {
      await apiRequest(`/api/seller/tickets/${ticketId}/reply`, {
        method: "POST",
        body: { body: body.trim() },
      });
      showMessage("Ticket reply sent.", "success");
      await load();
    } catch (error) {
      showMessage(errorText(error, "Ticket reply could not be sent."), "error");
    }
  }

  async function respondToReview(reviewId: string) {
    const response = reviewReply[reviewId]?.trim();
    if (!response)
      return showMessage("Write a public response first.", "error");
    setBusy(true);
    try {
      await apiRequest(`/api/seller/reviews/${reviewId}/respond`, {
        method: "POST",
        body: { response },
      });
      setReviewReply((current) => ({ ...current, [reviewId]: "" }));
      showMessage("Your public review response was posted.", "success");
      await load();
    } catch (error) {
      showMessage(
        errorText(error, "Review response could not be posted."),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function exportOrders() {
    const items =
      filteredOrders.length || searchQuery ? filteredOrders : orders;
    downloadCsv("seller-orders.csv", [
      [
        "Order",
        "Date",
        "Buyer",
        "Product",
        "Quantity",
        "Total USD",
        "Order status",
        "Payment status",
        "Refund status",
      ],
      ...items.map((item) => [
        item.order.orderNumber,
        new Date(item.order.createdAt).toISOString(),
        `${item.order.buyer.firstName} ${item.order.buyer.lastName}`,
        item.productName,
        item.quantity,
        (item.totalCents / 100).toFixed(2),
        item.order.status,
        item.order.payment?.status ?? "",
        item.order.refunds?.[0]?.status ?? "",
      ]),
    ]);
    showMessage(
      `${items.length} order line${items.length === 1 ? "" : "s"} exported.`,
      "success",
    );
  }

  function exportAnalytics() {
    downloadCsv(`seller-analytics-${analyticsPeriod}.csv`, [
      ["Period", "Revenue USD"],
      ...revenueChart.labels.map((label, index) => [
        label,
        (revenueChart.values[index] / 100).toFixed(2),
      ]),
      ["Selected period total", (revenueChart.revenue / 100).toFixed(2)],
      ["Selected period orders", revenueChart.orders],
    ]);
  }

  return (
    <main className="seller-pro-dashboard">
      <Seo
        title="Seller studio"
        description="Manage your storefront, products, files, orders, and digital delivery."
        noIndex
      />
      {drawerOpen ? (
        <button
          className="seller-drawer-backdrop"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <aside className={`seller-pro-sidebar ${drawerOpen ? "open" : ""}`}>
        <div className="seller-sidebar-head">
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
              <small>SELLER CENTER</small>
            </span>
          </Link>
          <button
            aria-label="Close seller menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="seller-store-card">
          <span>
            <MediaPreview
              src={profile?.logoUrl}
              alt={`${profile?.storeName ?? "Store"} logo`}
              fallback={(profile?.storeName ?? "Store")
                .slice(0, 2)
                .toUpperCase()}
            />
          </span>
          <div>
            <strong>{profile?.storeName ?? "Your store"}</strong>
            <small>
              {profile?.isVerified ? "Verified professional" : "Seller account"}
            </small>
          </div>
          {profile?.isVerified ? <BadgeCheck size={17} /> : null}
        </div>
        <div className="panel-mobile-sidebar-tools">
          <LocaleSwitcher compact />
          <Link to="/sign-out">
            <LogOut size={16} /> Sign out
          </Link>
        </div>
        <nav className="seller-premium-nav">
          {sellerMenuGroups.map((group) => (
            <section key={group.label}>
              <button
                className="seller-nav-group"
                type="button"
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
                  {group.items.map(({ label, tab: itemTab, icon: Icon }) => (
                    <button
                      type="button"
                      key={label}
                      className={tab === itemTab ? "active" : ""}
                      onClick={() => selectTab(itemTab)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {label === "Notifications" && pendingProducts > 0 ? (
                        <b>{pendingProducts}</b>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </nav>
        <div className="seller-sidebar-support">
          <LifeBuoy />
          <span>
            <strong>Seller support</strong>
            <small>Help whenever you need it</small>
          </span>
          <ArrowRight />
        </div>
        <div className="seller-pro-sidebar-footer">
          <Link to="/">
            <Home size={16} /> Home
          </Link>
          <Link to="/dashboard">
            <ArrowLeft size={16} /> Buyer account
          </Link>
          <Link to="/sign-out">
            <LogOut size={16} /> Logout
          </Link>
        </div>
      </aside>

      <section className="seller-pro-main">
        <header className="seller-pro-topbar">
          <div>
            <button
              className="seller-mobile-menu"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open seller menu"
            >
              <Menu />
            </button>
            <span>Seller center /</span>
            <strong>{sellerTabs.find((item) => item.id === tab)?.label}</strong>
          </div>
          <label className="seller-global-search">
            <Search />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, orders, buyers…"
            />
          </label>
          <div>
            <Link className="panel-home-link" to="/">
              <Home size={17} /> Home
            </Link>
            <button
              className="seller-icon-button"
              onClick={() => selectTab("notifications")}
              aria-label="Activity center"
            >
              <Bell />
              {pendingProducts + pendingOrders > 0 ? (
                <b>{pendingProducts + pendingOrders}</b>
              ) : null}
            </button>
            <LocaleSwitcher compact />
            <Link
              className="panel-topbar-signout"
              to="/sign-out"
              aria-label="Sign out"
            >
              <LogOut size={16} /> Sign out
            </Link>
            <button
              className="seller-create-button"
              onClick={() => setOpen(true)}
            >
              <PackagePlus size={17} /> Create listing
            </button>
          </div>
        </header>
        <div className="seller-pro-heading">
          <div>
            <span className="seller-live-pill">
              <i /> STORE DATA
            </span>
            <h1>
              {tab === "overview"
                ? `Welcome back, ${profile?.storeName ?? "Seller"}`
                : sellerTabs.find((item) => item.id === tab)?.label}
            </h1>
            <p>
              {tab === "overview"
                ? "Start with orders and listings that need attention, then review performance."
                : "Manage this area with focused tools and current marketplace records."}
            </p>
          </div>
          <button
            className="seller-refresh-button"
            onClick={() => void refreshDashboard()}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "spinning" : ""} /> Refresh
          </button>
        </div>
        {message ? (
          <div className={`dashboard-message ${messageType}`}>{message}</div>
        ) : null}
        {dataIssue ? (
          <div className="dashboard-load-warning" role="alert">
            <ShieldCheck />
            <span>
              <strong>{dataIssue}</strong>
              <small>
                Loaded sections remain available. Retry to restore the missing
                data.
              </small>
            </span>
            <button
              type="button"
              onClick={() => void refreshDashboard()}
              disabled={refreshing}
            >
              <RefreshCw /> Retry
            </button>
          </div>
        ) : null}

        {tab === "overview" ? (
          <>
            <section className="seller-balance-hero">
              <div>
                <span>Available balance</span>
                <strong>
                  {formatMoney(finance?.availableBalanceCents ?? 0)}
                </strong>
                <p>
                  <ArrowUpRight />{" "}
                  {finance?.todayIncomeCents
                    ? formatMoney(finance.todayIncomeCents)
                    : "$0.00"}{" "}
                  earned today
                </p>
              </div>
              <div className="seller-balance-actions">
                <button onClick={() => selectTab("withdrawals")}>
                  <CircleDollarSign /> Withdraw funds
                </button>
                <button onClick={() => selectTab("finance")}>
                  <FileText /> View transactions
                </button>
              </div>
              <span className="seller-balance-orb">
                <Sparkles />
              </span>
            </section>
            <section className="seller-metric-grid seller-metric-grid-premium">
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("finance")}
              >
                <span>
                  <TrendingUp />
                </span>
                <div>
                  <small>Today’s revenue</small>
                  <strong>{formatMoney(finance?.todayIncomeCents ?? 0)}</strong>
                  <p className="positive">
                    <ArrowUpRight /> Current total
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("earnings")}
              >
                <span>
                  <WalletCards />
                </span>
                <div>
                  <small>Lifetime earnings</small>
                  <strong>
                    {formatMoney(
                      finance?.totalSellerEarningsCents ?? grossSales,
                    )}
                  </strong>
                  <p className="positive">
                    <ArrowUpRight /> All-time total
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("processing")}
              >
                <span>
                  <ShoppingBag />
                </span>
                <div>
                  <small>Pending orders</small>
                  <strong>{pendingOrders}</strong>
                  <p>
                    <Clock3 /> Requires attention
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("delivered")}
              >
                <span>
                  <PackageCheck />
                </span>
                <div>
                  <small>Completed orders</small>
                  <strong>{deliveredOrders}</strong>
                  <p className="positive">
                    <ArrowUpRight /> Successful delivery
                  </p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("products")}
              >
                <span>
                  <Boxes />
                </span>
                <div>
                  <small>Published products</small>
                  <strong>{liveProducts}</strong>
                  <p>{pendingProducts} awaiting review</p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("orders")}
              >
                <span>
                  <Users />
                </span>
                <div>
                  <small>Unique buyers</small>
                  <strong>{uniqueBuyers}</strong>
                  <p>Across {orderRecords.length} orders</p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("analytics")}
              >
                <span>
                  <BadgeCheck />
                </span>
                <div>
                  <small>Average rating</small>
                  <strong>
                    {Number(profile?.averageRating ?? 0).toFixed(1)}
                  </strong>
                  <p className="positive">Buyer feedback</p>
                </div>
              </button>
              <button
                type="button"
                className="seller-metric-action"
                onClick={() => selectTab("frozen")}
              >
                <span>
                  <LockKeyhole />
                </span>
                <div>
                  <small>Frozen balance</small>
                  <strong>
                    {formatMoney(finance?.frozenBalanceCents ?? 0)}
                  </strong>
                  <p>Releases automatically</p>
                </div>
              </button>
            </section>
            <section className="seller-performance-grid">
              <article className="seller-chart-card">
                <header>
                  <div>
                    <span>Performance</span>
                    <h2>Revenue overview</h2>
                  </div>
                  <div>
                    <button
                      type="button"
                      className={analyticsPeriod === "7d" ? "active" : ""}
                      aria-pressed={analyticsPeriod === "7d"}
                      onClick={() => setAnalyticsPeriod("7d")}
                    >
                      7 days
                    </button>
                    <button
                      type="button"
                      className={analyticsPeriod === "30d" ? "active" : ""}
                      aria-pressed={analyticsPeriod === "30d"}
                      onClick={() => setAnalyticsPeriod("30d")}
                    >
                      30 days
                    </button>
                    <button
                      type="button"
                      className={analyticsPeriod === "year" ? "active" : ""}
                      aria-pressed={analyticsPeriod === "year"}
                      onClick={() => setAnalyticsPeriod("year")}
                    >
                      Year
                    </button>
                  </div>
                </header>
                <div className="seller-chart-summary">
                  <span>
                    <i className="blue" /> Revenue{" "}
                    <strong>{formatMoney(revenueChart.revenue)}</strong>
                  </span>
                  <span>
                    <i className="green" /> Orders{" "}
                    <strong>{revenueChart.orders}</strong>
                  </span>
                </div>
                <div className="seller-css-chart">
                  {revenueChart.heights.map((height, index) => (
                    <span
                      key={`${analyticsPeriod}-${index}`}
                      title={`${revenueChart.labels[index]}: ${height}%`}
                      style={{ height: `${height}%` }}
                    >
                      <i />
                    </span>
                  ))}
                </div>
                <footer>
                  {revenueChart.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </footer>
              </article>
              <article className="seller-quick-panel">
                <header>
                  <div>
                    <span>Shortcuts</span>
                    <h2>Quick actions</h2>
                  </div>
                  <MoreHorizontal />
                </header>
                <button onClick={() => setOpen(true)}>
                  <span>
                    <PackagePlus />
                  </span>
                  <div>
                    <strong>Create a listing</strong>
                    <small>Build and submit a product for review</small>
                  </div>
                  <ArrowRight />
                </button>
                <button onClick={() => selectTab("orders")}>
                  <span>
                    <ShoppingBag />
                  </span>
                  <div>
                    <strong>Manage orders</strong>
                    <small>{pendingOrders} orders need attention</small>
                  </div>
                  <ArrowRight />
                </button>
                <button onClick={() => selectTab("withdrawals")}>
                  <span>
                    <CircleDollarSign />
                  </span>
                  <div>
                    <strong>Withdraw balance</strong>
                    <small>
                      {formatMoney(finance?.availableBalanceCents ?? 0)}{" "}
                      available
                    </small>
                  </div>
                  <ArrowRight />
                </button>
                <button onClick={() => selectTab("storefront")}>
                  <span>
                    <Palette />
                  </span>
                  <div>
                    <strong>Polish storefront</strong>
                    <small>Logo, banner and policy</small>
                  </div>
                  <ArrowRight />
                </button>
              </article>
            </section>
            <section className="seller-recent-card">
              <header>
                <div>
                  <span>Latest activity</span>
                  <h2>Recent orders</h2>
                </div>
                <button onClick={() => selectTab("orders")}>
                  View all <ArrowRight />
                </button>
              </header>
              {orders.slice(0, 4).length ? (
                <div>
                  {orders.slice(0, 4).map((item) => (
                    <article key={item.id}>
                      <span className="seller-order-avatar">
                        {item.order.buyer.firstName[0]}
                        {item.order.buyer.lastName[0]}
                      </span>
                      <div>
                        <strong>{item.productName}</strong>
                        <small>
                          {item.order.orderNumber} ·{" "}
                          {item.order.buyer.firstName}{" "}
                          {item.order.buyer.lastName}
                        </small>
                      </div>
                      <b>{formatMoney(item.totalCents)}</b>
                      <span
                        className={`status-pill ${item.order.status.toLowerCase()}`}
                      >
                        {item.order.status.replaceAll("_", " ")}
                      </span>
                      <Link
                        to={`/orders/${item.order.id}`}
                        aria-label="Open order"
                      >
                        <ArrowRight />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty compact">
                  <ShoppingBag />
                  <h2>No orders yet</h2>
                  <p>Your newest orders will appear here.</p>
                </div>
              )}
            </section>
          </>
        ) : null}

        {tab === "product-groups" ? (
          <section className="seller-collection-page">
            <header className="seller-table-toolbar">
              <div>
                <h2>Product groups</h2>
                <p>Organize listings into clear buyer-friendly collections</p>
              </div>
              <div>
                <button onClick={() => setOpen(true)}>
                  <PackagePlus /> Add product
                </button>
              </div>
            </header>
            <div className="seller-collection-grid">
              {rootCategories.map((category) => {
                const count = products.filter((product) =>
                  categoryLabel(
                    product.category,
                    product.productAttributes,
                  ).startsWith(category.name),
                ).length;
                return (
                  <article key={category.id}>
                    <span>
                      <FolderKanban />
                    </span>
                    <div>
                      <small>COLLECTION</small>
                      <h3>{category.name}</h3>
                      <p>
                        {count} product{count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <button onClick={() => selectTab("products")}>
                      View listings <ArrowRight />
                    </button>
                  </article>
                );
              })}
              {!rootCategories.length ? (
                <div className="dashboard-empty">
                  <FolderKanban />
                  <h2>No product groups yet</h2>
                  <p>
                    Groups will appear from your active marketplace categories.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "categories" ? (
          <section className="seller-category-page">
            <header className="seller-table-toolbar">
              <div>
                <h2>Marketplace categories</h2>
                <p>Use the approved category path when publishing a product</p>
              </div>
              <div>
                <label>
                  <Search />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search categories"
                  />
                </label>
              </div>
            </header>
            <div className="seller-category-cards">
              {rootCategories
                .filter(
                  (category) =>
                    !searchQuery ||
                    category.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .map((root) => (
                  <article key={root.id}>
                    <header>
                      <span>
                        <Grid3X3 />
                      </span>
                      <div>
                        <small>MAIN CATEGORY</small>
                        <h3>{root.name}</h3>
                      </div>
                    </header>
                    <div>
                      {categories
                        .filter((category) => category.parentId === root.id)
                        .map((child) => (
                          <span key={child.id}>
                            {child.name}
                            <b>
                              {
                                categories.filter(
                                  (item) => item.parentId === child.id,
                                ).length
                              }
                            </b>
                          </span>
                        ))}
                    </div>
                    <button onClick={() => setOpen(true)}>
                      Publish in this category <ArrowRight />
                    </button>
                  </article>
                ))}
            </div>
          </section>
        ) : null}

        {["products", "inventory", "drafts"].includes(tab) ? (
          <section className="seller-product-list seller-pro-products">
            <header className="seller-table-toolbar">
              <div>
                <h2>
                  {tab === "inventory"
                    ? "Inventory & variants"
                    : tab === "drafts"
                      ? "Drafts and review queue"
                      : "Product catalog"}
                </h2>
                <p>
                  {tab === "inventory"
                    ? "Manage delivery files, codes and available stock"
                    : tab === "drafts"
                      ? `${visibleProducts.length} listings need work or review`
                      : `${products.length} products · ${liveProducts} published`}
                </p>
              </div>
              <div>
                <label>
                  <Search />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products"
                  />
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="APPROVED">Published</option>
                  <option value="PENDING">Pending review</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="HIDDEN">Hidden</option>
                  <option value="PAUSED">Paused</option>
                  <option value="OUT_OF_STOCK">Out of stock</option>
                </select>
                <label className="seller-export-link">
                  <Upload /> Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(event) =>
                      void importProducts(event.target.files?.[0])
                    }
                  />
                </label>
                <a
                  className="seller-export-link"
                  href={apiDownloadUrl("/api/seller/products-export.csv")}
                >
                  <Download /> Export
                </a>
                <button onClick={() => setOpen(true)}>
                  <PackagePlus /> Add product
                </button>
              </div>
            </header>
            {selectedProductIds.length ? (
              <div className="seller-bulk-bar">
                <strong>{selectedProductIds.length} selected</strong>
                <button onClick={() => void bulkStatus("PENDING")}>
                  Publish
                </button>
                <button onClick={() => void bulkStatus("PAUSED")}>Pause</button>
                <button onClick={() => void bulkStatus("HIDDEN")}>Hide</button>
                <button onClick={() => void bulkStatus("OUT_OF_STOCK")}>
                  Out of stock
                </button>
                <button
                  className="danger"
                  onClick={() => void bulkStatus("REMOVED")}
                >
                  Remove
                </button>
                <button onClick={() => setSelectedProductIds([])}>Clear</button>
              </div>
            ) : null}
            <div className="seller-list-heading">
              <span>Product</span>
              <span>Status</span>
              <span>Delivery</span>
              <span>Actions</span>
            </div>
            {visibleProducts.length ? (
              visibleProducts.map((product) => {
                const availableRows = product.inventoryItems.filter(
                  (item) => item.isActive && !item.deliveredAt,
                ).length;
                const deliveredRows = product.inventoryItems.filter(
                  (item) => item.deliveredAt,
                ).length;
                return (
                  <article key={product.id}>
                    <div className="seller-product-identity">
                      <label className="seller-row-check">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={(event) =>
                            setSelectedProductIds(
                              event.target.checked
                                ? [...selectedProductIds, product.id]
                                : selectedProductIds.filter(
                                    (id) => id !== product.id,
                                  ),
                            )
                          }
                        />
                        <span />
                      </label>
                      <div className="seller-product-cover">
                        <MediaPreview
                          src={product.coverImageUrl}
                          alt={product.name}
                          fallback={product.name.slice(0, 2).toUpperCase()}
                        />
                        <label
                          className={
                            mediaUploading === `product:${product.id}`
                              ? "uploading"
                              : ""
                          }
                        >
                          <ImagePlus />
                          {mediaUploading === `product:${product.id}`
                            ? "Uploading…"
                            : "Replace image"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={Boolean(mediaUploading)}
                            onChange={(event) =>
                              void uploadImage(
                                product.id,
                                event.target.files?.[0],
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="seller-product-copy">
                        <strong>{product.name}</strong>
                        <small>
                          {categoryLabel(
                            product.category,
                            product.productAttributes,
                          )}
                        </small>
                        <div>
                          <b>
                            {formatMoney(
                              product.priceUsdCents ?? product.priceCents,
                            )}
                          </b>
                          <span>
                            After-sales {product.afterSalesServiceHours ?? 12}h
                          </span>
                        </div>
                        {product.rejectionReason ? (
                          <p>{product.rejectionReason}</p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`status-pill ${product.status.toLowerCase()}`}
                    >
                      {product.status.replaceAll("_", " ")}
                    </span>
                    <div className="file-versions">
                      {product.files.map((file) => (
                        <span key={file.id}>
                          {file.displayName} <small>v{file.version}</small>
                        </span>
                      ))}
                      {availableRows || deliveredRows ? (
                        <span>
                          {availableRows} available{" "}
                          <small>{deliveredRows} delivered</small>
                        </span>
                      ) : null}
                      {!product.files.length &&
                      !availableRows &&
                      !deliveredRows ? (
                        <small>No delivery added</small>
                      ) : null}
                    </div>
                    <div className="seller-product-actions">
                      <Link to={`/product/${product.slug}`}>
                        <Eye /> Preview
                      </Link>
                      <button
                        type="button"
                        onClick={() => void editProduct(product)}
                      >
                        <FileText /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void productAction(product.id, "duplicate")
                        }
                      >
                        <Copy /> Clone
                      </button>
                      {product.status === "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void productAction(product.id, "pause")
                          }
                        >
                          <RefreshCw /> Pause
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void productAction(product.id, "hide")}
                      >
                        <Eye /> Hide
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => void productAction(product.id, "remove")}
                      >
                        <X /> Remove
                      </button>
                      <label className="upload-action">
                        <Upload /> Delivery file
                        <input
                          type="file"
                          onChange={(event) =>
                            void uploadDeliveryFile(
                              product.id,
                              event.target.files?.[0],
                            )
                          }
                        />
                      </label>
                      <label className="upload-action">
                        <FileUp /> Inventory file
                        <input
                          type="file"
                          accept=".txt,.csv,text/plain,text/csv"
                          onChange={(event) =>
                            void uploadInventoryFile(
                              product.id,
                              event.target.files?.[0],
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void addInventoryRows(product.id)}
                      >
                        <PackagePlus /> Add rows
                      </button>
                      {!["PENDING", "APPROVED", "REMOVED"].includes(
                        product.status,
                      ) ? (
                        <button onClick={() => void submit(product.id)}>
                          <Send /> Submit review
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="dashboard-empty">
                <FileUp />
                <h2>
                  {products.length ? "No matching products" : "No products yet"}
                </h2>
                <p>
                  {products.length
                    ? "Try another search or status filter."
                    : "Create your first listing with a product image and the full admin-managed category path."}
                </p>
                {!products.length ? (
                  <button
                    className="primary-button"
                    onClick={() => setOpen(true)}
                  >
                    Create product
                  </button>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {tab === "downloads" ? (
          <section className="seller-uploaded-library">
            <header className="seller-table-toolbar">
              <div>
                <h2>Uploaded product files</h2>
                <p>
                  Download and verify the files currently attached to your
                  products.
                </p>
              </div>
              <div>
                <button onClick={() => selectTab("products")}>
                  <Upload /> Upload another file
                </button>
              </div>
            </header>
            {uploadedFiles.length ? (
              <div className="seller-uploaded-grid">
                {uploadedFiles.map(({ product, file }) => (
                  <article key={file.id}>
                    <span>
                      <FileText />
                    </span>
                    <div>
                      <small>{product.name}</small>
                      <strong>{file.displayName}</strong>
                      <p>
                        Version {file.version} ·{" "}
                        {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <a
                      href={apiDownloadUrl(
                        `/api/seller/files/${file.id}/download`,
                      )}
                    >
                      <Download /> Download
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <Download />
                <h2>No uploaded files</h2>
                <p>
                  Add a delivery file to one of your products and it will appear
                  here.
                </p>
                <button
                  className="primary-button"
                  onClick={() => selectTab("products")}
                >
                  Open products
                </button>
              </div>
            )}
          </section>
        ) : null}

        {["orders", "processing", "delivered", "refunds"].includes(tab) ? (
          <section className="seller-orders-shell">
            <header className="seller-table-toolbar">
              <div>
                <h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2>
                <p>Track payment, delivery, refunds and buyer communication</p>
              </div>
              <div>
                <label>
                  <Search />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Order, buyer or product"
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={exportOrders}
                >
                  <Download /> Export CSV
                </button>
              </div>
            </header>
            <div className="seller-order-tabs">
              <button
                className={tab === "orders" ? "active" : ""}
                onClick={() => selectTab("orders")}
              >
                All <b>{orderRecords.length}</b>
              </button>
              <button
                className={tab === "processing" ? "active" : ""}
                onClick={() => selectTab("processing")}
              >
                Processing <b>{pendingOrders}</b>
              </button>
              <button
                className={tab === "delivered" ? "active" : ""}
                onClick={() => selectTab("delivered")}
              >
                Delivered <b>{deliveredOrders}</b>
              </button>
              <button
                className={tab === "refunds" ? "active" : ""}
                onClick={() => selectTab("refunds")}
              >
                Refunds{" "}
                <b>
                  {
                    new Set(
                      orders
                        .filter(
                          (item) =>
                            item.order.status === "REFUNDED" ||
                            item.order.refunds?.length,
                        )
                        .map((item) => item.order.id),
                    ).size
                  }
                </b>
              </button>
              <button
                className={tab === "disputes" ? "active" : ""}
                onClick={() => selectTab("disputes")}
              >
                Disputes <b>{disputes.length}</b>
              </button>
            </div>
            <section className="seller-orders-grid">
              {filteredOrders.length ? (
                filteredOrders.map((item) => (
                  <article key={item.id}>
                    <header>
                      <span>{item.productName.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <strong>{item.productName}</strong>
                        <small>
                          {item.order.orderNumber} ·{" "}
                          {new Date(item.order.createdAt).toLocaleDateString()}
                        </small>
                        {item.order.refunds?.[0] ? (
                          <small className="seller-case-note">
                            Refund{" "}
                            {item.order.refunds[0].status.replaceAll("_", " ")}{" "}
                            · {formatMoney(item.order.refunds[0].amountCents)}
                          </small>
                        ) : null}
                        {item.deliveredAt ? (
                          <small className="seller-case-note">
                            Delivered{" "}
                            {new Date(item.deliveredAt).toLocaleString()}
                          </small>
                        ) : null}
                      </div>
                      <b>{item.order.status.replaceAll("_", " ")}</b>
                    </header>
                    <div>
                      <span>
                        <small>Buyer</small>
                        <strong>
                          {item.order.buyer.firstName}{" "}
                          {item.order.buyer.lastName}
                        </strong>
                      </span>
                      <span>
                        <small>Quantity</small>
                        <strong>{item.quantity}</strong>
                      </span>
                      <span>
                        <small>Total</small>
                        <strong>{formatMoney(item.totalCents)}</strong>
                      </span>
                      <span>
                        <small>Payment</small>
                        <strong>
                          {item.order.payment?.status ?? "Pending"}
                        </strong>
                      </span>
                    </div>
                    <footer>
                      {item.product?.type === "SERVICE" &&
                      item.order.payment?.status === "PAID" &&
                      !item.deliveredAt &&
                      !["CANCELLED", "REFUNDED"].includes(item.order.status) ? (
                        <button
                          type="button"
                          disabled={orderActionId === item.order.id}
                          onClick={() => void markOrderDelivered(item)}
                        >
                          <PackageCheck size={15} />{" "}
                          {orderActionId === item.order.id
                            ? "Saving delivery…"
                            : "Mark delivered"}
                        </button>
                      ) : null}
                      {item.inventoryItems?.length ? (
                        <button
                          type="button"
                          onClick={() => setDeliveryOrder(item)}
                        >
                          <Eye size={15} /> View delivery{" "}
                          <b>{item.inventoryItems.length}</b>
                        </button>
                      ) : null}
                      <Link to={`/orders/${item.order.id}`}>
                        <MessageSquare size={15} /> Buyer chat{" "}
                        <ArrowRight size={14} />
                      </Link>
                    </footer>
                  </article>
                ))
              ) : (
                <div className="dashboard-empty">
                  <ShoppingBag />
                  <h2>No {tab === "orders" ? "seller orders" : tab} found</h2>
                  <p>This status is clear right now.</p>
                </div>
              )}
            </section>
          </section>
        ) : null}

        {tab === "disputes" ? (
          <section className="seller-orders-shell seller-case-center">
            <header className="seller-table-toolbar">
              <div>
                <h2>Disputes</h2>
                <p>
                  Review the buyer’s issue, refund demand, response deadline,
                  and protected order conversation.
                </p>
              </div>
              <span className="seller-case-count">
                {disputes.length} case{disputes.length === 1 ? "" : "s"}
              </span>
            </header>
            <div className="seller-order-tabs">
              <button onClick={() => selectTab("orders")}>
                All orders <b>{orderRecords.length}</b>
              </button>
              <button onClick={() => selectTab("refunds")}>Refunds</button>
              <button className="active">
                Disputes <b>{disputes.length}</b>
              </button>
            </div>
            <section className="seller-dispute-grid">
              {disputes.length ? (
                disputes.map((dispute) => (
                  <article key={dispute.id}>
                    <header>
                      <span>
                        <ShieldCheck />
                      </span>
                      <div>
                        <small>
                          {dispute.order.orderNumber} ·{" "}
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </small>
                        <h3>{dispute.subject}</h3>
                      </div>
                      <b
                        className={`status-pill ${dispute.status.toLowerCase()}`}
                      >
                        {dispute.status.replaceAll("_", " ")}
                      </b>
                    </header>
                    <p>{dispute.description}</p>
                    <dl>
                      <div>
                        <dt>Buyer</dt>
                        <dd>
                          {dispute.order.buyer.firstName}{" "}
                          {dispute.order.buyer.lastName}
                        </dd>
                      </div>
                      <div>
                        <dt>Refund demanded</dt>
                        <dd>{dispute.refundDemanded ? "Yes" : "No"}</dd>
                      </div>
                      <div>
                        <dt>Awaiting</dt>
                        <dd>
                          {dispute.awaitingParty?.replaceAll("_", " ") ??
                            "Review"}
                        </dd>
                      </div>
                      <div>
                        <dt>Response due</dt>
                        <dd>
                          {dispute.autoCloseAt
                            ? new Date(dispute.autoCloseAt).toLocaleString()
                            : "No active deadline"}
                        </dd>
                      </div>
                    </dl>
                    <footer>
                      <Link to={`/orders/${dispute.order.id}`}>
                        <MessageSquare /> Open protected conversation{" "}
                        <ArrowRight />
                      </Link>
                    </footer>
                  </article>
                ))
              ) : (
                <div className="dashboard-empty">
                  <ShieldCheck />
                  <h2>No disputes</h2>
                  <p>No buyer cases require your response.</p>
                </div>
              )}
            </section>
          </section>
        ) : null}

        {["finance", "transactions", "frozen", "earnings"].includes(tab) ? (
          <>
            <section className="seller-finance-grid">
              <article className="primary">
                <span>
                  <WalletCards />
                </span>
                <div>
                  <small>Available balance</small>
                  <strong>
                    {formatMoney(finance?.availableBalanceCents ?? 0)}
                  </strong>
                  <p>Ready to withdraw</p>
                </div>
                <button onClick={() => selectTab("withdrawals")}>
                  Withdraw <ArrowRight />
                </button>
              </article>
              <article>
                <span>
                  <LockKeyhole />
                </span>
                <div>
                  <small>Frozen balance</small>
                  <strong>
                    {formatMoney(finance?.frozenBalanceCents ?? 0)}
                  </strong>
                  <p>Protected during hold period</p>
                </div>
              </article>
              <article>
                <span>
                  <TrendingUp />
                </span>
                <div>
                  <small>Lifetime earnings</small>
                  <strong>
                    {formatMoney(finance?.totalSellerEarningsCents ?? 0)}
                  </strong>
                  <p>{finance?.totalSellerEarningCount ?? 0} earning records</p>
                </div>
              </article>
              <article>
                <span>
                  <ArrowDownRight />
                </span>
                <div>
                  <small>Withdrawn</small>
                  <strong>{formatMoney(finance?.withdrawnCents ?? 0)}</strong>
                  <p>Paid and pending requests</p>
                </div>
              </article>
            </section>
            <section className="seller-finance-layout">
              <article className="seller-chart-card">
                <header>
                  <div>
                    <span>Gross order revenue</span>
                    <h2>Income activity</h2>
                  </div>
                  <button
                    type="button"
                    className="seller-export"
                    onClick={exportAnalytics}
                  >
                    <Download /> Export CSV
                  </button>
                </header>
                <div className="seller-finance-summary">
                  <strong>{formatMoney(finance?.todayIncomeCents ?? 0)}</strong>
                  <span>Today’s net seller income</span>
                </div>
                <div className="seller-css-chart finance">
                  {revenueChart.heights.map((height, index) => (
                    <span
                      key={`finance-${index}`}
                      title={`${revenueChart.labels[index]}: ${formatMoney(revenueChart.values[index])}`}
                      style={{ height: `${height}%` }}
                    >
                      <i />
                    </span>
                  ))}
                </div>
              </article>
              <article className="seller-frozen-card">
                <header>
                  <span>
                    <ShieldCheck />
                  </span>
                  <div>
                    <h2>Frozen funds protection</h2>
                    <p>
                      Funds are released automatically after the marketplace
                      safety hold.
                    </p>
                  </div>
                </header>
                <div>
                  <span>Currently frozen</span>
                  <strong>
                    {formatMoney(finance?.frozenBalanceCents ?? 0)}
                  </strong>
                </div>
                <ol>
                  <li className="done">
                    <i />
                    Payment received
                  </li>
                  <li className="active">
                    <i />
                    Buyer protection hold
                  </li>
                  <li>
                    <i />
                    Available to withdraw
                  </li>
                </ol>
              </article>
            </section>
            <section className="seller-transaction-card">
              <header>
                <div>
                  <span>Activity log</span>
                  <h2>Recent payout activity</h2>
                </div>
              </header>
              {withdrawals.length ? (
                withdrawals.slice(0, 8).map((item) => (
                  <article key={item.id}>
                    <span className="transaction-icon">
                      <ArrowUpRight />
                    </span>
                    <div>
                      <strong>Withdrawal request</strong>
                      <small>
                        {item.providerReference ?? item.id.slice(0, 10)} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <b>-{formatMoney(item.amountCents)}</b>
                    <span
                      className={`status-pill ${item.status.toLowerCase()}`}
                    >
                      {item.status}
                    </span>
                  </article>
                ))
              ) : (
                <div className="dashboard-empty compact">
                  <FileText />
                  <h2>No payout activity yet</h2>
                  <p>Submitted payout requests will appear here.</p>
                </div>
              )}
            </section>
          </>
        ) : null}

        {tab === "withdrawals" ? (
          <section className="seller-withdraw-layout">
            <form className="seller-withdraw-card" onSubmit={requestWithdrawal}>
              <header>
                <span>
                  <CircleDollarSign />
                </span>
                <div>
                  <h2>Withdraw funds</h2>
                  <p>Send your available balance to a verified wallet.</p>
                </div>
              </header>
              <div className="seller-available-strip">
                <span>Available to withdraw</span>
                <strong>
                  {formatMoney(finance?.availableBalanceCents ?? 0)}
                </strong>
              </div>
              <label>
                <span>Withdrawal network</span>
                <select
                  value={withdrawalForm.blockchain}
                  onChange={(event) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      blockchain: event.target.value,
                    })
                  }
                >
                  <option>USDT TRC20</option>
                  <option>USDT BEP20</option>
                  <option>USDT ERC20</option>
                  <option>Bitcoin</option>
                  <option>Ethereum</option>
                </select>
              </label>
              <label>
                <span>Amount (USD)</span>
                <div className="amount-input">
                  <b>$</b>
                  <input
                    required
                    type="number"
                    min="5"
                    step="0.01"
                    value={withdrawalForm.amount}
                    onChange={(event) =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        amount: event.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setWithdrawalForm({
                        ...withdrawalForm,
                        amount: (
                          (finance?.availableBalanceCents ?? 0) / 100
                        ).toFixed(2),
                      })
                    }
                  >
                    MAX
                  </button>
                </div>
              </label>
              <label>
                <span>Receiving wallet address</span>
                <input
                  required
                  minLength={12}
                  value={withdrawalForm.walletAddress}
                  onChange={(event) =>
                    setWithdrawalForm({
                      ...withdrawalForm,
                      walletAddress: event.target.value,
                    })
                  }
                  placeholder="Paste wallet address"
                />
              </label>
              <div className="seller-fee-preview">
                <span>
                  Requested amount{" "}
                  <b>{formatMoney(cents(withdrawalForm.amount))}</b>
                </span>
                <span>
                  Platform fee <b>$0.00</b>
                </span>
                <span>
                  Net amount{" "}
                  <strong>{formatMoney(cents(withdrawalForm.amount))}</strong>
                </span>
              </div>
              <button className="seller-withdraw-submit" disabled={busy}>
                <ShieldCheck /> {busy ? "Submitting…" : "Review withdrawal"}
              </button>
              <small className="seller-secure-note">
                <LockKeyhole /> Protected by account security and admin approval
              </small>
            </form>
            <article className="seller-withdraw-history">
              <header>
                <div>
                  <span>History</span>
                  <h2>Recent withdrawals</h2>
                </div>
                <button>
                  <SlidersHorizontal />
                </button>
              </header>
              {withdrawals.length ? (
                withdrawals.map((item) => (
                  <div key={item.id}>
                    <span>
                      <ArrowUpRight />
                    </span>
                    <div>
                      <strong>{formatMoney(item.amountCents)}</strong>
                      <small>
                        {item.blockchain} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <b className={`status-pill ${item.status.toLowerCase()}`}>
                      {item.status}
                    </b>
                  </div>
                ))
              ) : (
                <div className="dashboard-empty">
                  <CircleDollarSign />
                  <h2>No withdrawals yet</h2>
                  <p>
                    Your submitted requests will appear here with live status.
                  </p>
                </div>
              )}
            </article>
          </section>
        ) : null}

        {tab === "tickets" ? (
          <section className="seller-ticket-center">
            <header className="seller-table-toolbar">
              <div>
                <h2>Support tickets</h2>
                <p>Order-linked support conversations and priority status</p>
              </div>
              <div>
                <label>
                  <Search />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tickets"
                  />
                </label>
                <Link to="/support">
                  <LifeBuoy /> Support center
                </Link>
              </div>
            </header>
            {tickets.filter(
              (ticket) =>
                !searchQuery ||
                `${ticket.ticketNumber} ${ticket.subject}`
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()),
            ).length ? (
              <div>
                {tickets
                  .filter(
                    (ticket) =>
                      !searchQuery ||
                      `${ticket.ticketNumber} ${ticket.subject}`
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                  )
                  .map((ticket) => (
                    <article key={ticket.id}>
                      <span className="seller-ticket-icon">
                        <TicketCheck />
                      </span>
                      <div>
                        <small>
                          {ticket.ticketNumber} ·{" "}
                          {ticket.category.replaceAll("_", " ")}
                        </small>
                        <h3>{ticket.subject}</h3>
                        <p>
                          {ticket.creator?.firstName ?? "Buyer"} ·{" "}
                          {ticket.messages?.length ?? 0} messages · Updated{" "}
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <b
                        className={`status-pill ${ticket.status.toLowerCase()}`}
                      >
                        {ticket.status}
                      </b>
                      <button onClick={() => void replyToTicket(ticket.id)}>
                        Reply <ArrowRight />
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <TicketCheck />
                <h2>No support tickets</h2>
                <p>Buyer order tickets will appear here.</p>
              </div>
            )}
          </section>
        ) : null}

        {["coupons", "promotions", "sponsored", "featured"].includes(tab) ? (
          <section className="seller-marketing-center">
            <header>
              <div>
                <span>SELLER MARKETING</span>
                <h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2>
                <p>
                  Create visibility and conversion campaigns around your
                  approved products.
                </p>
              </div>
              <button onClick={() => selectTab("products")}>
                <Boxes /> Select products
              </button>
            </header>
            <div className="seller-marketing-summary">
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
                  <small>Running promotions</small>
                  <strong>0</strong>
                </span>
              </article>
              <article>
                <Megaphone />
                <span>
                  <small>Sponsored listings</small>
                  <strong>0</strong>
                </span>
              </article>
              <article>
                <Sparkles />
                <span>
                  <small>Featured products</small>
                  <strong>
                    {
                      products
                        .filter((product) => product.status === "APPROVED")
                        .slice(0, 3).length
                    }
                  </strong>
                </span>
              </article>
            </div>
            <div className="seller-campaign-builder">
              <div>
                <span>
                  <Megaphone />
                </span>
                <h3>
                  Build your first{" "}
                  {tab === "coupons"
                    ? "coupon"
                    : tab === "promotions"
                      ? "promotion"
                      : tab === "sponsored"
                        ? "sponsored campaign"
                        : "featured collection"}
                </h3>
                <p>
                  Choose an approved product, define the offer, schedule dates,
                  and review the campaign before publishing.
                </p>
              </div>
              <div className="seller-campaign-steps">
                <span className="active">
                  <b>1</b>Choose product
                </span>
                <span>
                  <b>2</b>Offer details
                </span>
                <span>
                  <b>3</b>Schedule
                </span>
                <span>
                  <b>4</b>Review
                </span>
              </div>
              <div className="seller-campaign-products">
                {products
                  .filter((product) => product.status === "APPROVED")
                  .slice(0, 4)
                  .map((product) => (
                    <button key={product.id}>
                      <span>
                        <MediaPreview
                          src={product.coverImageUrl}
                          alt={product.name}
                          fallback={product.name.slice(0, 2)}
                        />
                      </span>
                      <div>
                        <strong>{product.name}</strong>
                        <small>
                          {formatMoney(
                            product.priceUsdCents ?? product.priceCents,
                          )}
                        </small>
                      </div>
                      <ArrowRight />
                    </button>
                  ))}
                {!products.some((product) => product.status === "APPROVED") ? (
                  <div className="dashboard-empty compact">
                    <Megaphone />
                    <h2>No eligible products</h2>
                    <p>
                      Publish and approve a product before creating a campaign.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "analytics" ? (
          <>
            <section className="seller-analytics-grid">
              <article>
                <span>
                  <TrendingUp />
                </span>
                <small>Paid-order revenue</small>
                <strong>{formatMoney(grossSales)}</strong>
                <p className="positive">
                  <ArrowUpRight /> Excludes cancelled and refunded orders
                </p>
              </article>
              <article>
                <span>
                  <ShoppingBag />
                </span>
                <small>Orders</small>
                <strong>{orderRecords.length}</strong>
                <p>{deliveredOrders} delivered or completed</p>
              </article>
              <article>
                <span>
                  <Users />
                </span>
                <small>Customers</small>
                <strong>{uniqueBuyers}</strong>
                <p>Unique buyer accounts</p>
              </article>
              <article>
                <span>
                  <CircleDollarSign />
                </span>
                <small>Average order</small>
                <strong>{formatMoney(averageOrderValue)}</strong>
                <p>Revenue per order</p>
              </article>
            </section>
            <section className="seller-analytics-layout">
              <article className="seller-chart-card">
                <header>
                  <div>
                    <span>Sales intelligence</span>
                    <h2>Revenue trend</h2>
                  </div>
                  <div>
                    <button
                      type="button"
                      className={analyticsPeriod === "7d" ? "active" : ""}
                      onClick={() => setAnalyticsPeriod("7d")}
                    >
                      7 days
                    </button>
                    <button
                      type="button"
                      className={analyticsPeriod === "30d" ? "active" : ""}
                      onClick={() => setAnalyticsPeriod("30d")}
                    >
                      30 days
                    </button>
                    <button
                      type="button"
                      className={analyticsPeriod === "year" ? "active" : ""}
                      onClick={() => setAnalyticsPeriod("year")}
                    >
                      Year
                    </button>
                    <button type="button" onClick={exportAnalytics}>
                      <Download /> CSV
                    </button>
                  </div>
                </header>
                <div className="seller-chart-summary">
                  <span>
                    <i className="blue" /> Selected period{" "}
                    <strong>{formatMoney(revenueChart.revenue)}</strong>
                  </span>
                  <span>
                    <i className="green" /> Paid orders{" "}
                    <strong>{revenueChart.orders}</strong>
                  </span>
                </div>
                <div className="seller-css-chart analytics">
                  {revenueChart.heights.map((height, index) => (
                    <span
                      key={`${analyticsPeriod}-${revenueChart.labels[index]}`}
                      title={`${revenueChart.labels[index]}: ${formatMoney(revenueChart.values[index])}`}
                      style={{ height: `${height}%` }}
                    >
                      <i />
                    </span>
                  ))}
                </div>
                <footer>
                  {revenueChart.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </footer>
              </article>
              <article className="seller-top-products">
                <header>
                  <span>Products</span>
                  <h2>Top performers</h2>
                </header>
                {topProductPerformance.map((entry, index) => (
                  <div key={entry.product?.id ?? entry.name}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span className="seller-product-mini">
                      {entry.product?.coverImageUrl ? (
                        <img
                          src={mediaUrl(entry.product.coverImageUrl)}
                          alt=""
                        />
                      ) : (
                        entry.name[0]
                      )}
                    </span>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>
                        {entry.units} unit{entry.units === 1 ? "" : "s"} ·{" "}
                        {formatMoney(entry.revenue)}
                      </small>
                    </div>
                    <span className="status-pill approved">PAID</span>
                  </div>
                ))}
                {!topProductPerformance.length ? (
                  <div className="dashboard-empty compact">
                    <BarChart3 />
                    <h2>No sales data</h2>
                    <p>Paid product performance will appear here.</p>
                  </div>
                ) : null}
              </article>
            </section>
          </>
        ) : null}

        {tab === "notifications" ? (
          <section className="seller-notification-center">
            <header>
              <div>
                <span>Live priorities</span>
                <h2>Activity center</h2>
                <p>
                  Current product, order, dispute, and support signals
                  calculated from your seller records.
                </p>
              </div>
              <button type="button" onClick={() => void refreshDashboard()}>
                <RefreshCw /> Refresh
              </button>
            </header>
            <h3>Requires attention</h3>
            {pendingProducts > 0 ? (
              <article className="warning">
                <span>
                  <Clock3 />
                </span>
                <div>
                  <strong>
                    {pendingProducts} product
                    {pendingProducts === 1 ? " is" : "s are"} awaiting review
                  </strong>
                  <p>Open the review queue to check listing status.</p>
                  <small>Product review</small>
                </div>
                <button onClick={() => selectTab("drafts")}>View</button>
              </article>
            ) : null}
            {pendingOrders > 0 ? (
              <article>
                <span>
                  <ShoppingBag />
                </span>
                <div>
                  <strong>
                    {pendingOrders} order
                    {pendingOrders === 1 ? " needs" : "s need"} attention
                  </strong>
                  <p>Review fulfillment and buyer messages.</p>
                  <small>Order fulfillment</small>
                </div>
                <button onClick={() => selectTab("processing")}>View</button>
              </article>
            ) : null}
            {disputes.length ? (
              <article className="warning">
                <span>
                  <ShieldCheck />
                </span>
                <div>
                  <strong>
                    {disputes.length} dispute{disputes.length === 1 ? "" : "s"}{" "}
                    in your case center
                  </strong>
                  <p>
                    Check response deadlines and the protected conversation.
                  </p>
                  <small>Buyer protection</small>
                </div>
                <button onClick={() => selectTab("disputes")}>View</button>
              </article>
            ) : null}
            {tickets.filter(
              (ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status),
            ).length ? (
              <article>
                <span>
                  <TicketCheck />
                </span>
                <div>
                  <strong>Open seller support tickets</strong>
                  <p>Review the latest support conversation.</p>
                  <small>Support</small>
                </div>
                <button onClick={() => selectTab("tickets")}>View</button>
              </article>
            ) : null}
            {!pendingProducts &&
            !pendingOrders &&
            !disputes.length &&
            !tickets.filter(
              (ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status),
            ).length ? (
              <div className="seller-all-caught">
                <CheckCircle2 />
                <strong>You’re all caught up</strong>
                <p>No urgent actions are waiting.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === "messages" ? (
          <section className="seller-message-center">
            <header>
              <div>
                <span className="section-index">ORDER INBOX</span>
                <h2>Buyer conversations</h2>
                <p>
                  Chats are tied to real orders, keeping delivery and dispute
                  history protected.
                </p>
              </div>
              <span>{conversationOrders.length} conversations</span>
            </header>
            {conversationOrders.length ? (
              <div>
                {conversationOrders.map((item) => (
                  <Link to={`/orders/${item.order.id}`} key={item.order.id}>
                    <span>
                      {item.order.buyer.firstName[0]}
                      {item.order.buyer.lastName[0]}
                    </span>
                    <div>
                      <strong>
                        {item.order.buyer.firstName} {item.order.buyer.lastName}
                      </strong>
                      <small>
                        {item.productName} · {item.order.orderNumber}
                      </small>
                    </div>
                    <b
                      className={`status-pill ${item.order.status.toLowerCase()}`}
                    >
                      {item.order.status.replaceAll("_", " ")}
                    </b>
                    <ArrowRight />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <MessageSquare />
                <h2>No conversations yet</h2>
                <p>
                  Buyer chats become available as soon as you receive an order.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {tab === "reviews" ? (
          <section className="seller-review-center">
            <header className="seller-table-toolbar">
              <div>
                <h2>Buyer reviews</h2>
                <p>
                  Read verified product feedback and post one clear public
                  response.
                </p>
              </div>
              <div>
                <span className="seller-review-average">
                  <BadgeCheck />{" "}
                  {Number(profile?.averageRating ?? 0).toFixed(1)} average ·{" "}
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </div>
            </header>
            {reviews.length ? (
              <div>
                {reviews.map((review) => (
                  <article key={review.id}>
                    <header>
                      <div>
                        <strong>{review.product.name}</strong>
                        <small>
                          {review.buyer.firstName} ·{" "}
                          {new Date(review.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <span aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, index) => (
                          <i
                            className={index < review.rating ? "active" : ""}
                            key={index}
                          >
                            ★
                          </i>
                        ))}
                      </span>
                    </header>
                    <p>{review.body}</p>
                    {review.sellerResponse ? (
                      <blockquote>
                        <strong>Your response</strong>
                        <p>{review.sellerResponse}</p>
                      </blockquote>
                    ) : (
                      <div className="seller-review-reply">
                        <label htmlFor={`review-${review.id}`}>
                          Public response
                        </label>
                        <textarea
                          id={`review-${review.id}`}
                          rows={3}
                          maxLength={1000}
                          value={reviewReply[review.id] ?? ""}
                          onChange={(event) =>
                            setReviewReply((current) => ({
                              ...current,
                              [review.id]: event.target.value,
                            }))
                          }
                          placeholder="Acknowledge the feedback and explain any useful next step."
                        />
                        <button
                          type="button"
                          disabled={
                            busy || !(reviewReply[review.id] ?? "").trim()
                          }
                          onClick={() => void respondToReview(review.id)}
                        >
                          <Send /> Post response
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <BadgeCheck />
                <h2>No reviews yet</h2>
                <p>
                  Verified buyer feedback will appear after completed purchases.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {tab === "storefront" ? (
          <section className="seller-branding-layout">
            <article
              className="seller-brand-preview"
              style={
                profile?.bannerUrl
                  ? {
                      backgroundImage: `linear-gradient(135deg, rgba(8,18,45,.8), rgba(29,78,216,.5)), url(${mediaUrl(profile.bannerUrl)})`,
                    }
                  : undefined
              }
            >
              <span>
                <MediaPreview
                  src={profile?.logoUrl}
                  alt="Store logo"
                  fallback={(profile?.storeName ?? "Store")
                    .slice(0, 2)
                    .toUpperCase()}
                />
              </span>
              <div>
                <small>PUBLIC STOREFRONT</small>
                <h2>{profile?.storeName}</h2>
                <p>{profile?.about}</p>
                <b>{profile?.isVerified ? "✓ Verified seller" : "Seller"}</b>
              </div>
            </article>
            <form className="seller-brand-form" onSubmit={saveProfile}>
              <header>
                <span>
                  <Store />
                </span>
                <div>
                  <h2>Store media & identity</h2>
                  <p>
                    Upload professional images with an instant preview. JPEG,
                    PNG and WebP are supported.
                  </p>
                </div>
              </header>
              <div className="seller-media-upload-grid">
                <label
                  className={mediaUploading === "store:logo" ? "uploading" : ""}
                >
                  <span>
                    <MediaPreview
                      src={profile?.logoUrl}
                      alt="Current store logo"
                      fallback="LOGO"
                    />
                  </span>
                  <strong>
                    {mediaUploading === "store:logo"
                      ? "Uploading logo…"
                      : profile?.logoUrl
                        ? "Replace store logo"
                        : "Upload store logo"}
                  </strong>
                  <small>Square image · recommended 800 × 800 · max 8 MB</small>
                  <b>
                    <ImagePlus /> Choose image
                  </b>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || Boolean(mediaUploading)}
                    onChange={(event) =>
                      void uploadStoreMedia("logo", event.target.files?.[0])
                    }
                  />
                </label>
                <label
                  className={
                    mediaUploading === "store:banner" ? "uploading" : ""
                  }
                >
                  <span className="wide">
                    <MediaPreview
                      src={profile?.bannerUrl}
                      alt="Current store banner"
                      fallback="BANNER"
                    />
                  </span>
                  <strong>
                    {mediaUploading === "store:banner"
                      ? "Uploading banner…"
                      : profile?.bannerUrl
                        ? "Replace store banner"
                        : "Upload store banner"}
                  </strong>
                  <small>Wide image · recommended 1600 × 500 · max 8 MB</small>
                  <b>
                    <ImagePlus /> Choose image
                  </b>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy || Boolean(mediaUploading)}
                    onChange={(event) =>
                      void uploadStoreMedia("banner", event.target.files?.[0])
                    }
                  />
                </label>
              </div>
              <label>
                <span>About your store</span>
                <textarea
                  required
                  minLength={20}
                  rows={6}
                  value={profileForm.about}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      about: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Store policy</span>
                <textarea
                  rows={5}
                  value={profileForm.policy}
                  onChange={(event) =>
                    setProfileForm({
                      ...profileForm,
                      policy: event.target.value,
                    })
                  }
                  placeholder="Delivery, support and refund expectations"
                />
              </label>
              <button className="primary-button" disabled={busy}>
                <Store /> {busy ? "Saving…" : "Save storefront"}
              </button>
            </form>
          </section>
        ) : null}

        {["revenue", "visitors", "conversion"].includes(tab) ? (
          <section className="seller-insight-detail">
            <header>
              <div>
                <span>ANALYTICS</span>
                <h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2>
                <p>
                  Live performance signals calculated from your current products
                  and orders.
                </p>
              </div>
              <button type="button">
                <Download /> Export report
              </button>
            </header>
            <div className="seller-insight-metrics">
              <article>
                <TrendingUp />
                <small>Gross revenue</small>
                <strong>{formatMoney(grossSales)}</strong>
                <span>Across {orders.length} orders</span>
              </article>
              <article>
                <Users />
                <small>Unique buyers</small>
                <strong>{uniqueBuyers}</strong>
                <span>Buyer accounts reached</span>
              </article>
              <article>
                <ArrowUpRight />
                <small>Conversion signal</small>
                <strong>
                  {products.length
                    ? `${Math.min(100, Math.round((orders.length / Math.max(products.length, 1)) * 10))}%`
                    : "0%"}
                </strong>
                <span>Orders per active listing</span>
              </article>
              <article>
                <CircleDollarSign />
                <small>Average order</small>
                <strong>{formatMoney(averageOrderValue)}</strong>
                <span>Average checkout value</span>
              </article>
            </div>
            <article className="seller-insight-chart">
              <div>
                <span>
                  {tab === "visitors"
                    ? "VISITOR TREND"
                    : tab === "conversion"
                      ? "CONVERSION TREND"
                      : "REVENUE TREND"}
                </span>
                <h3>Performance over time</h3>
              </div>
              <div className="seller-css-chart analytics">
                {[22, 31, 28, 46, 52, 43, 61, 68, 59, 77, 73, 86, 82, 96].map(
                  (height, index) => (
                    <span key={index} style={{ height: `${height}%` }}>
                      <i />
                    </span>
                  ),
                )}
              </div>
            </article>
          </section>
        ) : null}

        {["payments", "security", "api", "preferences", "support"].includes(
          tab,
        ) ? (
          <section className="seller-settings-center">
            <header>
              <div>
                <span>SELLER SETTINGS</span>
                <h2>{sellerTabs.find((item) => item.id === tab)?.label}</h2>
                <p>
                  Manage your professional seller workspace without changing
                  existing account workflows.
                </p>
              </div>
              <ShieldCheck />
            </header>
            {tab === "payments" ? (
              <div className="seller-settings-grid">
                <article>
                  <span>
                    <WalletCards />
                  </span>
                  <div>
                    <small>Marketplace balance</small>
                    <h3>Seller wallet</h3>
                    <p>
                      Sales earnings, frozen funds and withdrawals are managed
                      in Financial Center.
                    </p>
                  </div>
                  <button onClick={() => selectTab("finance")}>
                    Open finance <ArrowRight />
                  </button>
                </article>
                <article>
                  <span>
                    <CreditCard />
                  </span>
                  <div>
                    <small>Payout network</small>
                    <h3>Crypto withdrawals</h3>
                    <p>
                      Submit a verified wallet and network when you request a
                      withdrawal.
                    </p>
                  </div>
                  <button onClick={() => selectTab("withdrawals")}>
                    Manage <ArrowRight />
                  </button>
                </article>
              </div>
            ) : null}
            {tab === "security" ? (
              <div className="seller-security-panel">
                <article>
                  <BadgeCheck />
                  <div>
                    <h3>Store verification</h3>
                    <p>
                      {profile?.isVerified
                        ? "Your seller identity is verified."
                        : "Verification is pending review."}
                    </p>
                  </div>
                  <b
                    className={`status-pill ${profile?.isVerified ? "approved" : "pending"}`}
                  >
                    {profile?.isVerified ? "VERIFIED" : "PENDING"}
                  </b>
                </article>
                <article>
                  <LockKeyhole />
                  <div>
                    <h3>Protected account access</h3>
                    <p>
                      Password, authentication and active account controls stay
                      managed by the existing profile workflow.
                    </p>
                  </div>
                  <Link to="/dashboard#profile">
                    Account security <ArrowRight />
                  </Link>
                </article>
              </div>
            ) : null}
            {tab === "api" ? (
              <div className="seller-api-panel">
                <span>
                  <KeyRound />
                </span>
                <div>
                  <small>API ACCESS</small>
                  <h3>Secure integration access</h3>
                  <p>
                    API credentials are issued by marketplace administration.
                    Keys are never displayed until access has been approved for
                    this seller account.
                  </p>
                </div>
                <b className="status-pill pending">ADMIN APPROVAL</b>
                <Link to="/support">
                  Request API access <ArrowRight />
                </Link>
              </div>
            ) : null}
            {tab === "preferences" ? (
              <div className="seller-preference-list">
                <article>
                  <div>
                    <Bell />
                    <span>
                      <strong>Order notifications</strong>
                      <small>
                        Receive updates when a buyer places or changes an order.
                      </small>
                    </span>
                  </div>
                  <b>Enabled</b>
                </article>
                <article>
                  <div>
                    <MessageSquare />
                    <span>
                      <strong>Buyer message alerts</strong>
                      <small>
                        Keep new order conversations visible in Seller Center.
                      </small>
                    </span>
                  </div>
                  <b>Enabled</b>
                </article>
                <article>
                  <div>
                    <Palette />
                    <span>
                      <strong>Display preferences</strong>
                      <small>
                        Responsive spacing and accessible contrast follow your
                        device.
                      </small>
                    </span>
                  </div>
                  <b>Automatic</b>
                </article>
              </div>
            ) : null}
            {tab === "support" ? (
              <div className="seller-support-panel">
                <span>
                  <LifeBuoy />
                </span>
                <div>
                  <small>SELLER SUPPORT</small>
                  <h3>Help when your business needs it</h3>
                  <p>
                    Open a protected support ticket, review buyer-linked
                    conversations, or visit the marketplace help center.
                  </p>
                  <div>
                    <Link to="/support">
                      <TicketCheck /> Create support ticket
                    </Link>
                    <button onClick={() => selectTab("tickets")}>
                      <MessageSquare /> View seller tickets
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>

      <nav className="seller-mobile-bottom-nav">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => selectTab("overview")}
        >
          <LayoutDashboard />
          <span>Home</span>
        </button>
        <button
          className={tab === "products" ? "active" : ""}
          onClick={() => selectTab("products")}
        >
          <Boxes />
          <span>Products</span>
        </button>
        <button
          className="seller-mobile-fab"
          onClick={() => setOpen(true)}
          aria-label="Publish product"
        >
          <PackagePlus />
        </button>
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => selectTab("orders")}
        >
          <ShoppingBag />
          <span>Orders</span>
        </button>
        <button
          className={tab === "finance" ? "active" : ""}
          onClick={() => selectTab("finance")}
        >
          <WalletCards />
          <span>Finance</span>
        </button>
      </nav>

      {deliveryOrder ? (
        <div
          className="modal-backdrop seller-delivery-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Delivered accounts"
        >
          <section className="seller-delivery-modal">
            <header>
              <div>
                <small>DELIVERY DETAILS</small>
                <h2>{deliveryOrder.productName}</h2>
                <p>
                  Order #{deliveryOrder.order.orderNumber} ·{" "}
                  {deliveryOrder.order.buyer.firstName}{" "}
                  {deliveryOrder.order.buyer.lastName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryOrder(null)}
                aria-label="Close"
              >
                <X />
              </button>
            </header>
            <div className="seller-delivery-toolbar">
              <span>
                <PackageCheck /> {deliveryOrder.inventoryItems?.length ?? 0}{" "}
                account{deliveryOrder.inventoryItems?.length === 1 ? "" : "s"}{" "}
                delivered
              </span>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    (deliveryOrder.inventoryItems ?? [])
                      .map((row) => row.content)
                      .join("\n"),
                  )
                }
              >
                <Copy /> Copy all
              </button>
            </div>
            <div className="seller-delivery-list">
              {deliveryOrder.inventoryItems?.map((row, index) => (
                <article key={row.id}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <code>{row.content}</code>
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard?.writeText(row.content)
                    }
                    aria-label={`Copy delivered account ${index + 1}`}
                  >
                    <Copy />
                  </button>
                </article>
              ))}
            </div>
            <footer>
              <a
                href={apiDownloadUrl(
                  `/api/commerce/order-items/${deliveryOrder.id}/delivery?format=txt`,
                )}
              >
                <FileText /> TXT file
              </a>
              <a
                href={apiDownloadUrl(
                  `/api/commerce/order-items/${deliveryOrder.id}/delivery?format=csv`,
                )}
              >
                <Download /> CSV file
              </a>
              <a
                className="primary"
                href={apiDownloadUrl(
                  `/api/commerce/order-items/${deliveryOrder.id}/delivery?format=zip`,
                )}
              >
                <Download /> Download ZIP
              </a>
            </footer>
          </section>
        </div>
      ) : null}

      {editingProduct ? (
        <SellerProductEditor
          key={editingProduct.id}
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSaved={async (text) => {
            showMessage(text, "success");
            await load();
          }}
        />
      ) : null}

      {open ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Create product"
        >
          <form
            className="seller-product-form seller-pro-product-form"
            onSubmit={create}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="section-index">NEW PRODUCT</span>
            <h2>Create a smooth, buyer-friendly listing.</h2>
            <p className="modal-helper">
              Follow the path from market category to platform and then listing
              type.
            </p>
            <div className="seller-flow-steps">
              <span className={form.categoryPathIds[0] ? "done" : "active"}>
                <b>1</b>Category
              </span>
              <span
                className={
                  form.categoryPathIds[1]
                    ? "done"
                    : form.categoryPathIds[0]
                      ? "active"
                      : ""
                }
              >
                <b>2</b>Subcategory
              </span>
              <span
                className={
                  selectedCategoryId &&
                  !categoryLevels[form.categoryPathIds.length]?.length
                    ? "done"
                    : ""
                }
              >
                <b>3</b>Product details
              </span>
            </div>
            <label
              className={`seller-image-picker ${coverPreview ? "has-preview" : ""}`}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Product preview" />
              ) : (
                <ImagePlus size={34} />
              )}
              <span>Clear product image *</span>
              <input
                required
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0])}
              />
              <small>
                {coverImage ? coverImage.name : "JPEG, PNG, or WebP · max 8 MB"}
              </small>
            </label>
            <section className="seller-category-flow">
              <header>
                <CheckCircle2 />
                <div>
                  <strong>Predefined category path</strong>
                  <small>
                    {selectedPath.length
                      ? selectedPath.join(" → ")
                      : "Choose where this product belongs"}
                  </small>
                </div>
              </header>
              <div className="form-grid three">
                {categoryLevels.map((choices, depth) => (
                  <label
                    key={`${depth}-${form.categoryPathIds[depth - 1] ?? "root"}`}
                  >
                    <span>
                      {depth + 1}.{" "}
                      {depth === 0
                        ? "Main category"
                        : depth === 1
                          ? "Subcategory"
                          : depth === 2
                            ? "Product / game"
                            : `Level ${depth + 1}`}
                    </span>
                    <select
                      required
                      value={form.categoryPathIds[depth] ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          categoryPathIds: [
                            ...form.categoryPathIds.slice(0, depth),
                            event.target.value,
                          ].filter(Boolean),
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
            {dynamicAttributes.length ? (
              <section className="seller-auto-attributes">
                <header>
                  <Sparkles />
                  <div>
                    <strong>Auto-generated product attributes</strong>
                    <small>
                      These options are based on the selected marketplace
                      department.
                    </small>
                  </div>
                </header>
                <div className="form-grid three">
                  {dynamicAttributes.map((attribute) => (
                    <label key={attribute.key}>
                      <span>
                        {attribute.label}
                        {attribute.optional ? " (optional)" : ""}
                      </span>
                      <select
                        required={!attribute.optional}
                        value={form.productAttributes[attribute.key] ?? ""}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            productAttributes: {
                              ...form.productAttributes,
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
            <section className="seller-multilingual-sequence seller-create-language-sequence">
              <header>
                <Globe2 />
                <div>
                  <strong>Multilingual listing and SEO</strong>
                  <small>
                    Enter each field in English, Chinese, and Russian together.
                  </small>
                </div>
                <button
                  type="button"
                  className="seller-translate-button"
                  disabled={translatingListing}
                  onClick={() => void translateListing()}
                >
                  <Globe2 />
                  {translatingListing
                    ? "Translating…"
                    : "Translate English to Chinese & Russian"}
                </button>
              </header>
              <section>
                <h3>
                  <b>1</b> Product titles
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>English title</span>
                    <input
                      required
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      placeholder="Clear, searchable product title"
                    />
                  </label>
                  <label>
                    <span>中文标题</span>
                    <input
                      required
                      value={form.chineseTitle}
                      onChange={(event) =>
                        setForm({ ...form, chineseTitle: event.target.value })
                      }
                      placeholder="中文产品标题"
                    />
                  </label>
                  <label>
                    <span>Русское название</span>
                    <input
                      required
                      value={form.russianTitle}
                      onChange={(event) =>
                        setForm({ ...form, russianTitle: event.target.value })
                      }
                      placeholder="Название товара"
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>2</b> Short descriptions
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>English short description</span>
                    <textarea
                      required
                      rows={3}
                      value={form.shortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          shortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>中文简短描述</span>
                    <textarea
                      required
                      rows={3}
                      value={form.chineseShortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseShortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Краткое описание</span>
                    <textarea
                      required
                      rows={3}
                      value={form.russianShortDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianShortDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>3</b> Full descriptions
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>English full description</span>
                    <textarea
                      required
                      rows={6}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>中文完整描述</span>
                    <textarea
                      required
                      rows={6}
                      value={form.chineseDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Полное описание</span>
                    <textarea
                      required
                      rows={6}
                      value={form.russianDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianDescription: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>4</b> Prices
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>USD price ($)</span>
                    <input
                      required
                      type="number"
                      min="0.50"
                      step="0.01"
                      value={form.priceUsd}
                      onChange={(event) => {
                        const priceUsd = event.target.value;
                        setForm({
                          ...form,
                          priceUsd,
                          ...convertedSellerPrices(priceUsd),
                        });
                      }}
                    />
                  </label>
                  <label>
                    <span>Chinese yuan price (¥)</span>
                    <input
                      required
                      readOnly
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.priceCny}
                      onChange={(event) =>
                        setForm({ ...form, priceCny: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Russian ruble price (₽)</span>
                    <input
                      required
                      readOnly
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.priceRub}
                      onChange={(event) =>
                        setForm({ ...form, priceRub: event.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>
                  <b>5</b> SEO titles
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>English SEO title</span>
                    <input
                      value={form.name}
                      readOnly
                      aria-describedby="seo-title-generated-note"
                    />
                  </label>
                  <label>
                    <span>中文 SEO 标题</span>
                    <input
                      value={form.chineseSeoTitle}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseSeoTitle: event.target.value,
                        })
                      }
                      placeholder="留空则自动生成"
                    />
                  </label>
                  <label>
                    <span>Русский SEO-заголовок</span>
                    <input
                      value={form.russianSeoTitle}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianSeoTitle: event.target.value,
                        })
                      }
                      placeholder="Оставьте пустым для автогенерации"
                    />
                  </label>
                </div>
                <small id="seo-title-generated-note">
                  English SEO metadata is generated from the English title and
                  short description. Empty Chinese or Russian SEO fields are
                  generated automatically.
                </small>
              </section>
              <section>
                <h3>
                  <b>6</b> SEO meta descriptions
                </h3>
                <div className="form-grid three">
                  <label>
                    <span>English meta description</span>
                    <textarea rows={3} value={form.shortDescription} readOnly />
                  </label>
                  <label>
                    <span>中文 SEO 描述</span>
                    <textarea
                      rows={3}
                      value={form.chineseSeoDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chineseSeoDescription: event.target.value,
                        })
                      }
                      placeholder="留空则自动生成"
                    />
                  </label>
                  <label>
                    <span>Русское метаописание</span>
                    <textarea
                      rows={3}
                      value={form.russianSeoDescription}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          russianSeoDescription: event.target.value,
                        })
                      }
                      placeholder="Оставьте пустым для автогенерации"
                    />
                  </label>
                </div>
              </section>
            </section>
            <section className="seller-create-essentials">
              <header>
                <Tag />
                <div>
                  <strong>Product setup and delivery</strong>
                  <small>
                    Stock is counted automatically from the inventory rows.
                  </small>
                </div>
              </header>
              <div className="form-grid three">
                <label>
                  <span>Product type</span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm({ ...form, type: event.target.value })
                    }
                  >
                    <option value="DOWNLOAD">Digital product</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </label>
                <label>
                  <span>Delivery method</span>
                  <select
                    value={form.deliveryMethod}
                    onChange={(event) =>
                      setForm({ ...form, deliveryMethod: event.target.value })
                    }
                  >
                    <option>Manual delivery</option>
                    <option>Instant delivery</option>
                    <option>Automatic delivery</option>
                    <option>Digital download</option>
                    <option>Seller service</option>
                  </select>
                </label>
              </div>
            </section>
            <section className="seller-bulk-inventory">
              <header>
                <Layers3 />
                <div>
                  <strong>Delivery inventory</strong>
                  <small>
                    Paste one account, code, or deliverable per row, or import a
                    TXT/CSV file.
                  </small>
                </div>
                <b>{inventoryRows(form.inventoryLines).length} rows</b>
              </header>
              <textarea
                rows={8}
                value={form.inventoryLines}
                onChange={(event) =>
                  setForm({ ...form, inventoryLines: event.target.value })
                }
                placeholder={
                  "account@email.com | password\ncode-or-deliverable-2\ncode-or-deliverable-3"
                }
              />
              <div>
                <label className="secondary-button">
                  <FileUp /> Import TXT or CSV
                  <input
                    type="file"
                    accept=".txt,.csv,text/plain,text/csv"
                    onChange={(event) => {
                      void importInventoryFile(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <small>
                  Empty rows are ignored and duplicate rows are removed during
                  file import.
                </small>
              </div>
            </section>
            {showLegacyAdvancedOptions() ? (
              <details className="seller-create-advanced">
                <summary>
                  <SlidersHorizontal />
                  <span>
                    <strong>Advanced options</strong>
                    <small>
                      Optional pricing, inventory, SEO, and searchable details
                    </small>
                  </span>
                  <ChevronDown />
                </summary>
                <div className="seller-create-advanced-body">
                  <section>
                    <h3>Pricing and inventory</h3>
                    <div className="form-grid three">
                      <label>
                        <span>Sale price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.salePrice}
                          onChange={(event) =>
                            setForm({ ...form, salePrice: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>Wholesale price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.wholesalePrice}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              wholesalePrice: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Discount %</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.discountPercent}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              discountPercent: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>SKU</span>
                        <input
                          value={form.sku}
                          onChange={(event) =>
                            setForm({ ...form, sku: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>Min / max order</span>
                        <span className="seller-inline-inputs">
                          <input
                            type="number"
                            min={1}
                            value={form.minimumOrder}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                minimumOrder: Number(event.target.value),
                              })
                            }
                          />
                          <input
                            type="number"
                            min={1}
                            value={form.maximumOrder}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                maximumOrder: Number(event.target.value),
                              })
                            }
                          />
                        </span>
                      </label>
                      <label>
                        <span>Tags</span>
                        <input
                          value={form.tags}
                          onChange={(event) =>
                            setForm({ ...form, tags: event.target.value })
                          }
                          placeholder="popular, instant, premium"
                        />
                      </label>
                      <label>
                        <span>After-sales hours</span>
                        <input
                          type="number"
                          min={12}
                          max={8760}
                          value={form.afterSalesServiceHours}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              afterSalesServiceHours: Number(
                                event.target.value,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  </section>
                  <section>
                    <h3>Searchable specifications</h3>
                    <div className="form-grid three">
                      {(
                        [
                          ["brand", "Brand"],
                          ["platform", "Platform"],
                          ["region", "Region"],
                          ["country", "Country"],
                          ["server", "Server"],
                          ["language", "Language"],
                          ["productKind", "Product type"],
                          ["condition", "Condition"],
                          ["stockType", "Stock type"],
                          ["duration", "Duration"],
                          ["warranty", "Warranty"],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key}>
                          <span>{label}</span>
                          <input
                            value={form[key]}
                            onChange={(event) =>
                              setForm({ ...form, [key]: event.target.value })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3>Fulfillment</h3>
                    <div className="seller-option-toggles">
                      <label>
                        <input
                          type="checkbox"
                          checked={form.instantDelivery}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              instantDelivery: event.target.checked,
                            })
                          }
                        />{" "}
                        Instant delivery
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.manualDelivery}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              manualDelivery: event.target.checked,
                            })
                          }
                        />{" "}
                        Manual delivery
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.digitalDownload}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              digitalDownload: event.target.checked,
                            })
                          }
                        />{" "}
                        Digital download
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={form.couponSupport}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              couponSupport: event.target.checked,
                            })
                          }
                        />{" "}
                        Coupons supported
                      </label>
                    </div>
                    <label>
                      <span>Buyer delivery note</span>
                      <textarea
                        rows={3}
                        value={form.deliveryNote}
                        onChange={(event) =>
                          setForm({ ...form, deliveryNote: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Refund policy</span>
                      <textarea
                        rows={3}
                        value={form.refundPolicy}
                        onChange={(event) =>
                          setForm({ ...form, refundPolicy: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Digital inventory rows</span>
                      <textarea
                        rows={5}
                        placeholder="One license, code, or deliverable per line. You can also add these later."
                        value={form.inventoryLines}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            inventoryLines: event.target.value,
                          })
                        }
                      />
                    </label>
                  </section>
                </div>
              </details>
            ) : null}
            <button
              className="primary-button seller-submit-product"
              disabled={busy}
            >
              <PackagePlus />{" "}
              {busy
                ? "Creating product…"
                : "Create product and send for review"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
