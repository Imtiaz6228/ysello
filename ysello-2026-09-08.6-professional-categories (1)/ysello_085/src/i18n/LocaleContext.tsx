import { useLocation, useNavigate } from "react-router-dom";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type LocaleCode = "en" | "zh-CN" | "zh-TW" | "ru" | "vi";
export type CurrencyCode = "USD" | "CNY" | "TWD" | "RUB" | "VND" | "PKR";

export const languages: Array<{
  code: LocaleCode;
  label: string;
  native: string;
  flag: string;
}> = [
  { code: "en", label: "English", native: "English", flag: "🇺🇸" },
  {
    code: "zh-CN",
    label: "Simplified Chinese",
    native: "简体中文",
    flag: "🇨🇳",
  },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
];

export const currencies: Array<{
  code: CurrencyCode;
  label: string;
  symbol: string;
}> = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "RUB", label: "Russian Ruble", symbol: "₽" },
];

const copy: Record<LocaleCode, Record<string, string>> = {
  en: {
    explore: "Explore",
    protection: "Buyer protection",
    support: "Support",
    cart: "Cart",
    account: "My account",
    signIn: "Sign in",
    register: "Register",
    signOut: "Sign out",
    dashboard: "Dashboard",
    categories: "Categories",
    products: "Products",
    topSellers: "Top sellers",
    blog: "Blog",
    releases: "New releases",
    notes: "Field notes",
    sell: "Sell with us",
    sellOn: "Sell on Ysello",
    search: "Search products, sellers and categories…",
    browse: "Browse, filter, and buy.",
    allCategories: "All categories",
    inStock: "Show in-stock products only",
    viewAll: "View all",
    purchase: "Purchase",
    details: "View details",
    adminChat: "Chat with admin",
    aiSupport: "AI support",
    adminOnline: "Human admins available",
    language: "Language",
    currency: "Currency",
    save: "Apply preferences",
    homeEyebrow: "DIGITAL PRODUCTS · VERIFIED EXPERTS",
    homeTitleA: "Buy digital products.",
    homeTitleB: "Hire trusted experts.",
    homeIntro:
      "Compare clear listings from reviewed sellers, then purchase downloads or expert services with protected checkout, delivery records, and human support.",
    homeSearch: "Search products, services, or sellers",
    searchMarketplace: "Search marketplace",
    shopByCategory: "Shop by category",
    popularNow: "Popular right now",
    newArrivals: "New arrivals",
    menu: "Menu",
    close: "Close",
    campaignLabel: "Editor’s picks",
    campaignText: "Fresh digital tools, assets and services",
    campaignCta: "Explore marketplace",
    welcomeBack: "Welcome back",
    whatLooking: "What are you looking for?",
    homeHeroTitle: "Everything digital, ready for your next move.",
    homeHeroIntro:
      "Discover trusted software, creator assets, practical AI tools and expert services—with every detail clear before checkout.",
    shopMarketplace: "Shop marketplace",
    startSelling: "Start selling",
    verifiedSellers: "Verified sellers",
    fastDelivery: "Fast digital delivery",
    protectedCheckout: "Protected checkout",
    exploreDepartment: "Explore department",
    secureCheckout: "Secure checkout",
    addToCart: "Add to cart",
    unavailable: "Unavailable",
    buyerWallet: "Buyer wallet",
    sellerBalance: "Seller balance",
    pendingApproval: "Pending approval",
    awaitingProof: "Awaiting proof",
    buyOnline: "Buy online",
    productSeoSuffix:
      "Compare delivery, seller information, and buyer protection before checkout.",
    topupTitle: "Top up your balance",
    topupIntro:
      "Choose a supported crypto network, send payment, and submit your TXID and screenshot for admin approval.",
    transactionsTitle: "Wallet transactions",
    availableBalance: "Available buyer balance",
    availableSellerBalance: "Available seller balance",
    frozenEarnings: "Frozen seller earnings · releases after 72 hours",
    pendingWithdrawalReview: "Pending withdrawal review",
    topupTransactionIntro:
      "Review top-ups, payment history and approval status in one protected ledger.",
    topupStepNetwork: "Choose network",
    topupStepAmount: "Enter amount",
    topupStepPayment: "Send payment",
    topupStepProof: "Upload proof",
    topupStepApproval: "Admin approval",
    cryptoTopup: "Crypto top-up",
    cryptoTopupHelp:
      "Choose one network only. The verified destination address appears below.",
    selectedPaymentAddress: "Selected payment address",
    copyAddress: "Copy address",
    amountUsd: "Amount (USD)",
    createPayment: "Create payment",
    creatingPayment: "Creating…",
    topupFeeWarning:
      "Send only on the selected network. Network and exchange fees are paid by the buyer, so the receiving amount must match the requested credit.",
    withdrawFunds: "Withdraw funds",
    withdrawHelp:
      "Choose a network and wallet address. There is no additional platform withdrawal fee; the request completes after admin approval.",
    blockchainNetwork: "Blockchain / Network",
    walletAddress: "Wallet address",
    requestWithdrawal: "Request withdrawal",
    submitting: "Submitting…",
    paymentRequest: "Payment request",
    sendExactly: "Send exactly",
    awaitingPayment: "Awaiting payment",
    sendOnlyAddress: "Send only to this address",
    transactionId: "Transaction ID / TXID",
    uploadScreenshot: "Upload payment screenshot",
    proofFileRules: "JPEG, PNG or WebP · maximum 8 MB",
    approvalProofNote:
      "Admin verifies this proof. Approved funds are added to available balance automatically.",
    confirmPayment: "Confirm payment & submit proof",
    confirming: "Confirming…",
    auditableLedger: "Auditable ledger",
    balanceActivity: "Balance activity",
    separateBalances: "Buyer and seller balances are tracked separately",
  },
  "zh-CN": {
    explore: "探索",
    protection: "买家保障",
    support: "支持",
    cart: "购物车",
    account: "我的账户",
    signIn: "登录",
    register: "注册",
    signOut: "退出登录",
    dashboard: "控制面板",
    categories: "分类",
    products: "产品",
    topSellers: "优质卖家",
    blog: "博客",
    releases: "新品",
    notes: "指南",
    sell: "成为卖家",
    sellOn: "在 Ysello 销售",
    search: "搜索产品、卖家和分类…",
    browse: "浏览、筛选并购买。",
    allCategories: "全部分类",
    inStock: "仅显示有库存产品",
    viewAll: "查看全部",
    purchase: "购买",
    details: "查看详情",
    adminChat: "联系管理员",
    aiSupport: "AI 支持",
    adminOnline: "人工管理员在线",
    language: "语言",
    currency: "货币",
    save: "应用设置",
    homeEyebrow: "高品质数字商品市场",
    homeTitleA: "数字所需，",
    homeTitleB: "尽在可信平台。",
    homeIntro:
      "发现来自认证卖家的优质数字产品、工具和服务，从结账到交付全程受保护。",
    homeSearch: "您在寻找什么？",
    searchMarketplace: "搜索市场",
    shopByCategory: "按分类选购",
    popularNow: "当前热门",
    newArrivals: "最新上架",
    menu: "菜单",
    close: "关闭",
    campaignLabel: "编辑精选",
    campaignText: "最新数字工具、素材与专业服务",
    campaignCta: "探索市场",
    welcomeBack: "欢迎回来",
    whatLooking: "您在寻找什么？",
    homeHeroTitle: "数字所需，为下一步即刻就绪。",
    homeHeroIntro:
      "发现可信的软件、创作素材、实用 AI 工具与专业服务，结账前所有细节清晰可见。",
    shopMarketplace: "选购数字商品",
    startSelling: "开始销售",
    verifiedSellers: "认证卖家",
    fastDelivery: "快速数字交付",
    protectedCheckout: "受保护的结账",
    exploreDepartment: "探索分类",
    secureCheckout: "安全结账",
    addToCart: "加入购物车",
    unavailable: "暂不可用",
    buyerWallet: "买家钱包",
    sellerBalance: "卖家余额",
    pendingApproval: "等待管理员审批",
    awaitingProof: "等待付款凭证",
    buyOnline: "在线购买",
    productSeoSuffix: "结账前比较交付方式、卖家信息与买家保障。",
    topupTitle: "充值账户余额",
    topupIntro:
      "选择支持的加密网络，完成付款，并提交交易 ID 与截图等待管理员审批。",
    transactionsTitle: "钱包交易记录",
    availableBalance: "可用买家余额",
    availableSellerBalance: "可用卖家余额",
    frozenEarnings: "冻结的卖家收入 · 72 小时后解冻",
    pendingWithdrawalReview: "等待审核的提现",
    topupTransactionIntro: "在受保护的账本中查看充值、付款历史和审批状态。",
    topupStepNetwork: "选择网络",
    topupStepAmount: "输入金额",
    topupStepPayment: "发送付款",
    topupStepProof: "上传凭证",
    topupStepApproval: "管理员审批",
    cryptoTopup: "加密货币充值",
    cryptoTopupHelp: "仅选择一个网络。下方会显示经过验证的收款地址。",
    selectedPaymentAddress: "已选收款地址",
    copyAddress: "复制地址",
    amountUsd: "金额（美元）",
    createPayment: "创建付款",
    creatingPayment: "正在创建…",
    topupFeeWarning:
      "请仅通过所选网络付款。网络及交易所手续费由买家承担，实际到账金额必须与申请充值金额一致。",
    withdrawFunds: "提取资金",
    withdrawHelp:
      "选择网络并输入钱包地址。平台不收取额外提现费；管理员批准后提现完成。",
    blockchainNetwork: "区块链 / 网络",
    walletAddress: "钱包地址",
    requestWithdrawal: "申请提现",
    submitting: "正在提交…",
    paymentRequest: "付款申请",
    sendExactly: "请准确发送",
    awaitingPayment: "等待付款",
    sendOnlyAddress: "仅向此地址发送",
    transactionId: "交易 ID / TXID",
    uploadScreenshot: "上传付款截图",
    proofFileRules: "JPEG、PNG 或 WebP · 最大 8 MB",
    approvalProofNote: "管理员将核验此凭证。批准后资金会自动加入可用余额。",
    confirmPayment: "确认付款并提交凭证",
    confirming: "正在确认…",
    auditableLedger: "可审计账本",
    balanceActivity: "余额变动",
    separateBalances: "买家余额与卖家余额分开记录",
  },
  "zh-TW": {
    explore: "探索",
    protection: "買家保障",
    support: "支援",
    cart: "購物車",
    account: "我的帳戶",
    signIn: "登入",
    register: "註冊",
    signOut: "登出",
    dashboard: "控制台",
    categories: "分類",
    products: "產品",
    topSellers: "優質賣家",
    blog: "部落格",
    releases: "新品",
    notes: "指南",
    sell: "成為賣家",
    sellOn: "在 Ysello 銷售",
    search: "搜尋產品、賣家和分類…",
    browse: "瀏覽、篩選並購買。",
    allCategories: "所有分類",
    inStock: "只顯示有庫存產品",
    viewAll: "查看全部",
    purchase: "購買",
    details: "查看詳情",
    adminChat: "聯絡管理員",
    aiSupport: "AI 支援",
    adminOnline: "人工管理員在線",
    language: "語言",
    currency: "貨幣",
    save: "套用設定",
    homeEyebrow: "高品質數位商品市場",
    homeTitleA: "所有數位需求，",
    homeTitleB: "一個可信平台。",
    homeIntro:
      "探索認證賣家的優質數位產品、工具和服務，從結帳到交付全程受保護。",
    homeSearch: "您正在尋找什麼？",
    searchMarketplace: "搜尋市場",
    shopByCategory: "依分類選購",
    popularNow: "熱門商品",
    newArrivals: "最新上架",
    menu: "選單",
    close: "關閉",
  },
  ru: {
    explore: "Каталог",
    protection: "Защита покупателя",
    support: "Поддержка",
    cart: "Корзина",
    account: "Мой аккаунт",
    signIn: "Войти",
    register: "Регистрация",
    signOut: "Выйти",
    dashboard: "Панель",
    categories: "Категории",
    products: "Товары",
    topSellers: "Лучшие продавцы",
    blog: "Блог",
    releases: "Новинки",
    notes: "Гайды",
    sell: "Стать продавцом",
    sellOn: "Продавать на Ysello",
    search: "Поиск товаров, продавцов и категорий…",
    browse: "Ищите, фильтруйте и покупайте.",
    allCategories: "Все категории",
    inStock: "Только товары в наличии",
    viewAll: "Показать все",
    purchase: "Купить",
    details: "Подробнее",
    adminChat: "Чат с администратором",
    aiSupport: "AI-помощник",
    adminOnline: "Администраторы онлайн",
    language: "Язык",
    currency: "Валюта",
    save: "Применить",
    homeEyebrow: "ПРЕМИАЛЬНЫЙ ЦИФРОВОЙ МАРКЕТПЛЕЙС",
    homeTitleA: "Всё цифровое.",
    homeTitleB: "В одном надёжном месте.",
    homeIntro:
      "Откройте качественные цифровые товары, инструменты и услуги проверенных продавцов с защитой от оплаты до доставки.",
    homeSearch: "Что вы ищете?",
    searchMarketplace: "Найти",
    shopByCategory: "Покупки по категориям",
    popularNow: "Сейчас популярно",
    newArrivals: "Новинки",
    menu: "Меню",
    close: "Закрыть",
    campaignLabel: "Выбор редакции",
    campaignText: "Новые цифровые инструменты, материалы и услуги",
    campaignCta: "Открыть маркетплейс",
    welcomeBack: "С возвращением",
    whatLooking: "Что вы ищете?",
    homeHeroTitle: "Всё цифровое — для вашего следующего шага.",
    homeHeroIntro:
      "Надёжное ПО, материалы для авторов, AI-инструменты и услуги экспертов с понятными условиями до оплаты.",
    shopMarketplace: "Перейти к покупкам",
    startSelling: "Начать продавать",
    verifiedSellers: "Проверенные продавцы",
    fastDelivery: "Быстрая цифровая доставка",
    protectedCheckout: "Защищённая оплата",
    exploreDepartment: "Открыть категорию",
    secureCheckout: "Безопасная оплата",
    addToCart: "В корзину",
    unavailable: "Недоступно",
    buyerWallet: "Кошелёк покупателя",
    sellerBalance: "Баланс продавца",
    pendingApproval: "Ожидает одобрения",
    awaitingProof: "Ожидает подтверждения",
    buyOnline: "Купить онлайн",
    productSeoSuffix:
      "Сравните доставку, продавца и защиту покупателя до оплаты.",
    topupTitle: "Пополнить баланс",
    topupIntro:
      "Выберите поддерживаемую сеть, отправьте платёж и загрузите TXID со скриншотом для одобрения.",
    transactionsTitle: "Операции кошелька",
    availableBalance: "Доступный баланс покупателя",
    availableSellerBalance: "Доступный баланс продавца",
    frozenEarnings: "Замороженный доход · доступен через 72 часа",
    pendingWithdrawalReview: "Выводы на проверке",
    topupTransactionIntro:
      "Пополнения, платежи и статусы одобрения собраны в защищённом журнале.",
    topupStepNetwork: "Выберите сеть",
    topupStepAmount: "Введите сумму",
    topupStepPayment: "Отправьте платёж",
    topupStepProof: "Загрузите подтверждение",
    topupStepApproval: "Одобрение админа",
    cryptoTopup: "Пополнение криптовалютой",
    cryptoTopupHelp:
      "Выберите только одну сеть. Проверенный адрес появится ниже.",
    selectedPaymentAddress: "Выбранный адрес оплаты",
    copyAddress: "Копировать адрес",
    amountUsd: "Сумма (USD)",
    createPayment: "Создать платёж",
    creatingPayment: "Создание…",
    topupFeeWarning:
      "Отправляйте только в выбранной сети. Сетевые комиссии и комиссии биржи оплачивает покупатель; на адрес должна поступить полная сумма пополнения.",
    withdrawFunds: "Вывести средства",
    withdrawHelp:
      "Выберите сеть и адрес кошелька. Дополнительной комиссии платформы нет; вывод завершается после одобрения администратора.",
    blockchainNetwork: "Блокчейн / Сеть",
    walletAddress: "Адрес кошелька",
    requestWithdrawal: "Запросить вывод",
    submitting: "Отправка…",
    paymentRequest: "Запрос платежа",
    sendExactly: "Отправьте точно",
    awaitingPayment: "Ожидает оплаты",
    sendOnlyAddress: "Отправляйте только на этот адрес",
    transactionId: "ID транзакции / TXID",
    uploadScreenshot: "Загрузите скриншот оплаты",
    proofFileRules: "JPEG, PNG или WebP · до 8 МБ",
    approvalProofNote:
      "Администратор проверит подтверждение. После одобрения средства автоматически зачислятся на доступный баланс.",
    confirmPayment: "Подтвердить и отправить доказательство",
    confirming: "Подтверждение…",
    auditableLedger: "Проверяемый журнал",
    balanceActivity: "Операции по балансу",
    separateBalances: "Баланс покупателя и продавца учитываются отдельно",
  },
  vi: {
    explore: "Khám phá",
    protection: "Bảo vệ người mua",
    support: "Hỗ trợ",
    cart: "Giỏ hàng",
    account: "Tài khoản",
    signIn: "Đăng nhập",
    register: "Đăng ký",
    signOut: "Đăng xuất",
    dashboard: "Bảng điều khiển",
    categories: "Danh mục",
    products: "Sản phẩm",
    topSellers: "Người bán hàng đầu",
    blog: "Blog",
    releases: "Sản phẩm mới",
    notes: "Hướng dẫn",
    sell: "Trở thành người bán",
    sellOn: "Bán trên Ysello",
    search: "Tìm sản phẩm, người bán và danh mục…",
    browse: "Duyệt, lọc và mua.",
    allCategories: "Tất cả danh mục",
    inStock: "Chỉ hiện sản phẩm còn hàng",
    viewAll: "Xem tất cả",
    purchase: "Mua",
    details: "Xem chi tiết",
    adminChat: "Chat với quản trị viên",
    aiSupport: "Hỗ trợ AI",
    adminOnline: "Quản trị viên đang trực tuyến",
    language: "Ngôn ngữ",
    currency: "Tiền tệ",
    save: "Áp dụng",
    homeEyebrow: "CHỢ KỸ THUẬT SỐ CAO CẤP",
    homeTitleA: "Mọi thứ kỹ thuật số.",
    homeTitleB: "Một nơi đáng tin cậy.",
    homeIntro:
      "Khám phá sản phẩm, công cụ và dịch vụ kỹ thuật số chất lượng từ người bán đã xác minh, được bảo vệ từ thanh toán đến giao hàng.",
    homeSearch: "Bạn đang tìm gì?",
    searchMarketplace: "Tìm kiếm",
    shopByCategory: "Mua theo danh mục",
    popularNow: "Đang phổ biến",
    newArrivals: "Mới ra mắt",
    menu: "Menu",
    close: "Đóng",
  },
};

const usdRates: Record<CurrencyCode, number> = {
  USD: 1,
  CNY: 7.24,
  TWD: 32.6,
  RUB: 91.5,
  VND: 25400,
  PKR: 279.5,
};
const validLocales = new Set<LocaleCode>(languages.map((item) => item.code));
const validCurrencies = new Set<CurrencyCode>(
  currencies.map((item) => item.code),
);

type LocaleValue = {
  locale: LocaleCode;
  currency: CurrencyCode;
  setLocale: (locale: LocaleCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: string) => string;
  formatMoney: (usdCents: number) => string;
  formatProductMoney: (
    prices: {
      priceCents: number;
      priceCnyCents?: number;
      priceRubCents?: number;
    },
    quantity?: number,
  ) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);

function storedLocale(): LocaleCode {
  const queryLocale = new URLSearchParams(window.location.search).get(
    "lang",
  ) as LocaleCode | null;
  if (queryLocale && validLocales.has(queryLocale)) return queryLocale;
  const value = localStorage.getItem("ysello-locale") as LocaleCode | null;
  if (value && validLocales.has(value)) return value;

  // First-visit locale selection follows the visitor's browser languages.
  // We deliberately do not IP-redirect crawlers or users: each language keeps
  // its own crawlable URL and hreflang annotations for search engines.
  const browserLanguages = [
    ...(navigator.languages || []),
    navigator.language,
  ]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());
  if (browserLanguages.some((item) => item.startsWith("zh"))) return "zh-CN";
  if (browserLanguages.some((item) => item.startsWith("ru"))) return "ru";
  return "en";
}

function storedCurrency(): CurrencyCode {
  const value = localStorage.getItem("ysello-currency") as CurrencyCode | null;
  return value && validCurrencies.has(value) ? value : "USD";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(storedLocale);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get("lang") as LocaleCode | null;
    if (requested && validLocales.has(requested)) {
      setLocaleState(requested);
    } else if (locale !== "en") {
      params.set("lang", locale);
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
          hash: location.hash,
        },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, location.hash, navigate]);
  const [currency, setCurrencyState] = useState<CurrencyCode>(storedCurrency);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
    localStorage.setItem("ysello-locale", locale);
  }, [locale]);
  useEffect(() => {
    localStorage.setItem("ysello-currency", currency);
  }, [currency]);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      currency,
      // Each language defaults to its matching storefront currency; buyers can
      // still change currency independently afterward.
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        const preferredCurrency: Partial<Record<LocaleCode, CurrencyCode>> = {
          en: "USD",
          "zh-CN": "CNY",
          ru: "RUB",
        };
        const nextCurrency = preferredCurrency[nextLocale];
        if (nextCurrency) setCurrencyState(nextCurrency);
        const url = new URL(window.location.href);
        if (nextLocale === "en") url.searchParams.delete("lang");
        else url.searchParams.set("lang", nextLocale);
        navigate(`${url.pathname}${url.search}${url.hash}`, { replace: true });
      },
      setCurrency: setCurrencyState,
      t(key) {
        return copy[locale][key] ?? copy.en[key] ?? key;
      },
      formatMoney(usdCents) {
        const converted = (usdCents / 100) * usdRates[currency];
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: currency === "VND" ? 0 : 2,
        }).format(converted);
      },
      formatProductMoney(prices, quantity = 1) {
        const exactLocalizedCents =
          currency === "CNY" && (prices.priceCnyCents ?? 0) > 0
            ? prices.priceCnyCents!
            : currency === "RUB" && (prices.priceRubCents ?? 0) > 0
              ? prices.priceRubCents!
              : null;
        if (exactLocalizedCents !== null) {
          return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          }).format((exactLocalizedCents * quantity) / 100);
        }
        const converted =
          ((prices.priceCents * quantity) / 100) * usdRates[currency];
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: currency === "VND" ? 0 : 2,
        }).format(converted);
      },
    }),
    [currency, locale, navigate],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
