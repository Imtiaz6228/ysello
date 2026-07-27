export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  parentSlug?: string | null;
  parentId?: string | null;
  icon: string;
  sortOrder?: number;
  productCount?: number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  isFeatured?: boolean;
  isTrending?: boolean;
  depth?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  category: string;
  categorySlug: string;
  title: string;
  description: string;
  longDescription: string;
  seller: string;
  sellerSlug: string;
  priceCents: number;
  priceCnyCents?: number;
  priceRubCents?: number;
  afterSalesServiceHours?: number;
  rating: number;
  reviews: number;
  sales: string;
  delivery: string;
  badge: string;
  type: "DOWNLOAD" | "SERVICE";
  icon: string;
  imageUrl?: string | null;
  stockCount?: number;
  included?: string[];
  license?: string;
  formats?: string[];
  version?: string;
  updatedAt?: string;
  publishedAt?: string | null;
  galleryUrls?: string[];
  videoUrl?: string | null;
  attributes?: Record<string, unknown>;
  facts?: Record<string, string | number | boolean | null>;
  warranty?: string | null;
  refundPolicy?: string | null;
  salePriceCents?: number | null;
  minimumOrder?: number;
  maximumOrder?: number | null;
  sku?: string | null;
  tags?: string[];
  verifiedReviews?: Array<{
    id: string;
    rating: number;
    body: string;
    createdAt: string;
    buyerName: string;
  }>;
};

const legacyCatalogCategories: CatalogCategory[] = [
  {
    id: "cat-instagram",
    slug: "instagram",
    name: "Instagram",
    description:
      "Creator-safe Instagram templates, profile resources, content planners, and reporting tools. Accounts, credentials, bots, and fake engagement are not allowed.",
    icon: "◉",
    sortOrder: 10,
  },
  {
    id: "cat-instagram-reels",
    slug: "instagram-reels-templates",
    parentSlug: "instagram",
    name: "Reels templates",
    description:
      "Short-form video structures, hooks, captions, and edit checklists for original Reels.",
    icon: "◉",
    sortOrder: 11,
  },
  {
    id: "cat-instagram-captions",
    slug: "instagram-caption-packs",
    parentSlug: "instagram",
    name: "Caption packs",
    description:
      "Niche caption prompts, launch calendars, and brand voice worksheets.",
    icon: "◉",
    sortOrder: 12,
  },
  {
    id: "cat-instagram-profile",
    slug: "instagram-profile-audits",
    parentSlug: "instagram",
    name: "Profile audits",
    description:
      "Seller-delivered reviews and action plans for legitimate creator profiles.",
    icon: "◉",
    sortOrder: 13,
  },
  {
    id: "cat-threads",
    slug: "threads-content-planners",
    parentSlug: "instagram",
    name: "Threads planners",
    description:
      "Conversation prompts, editorial calendars, and launch templates for Threads.",
    icon: "@",
    sortOrder: 14,
  },

  {
    id: "cat-facebook",
    slug: "facebook",
    name: "Facebook",
    description:
      "Facebook page, group, creative, and ad-planning assets for legitimate brands and communities.",
    icon: "f",
    sortOrder: 20,
  },
  {
    id: "cat-facebook-page",
    slug: "facebook-page-kits",
    parentSlug: "facebook",
    name: "Page kits",
    description:
      "Page setup checklists, posting systems, and community management templates.",
    icon: "f",
    sortOrder: 21,
  },
  {
    id: "cat-facebook-ads",
    slug: "facebook-ad-creative",
    parentSlug: "facebook",
    name: "Ad creative",
    description:
      "Ad copy, storyboard, UTM, and compliant creative testing resources.",
    icon: "f",
    sortOrder: 22,
  },
  {
    id: "cat-facebook-groups",
    slug: "facebook-group-resources",
    parentSlug: "facebook",
    name: "Group resources",
    description:
      "Moderation rules, welcome sequences, and engagement calendars for owned communities.",
    icon: "f",
    sortOrder: 23,
  },

  {
    id: "cat-twitter",
    slug: "twitter",
    name: "Twitter / X",
    description:
      "Content systems, launch threads, analytics trackers, and brand voice resources for X.",
    icon: "𝕏",
    sortOrder: 30,
  },
  {
    id: "cat-twitter-threads",
    slug: "x-thread-playbooks",
    parentSlug: "twitter",
    name: "Thread playbooks",
    description: "Reusable narrative outlines and launch thread frameworks.",
    icon: "𝕏",
    sortOrder: 31,
  },
  {
    id: "cat-twitter-analytics",
    slug: "x-analytics-trackers",
    parentSlug: "twitter",
    name: "Analytics trackers",
    description:
      "Spreadsheet dashboards and review systems for organic publishing.",
    icon: "𝕏",
    sortOrder: 32,
  },

  {
    id: "cat-discord",
    slug: "discord",
    name: "Discord",
    description:
      "Server design assets, moderation workflows, onboarding kits, and community templates.",
    icon: "☯",
    sortOrder: 40,
  },
  {
    id: "cat-discord-server",
    slug: "discord-server-kits",
    parentSlug: "discord",
    name: "Server kits",
    description: "Channel maps, rules, role plans, and onboarding copy.",
    icon: "☯",
    sortOrder: 41,
  },
  {
    id: "cat-discord-mod",
    slug: "discord-moderation-workflows",
    parentSlug: "discord",
    name: "Moderation workflows",
    description: "Ticket, escalation, and community safety workflows.",
    icon: "☯",
    sortOrder: 42,
  },

  {
    id: "cat-telegram",
    slug: "telegram",
    name: "Telegram",
    description:
      "Channel publishing resources, bot-safe workflows, announcement templates, and moderation materials.",
    icon: "✈",
    sortOrder: 50,
  },
  {
    id: "cat-telegram-channel",
    slug: "telegram-channel-kits",
    parentSlug: "telegram",
    name: "Channel kits",
    description:
      "Launch calendars, broadcast templates, and audience update systems.",
    icon: "✈",
    sortOrder: 51,
  },
  {
    id: "cat-telegram-support",
    slug: "telegram-support-workflows",
    parentSlug: "telegram",
    name: "Support workflows",
    description:
      "FAQ scripts and support triage systems for Telegram communities.",
    icon: "✈",
    sortOrder: 52,
  },

  {
    id: "cat-tiktok",
    slug: "tiktok",
    name: "TikTok",
    description:
      "TikTok planning systems, edit packs, caption frameworks, and analytics resources.",
    icon: "♪",
    sortOrder: 60,
  },
  {
    id: "cat-tiktok-hooks",
    slug: "tiktok-hook-libraries",
    parentSlug: "tiktok",
    name: "Hook libraries",
    description:
      "Opening lines, shot plans, and storyboard prompts for original videos.",
    icon: "♪",
    sortOrder: 61,
  },
  {
    id: "cat-tiktok-edit",
    slug: "tiktok-editing-assets",
    parentSlug: "tiktok",
    name: "Editing assets",
    description:
      "Transitions, overlays, shot lists, and reusable editing checklists.",
    icon: "♪",
    sortOrder: 62,
  },

  {
    id: "cat-google",
    slug: "google-series",
    name: "Google series",
    description:
      "Workspace templates, Sheets dashboards, Docs systems, and operational playbooks.",
    icon: "G",
    sortOrder: 70,
  },
  {
    id: "cat-google-sheets",
    slug: "google-sheets-dashboards",
    parentSlug: "google-series",
    name: "Sheets dashboards",
    description:
      "Editable dashboards for campaigns, content, finance, and ops.",
    icon: "G",
    sortOrder: 71,
  },
  {
    id: "cat-google-workspace",
    slug: "google-workspace-systems",
    parentSlug: "google-series",
    name: "Workspace systems",
    description: "Docs, Drive, Calendar, and admin workflows for teams.",
    icon: "G",
    sortOrder: 72,
  },

  {
    id: "cat-ai",
    slug: "ai-workflows",
    name: "AI workflows",
    description:
      "Prompt systems, review checklists, and practical automations designed for responsible AI usage.",
    icon: "◎",
    sortOrder: 80,
  },
  {
    id: "cat-ai-prompts",
    slug: "ai-prompt-systems",
    parentSlug: "ai-workflows",
    name: "Prompt systems",
    description: "Reusable prompt frameworks with human review gates.",
    icon: "◎",
    sortOrder: 81,
  },
  {
    id: "cat-ai-ops",
    slug: "ai-operations-playbooks",
    parentSlug: "ai-workflows",
    name: "Operations playbooks",
    description: "Research, writing, support, and operations workflows.",
    icon: "◎",
    sortOrder: 82,
  },

  {
    id: "cat-email",
    slug: "email-account",
    name: "Email & newsletters",
    description:
      "Email templates, newsletter systems, deliverability education, and campaign calendars. Email accounts and harvested lists are prohibited.",
    icon: "✉",
    sortOrder: 90,
  },
  {
    id: "cat-email-campaign",
    slug: "email-campaign-templates",
    parentSlug: "email-account",
    name: "Campaign templates",
    description: "Welcome, launch, retention, and win-back email systems.",
    icon: "✉",
    sortOrder: 91,
  },
  {
    id: "cat-email-newsletter",
    slug: "newsletter-systems",
    parentSlug: "email-account",
    name: "Newsletter systems",
    description: "Editorial calendars, sponsor kits, and measurement trackers.",
    icon: "✉",
    sortOrder: 92,
  },
  {
    id: "cat-games",
    slug: "games-gaming",
    name: "Games & gaming",
    description:
      "Game guides, streaming overlays, server resources, UI packs, and creator assets. Game accounts, cheats, and exploits are prohibited.",
    icon: "◆",
    sortOrder: 100,
  },
  {
    id: "cat-game-guides",
    slug: "game-guides",
    parentSlug: "games-gaming",
    name: "Game guides",
    description:
      "Strategy guides, maps, progression planners, and achievement checklists.",
    icon: "◆",
    sortOrder: 101,
  },
  {
    id: "cat-streaming",
    slug: "streaming-overlays",
    parentSlug: "games-gaming",
    name: "Streaming overlays",
    description:
      "Broadcast overlays, panels, alerts, and channel identity kits.",
    icon: "◆",
    sortOrder: 102,
  },
  {
    id: "cat-game-servers",
    slug: "game-server-resources",
    parentSlug: "games-gaming",
    name: "Server resources",
    description:
      "Rules, onboarding flows, event templates, and legitimate community assets.",
    icon: "◆",
    sortOrder: 103,
  },

  {
    id: "cat-software",
    slug: "software-apps",
    name: "Software & apps",
    description:
      "Productivity apps, developer utilities, plugins, and licensed software tools from verified publishers.",
    icon: "▣",
    sortOrder: 110,
  },
  {
    id: "cat-productivity",
    slug: "productivity-apps",
    parentSlug: "software-apps",
    name: "Productivity apps",
    description:
      "Task, planning, writing, and organization tools for individuals and teams.",
    icon: "▣",
    sortOrder: 111,
  },
  {
    id: "cat-developer-tools",
    slug: "developer-tools",
    parentSlug: "software-apps",
    name: "Developer tools",
    description:
      "Utilities, extensions, boilerplates, and testing resources for software teams.",
    icon: "▣",
    sortOrder: 112,
  },
  {
    id: "cat-plugins",
    slug: "plugins-extensions",
    parentSlug: "software-apps",
    name: "Plugins & extensions",
    description:
      "Licensed add-ons for creative, business, and development workflows.",
    icon: "▣",
    sortOrder: 113,
  },

  {
    id: "cat-design",
    slug: "design-creative",
    name: "Design & creative",
    description:
      "Templates, fonts, graphics, brand systems, icons, and presentation resources for professional creators.",
    icon: "✦",
    sortOrder: 120,
  },
  {
    id: "cat-design-templates",
    slug: "design-templates",
    parentSlug: "design-creative",
    name: "Design templates",
    description:
      "Editable social, print, presentation, and campaign templates.",
    icon: "✦",
    sortOrder: 121,
  },
  {
    id: "cat-fonts",
    slug: "fonts-typefaces",
    parentSlug: "design-creative",
    name: "Fonts & typefaces",
    description:
      "Original display, editorial, and interface type families with clear licenses.",
    icon: "Aa",
    sortOrder: 122,
  },
  {
    id: "cat-graphics",
    slug: "graphics-icons",
    parentSlug: "design-creative",
    name: "Graphics & icons",
    description:
      "Illustrations, icon families, textures, mockup scenes, and brand elements.",
    icon: "✦",
    sortOrder: 123,
  },

  {
    id: "cat-code",
    slug: "websites-code",
    name: "Websites & code",
    description:
      "Website themes, UI components, code templates, and documented starter projects.",
    icon: "</>",
    sortOrder: 130,
  },
  {
    id: "cat-themes",
    slug: "website-themes",
    parentSlug: "websites-code",
    name: "Website themes",
    description:
      "Responsive landing pages, stores, portfolios, and content site themes.",
    icon: "</>",
    sortOrder: 131,
  },
  {
    id: "cat-components",
    slug: "ui-components",
    parentSlug: "websites-code",
    name: "UI components",
    description:
      "Accessible interface components, dashboards, and design-system building blocks.",
    icon: "</>",
    sortOrder: 132,
  },
  {
    id: "cat-code-starters",
    slug: "code-starters",
    parentSlug: "websites-code",
    name: "Code starters",
    description: "Documented starter repositories for web and app development.",
    icon: "</>",
    sortOrder: 133,
  },

  {
    id: "cat-video",
    slug: "video-motion",
    name: "Video & motion",
    description:
      "Video templates, motion graphics, transitions, title packs, and production resources.",
    icon: "▶",
    sortOrder: 140,
  },
  {
    id: "cat-video-templates",
    slug: "video-templates",
    parentSlug: "video-motion",
    name: "Video templates",
    description:
      "Editable intros, explainers, promos, reels, and presentation scenes.",
    icon: "▶",
    sortOrder: 141,
  },
  {
    id: "cat-motion",
    slug: "motion-graphics",
    parentSlug: "video-motion",
    name: "Motion graphics",
    description:
      "Transitions, lower thirds, animated icons, and visual effects packs.",
    icon: "▶",
    sortOrder: 142,
  },

  {
    id: "cat-audio",
    slug: "audio-music",
    name: "Audio & music",
    description:
      "Licensed music loops, sound effects, podcast assets, and audio production templates.",
    icon: "♫",
    sortOrder: 150,
  },
  {
    id: "cat-music",
    slug: "music-loops",
    parentSlug: "audio-music",
    name: "Music & loops",
    description:
      "Original loops, beds, stingers, and royalty-cleared music packs.",
    icon: "♫",
    sortOrder: 151,
  },
  {
    id: "cat-sfx",
    slug: "sound-effects",
    parentSlug: "audio-music",
    name: "Sound effects",
    description:
      "Interface, cinematic, ambient, and production sound libraries.",
    icon: "♫",
    sortOrder: 152,
  },

  {
    id: "cat-business",
    slug: "business-finance",
    name: "Business & finance",
    description:
      "Business plans, finance models, operations systems, and ecommerce resources.",
    icon: "▰",
    sortOrder: 160,
  },
  {
    id: "cat-finance-models",
    slug: "finance-models",
    parentSlug: "business-finance",
    name: "Finance models",
    description: "Budget, forecasting, pricing, and reporting workbooks.",
    icon: "▰",
    sortOrder: 161,
  },
  {
    id: "cat-ecommerce",
    slug: "ecommerce-kits",
    parentSlug: "business-finance",
    name: "Ecommerce kits",
    description:
      "Store operations, merchandising, support, and launch playbooks.",
    icon: "▰",
    sortOrder: 162,
  },

  {
    id: "cat-education",
    slug: "education-learning",
    name: "Education & learning",
    description:
      "Courses, study guides, worksheets, teaching resources, and skill-building materials.",
    icon: "◇",
    sortOrder: 170,
  },
  {
    id: "cat-courses",
    slug: "online-courses",
    parentSlug: "education-learning",
    name: "Online courses",
    description:
      "Structured lessons, exercises, and project-based learning resources.",
    icon: "◇",
    sortOrder: 171,
  },
  {
    id: "cat-study",
    slug: "study-guides",
    parentSlug: "education-learning",
    name: "Study guides",
    description:
      "Revision notes, practice materials, and exam-planning systems.",
    icon: "◇",
    sortOrder: 172,
  },

  {
    id: "cat-3d",
    slug: "3d-print",
    name: "3D & print",
    description:
      "Original 3D models, printable files, scenes, materials, and fabrication resources.",
    icon: "⬡",
    sortOrder: 180,
  },
  {
    id: "cat-3d-models",
    slug: "3d-models",
    parentSlug: "3d-print",
    name: "3D models",
    description:
      "Production-ready props, product scenes, and visualization assets.",
    icon: "⬡",
    sortOrder: 181,
  },
  {
    id: "cat-printables",
    slug: "printable-files",
    parentSlug: "3d-print",
    name: "Printable files",
    description:
      "STL and project files with clear printing and usage guidance.",
    icon: "⬡",
    sortOrder: 182,
  },

  {
    id: "cat-photo",
    slug: "photography",
    name: "Photography",
    description:
      "Presets, stock photography, lighting guides, and professional editing workflows.",
    icon: "◈",
    sortOrder: 190,
  },
  {
    id: "cat-presets",
    slug: "photo-presets",
    parentSlug: "photography",
    name: "Photo presets",
    description: "Color presets, profiles, and documented editing recipes.",
    icon: "◈",
    sortOrder: 191,
  },
  {
    id: "cat-stock-photo",
    slug: "stock-photography",
    parentSlug: "photography",
    name: "Stock photography",
    description: "Original themed image collections with commercial licensing.",
    icon: "◈",
    sortOrder: 192,
  },
];

export const catalogCategories: CatalogCategory[] = [
  ...new Map(
    legacyCatalogCategories.map((category) => [category.slug, category]),
  ).values(),
];

export const categoryDescriptions: Record<
  string,
  { name: string; description: string }
> = Object.fromEntries(
  catalogCategories.map((category) => [
    category.slug,
    { name: category.name, description: category.description },
  ]),
);

export const catalogProducts: CatalogProduct[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "instagram-reels-launch-kit",
    category: "Reels templates",
    categorySlug: "instagram-reels-templates",
    title: "Instagram Reels launch kit for creator brands",
    description:
      "Editable shot lists, hooks, captions, cover layouts, and a 30-day publishing calendar.",
    longDescription:
      "A practical Reels launch system for legitimate creators and brands. Includes reusable video outlines, caption prompts, visual checklists, and analytics review worksheets. No accounts, credentials, followers, or engagement are sold.",
    seller: "Northstar Studio",
    sellerSlug: "northstar-studio",
    priceCents: 1800,
    priceCnyCents: 12800,
    priceRubCents: 165000,
    afterSalesServiceHours: 24,
    rating: 4.9,
    reviews: 184,
    sales: "2.4k",
    delivery: "Instant download",
    badge: "Popular",
    type: "DOWNLOAD",
    icon: "◉",
    stockCount: 178,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "facebook-ad-creative-library",
    category: "Ad creative",
    categorySlug: "facebook-ad-creative",
    title: "Facebook ad creative testing library",
    description:
      "Copy angles, storyboards, UTM sheets, naming rules, and review checklists.",
    longDescription:
      "Plan and test compliant ad creative without starting from blank pages. The pack includes editable copy frameworks, storyboard cards, naming conventions, budget experiment notes, and reporting templates.",
    seller: "Growth Desk",
    sellerSlug: "growth-desk",
    priceCents: 2400,
    priceCnyCents: 17200,
    priceRubCents: 220000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 96,
    sales: "1.3k",
    delivery: "Instant download",
    badge: "Bestseller",
    type: "DOWNLOAD",
    icon: "f",
    stockCount: 92,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    slug: "ai-workflow-playbook-small-teams",
    category: "Operations playbooks",
    categorySlug: "ai-operations-playbooks",
    title: "AI workflow playbook for small teams",
    description:
      "Reusable prompt systems and human-review workflows for research, writing, and support.",
    longDescription:
      "A vendor-neutral playbook for using AI responsibly at work. Every workflow includes review gates, privacy notes, quality checks, and editable templates. This is educational content, not access to a third-party account.",
    seller: "Neural Desk",
    sellerSlug: "neural-desk",
    priceCents: 3200,
    priceCnyCents: 22900,
    priceRubCents: 295000,
    afterSalesServiceHours: 48,
    rating: 4.9,
    reviews: 211,
    sales: "3.8k",
    delivery: "Instant download",
    badge: "Trending",
    type: "DOWNLOAD",
    icon: "◎",
    stockCount: 64,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "discord-server-community-kit",
    category: "Server kits",
    categorySlug: "discord-server-kits",
    title: "Discord server launch and moderation kit",
    description:
      "Channel map, role structure, safety rules, welcome copy, and ticket workflows.",
    longDescription:
      "Launch a clean community server with reusable onboarding assets, moderation policies, escalation templates, and role planning worksheets. Built for creators, educators, and legitimate communities.",
    seller: "Community Forge",
    sellerSlug: "community-forge",
    priceCents: 2700,
    priceCnyCents: 19300,
    priceRubCents: 248000,
    afterSalesServiceHours: 36,
    rating: 4.7,
    reviews: 72,
    sales: "860",
    delivery: "Instant download",
    badge: "New",
    type: "DOWNLOAD",
    icon: "☯",
    stockCount: 39,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    slug: "tiktok-hook-library",
    category: "Hook libraries",
    categorySlug: "tiktok-hook-libraries",
    title: "TikTok hook and storyboard library",
    description:
      "300 original hooks, scene prompts, caption frameworks, and content calendar blocks.",
    longDescription:
      "A short-form content library for creating original videos. Includes hooks organized by intent, storyboard prompts, captions, reusable edit notes, and weekly review dashboards.",
    seller: "Clip Supply",
    sellerSlug: "clip-supply",
    priceCents: 2800,
    priceCnyCents: 20000,
    priceRubCents: 258000,
    afterSalesServiceHours: 24,
    rating: 5.0,
    reviews: 143,
    sales: "1.7k",
    delivery: "Instant download",
    badge: "Top rated",
    type: "DOWNLOAD",
    icon: "♪",
    stockCount: 53,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    slug: "instagram-profile-review-session",
    category: "Profile audits",
    categorySlug: "instagram-profile-audits",
    title: "60-minute Instagram profile review and action plan",
    description:
      "One-to-one review with written feedback, positioning notes, and a prioritized improvement plan.",
    longDescription:
      "Share your goals and current public profile before the session. Delivery happens in the protected order workspace, where you can message the seller and retain the final notes.",
    seller: "Studio Practice",
    sellerSlug: "studio-practice",
    priceCents: 6500,
    priceCnyCents: 46500,
    priceRubCents: 598000,
    afterSalesServiceHours: 72,
    rating: 4.9,
    reviews: 88,
    sales: "540",
    delivery: "2–3 business days",
    badge: "Service",
    type: "SERVICE",
    icon: "↗",
    stockCount: 8,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    slug: "telegram-channel-launch-calendar",
    category: "Channel kits",
    categorySlug: "telegram-channel-kits",
    title: "Telegram channel launch calendar",
    description:
      "Broadcast templates, announcement cadence, FAQ blocks, and community update scripts.",
    longDescription:
      "A channel launch toolkit focused on legitimate owned communities. Use it to schedule announcements, organize recurring updates, and keep support messages consistent.",
    seller: "Signal Studio",
    sellerSlug: "signal-studio",
    priceCents: 1600,
    priceCnyCents: 11400,
    priceRubCents: 147000,
    afterSalesServiceHours: 24,
    rating: 4.6,
    reviews: 61,
    sales: "710",
    delivery: "Instant download",
    badge: "Pinned",
    type: "DOWNLOAD",
    icon: "✈",
    stockCount: 210,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    slug: "google-sheets-content-dashboard",
    category: "Sheets dashboards",
    categorySlug: "google-sheets-dashboards",
    title: "Google Sheets content performance dashboard",
    description:
      "Editable campaign tracker with dashboards for cost, content output, and weekly review.",
    longDescription:
      "A flexible Google Sheets workbook with data-entry tabs, charts, weekly review prompts, and campaign health summaries. Works for social, newsletter, and paid creative workflows.",
    seller: "Ops Grid",
    sellerSlug: "ops-grid",
    priceCents: 2100,
    priceCnyCents: 15000,
    priceRubCents: 193000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 127,
    sales: "1.1k",
    delivery: "Instant download",
    badge: "Bundle",
    type: "DOWNLOAD",
    icon: "G",
    stockCount: 45,
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    slug: "newsletter-campaign-system",
    category: "Campaign templates",
    categorySlug: "email-campaign-templates",
    title: "Lifecycle email campaign library",
    description:
      "Conversion-focused welcome, launch, retention, and win-back email templates.",
    longDescription:
      "A practical library for legitimate opt-in email marketing. Includes editable copy frameworks, layout references, segmentation notes, and deliverability checklists. Customer lists and email accounts are never included.",
    seller: "Inbox Atelier",
    sellerSlug: "inbox-atelier",
    priceCents: 2400,
    priceCnyCents: 17200,
    priceRubCents: 220000,
    afterSalesServiceHours: 24,
    rating: 4.8,
    reviews: 96,
    sales: "1.3k",
    delivery: "Instant download",
    badge: "Bestseller",
    type: "DOWNLOAD",
    icon: "✉",
    stockCount: 120,
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    slug: "x-launch-thread-playbook",
    category: "Thread playbooks",
    categorySlug: "x-thread-playbooks",
    title: "X launch thread playbook",
    description:
      "Thread outlines, launch sequences, idea prompts, and a post-publication review sheet.",
    longDescription:
      "Build stronger launch threads from reusable structures. Includes narrative arcs, call-to-action variants, ethical disclosure reminders, and analytics review templates.",
    seller: "Narrative Lab",
    sellerSlug: "narrative-lab",
    priceCents: 1900,
    priceCnyCents: 13600,
    priceRubCents: 175000,
    afterSalesServiceHours: 24,
    rating: 4.7,
    reviews: 58,
    sales: "490",
    delivery: "Instant download",
    badge: "Sponsored",
    type: "DOWNLOAD",
    icon: "𝕏",
    stockCount: 37,
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    slug: "streamer-identity-overlay-pack",
    category: "Streaming overlays",
    categorySlug: "streaming-overlays",
    title: "Streamer identity and overlay system",
    description:
      "A cohesive broadcast pack with overlays, alerts, panels, and setup notes for major streaming tools.",
    longDescription:
      "Build a consistent channel without assembling mismatched assets. The pack includes editable scenes, notification layouts, panels, offline screens, and a practical setup guide.",
    seller: "Pixel Arena",
    sellerSlug: "pixel-arena",
    priceCents: 2900,
    rating: 4.8,
    reviews: 64,
    sales: "680",
    delivery: "Instant download",
    badge: "Creator pick",
    type: "DOWNLOAD",
    icon: "◆",
    stockCount: 86,
    included: [
      "12 broadcast scenes",
      "Alert and panel library",
      "OBS setup guide",
    ],
    license: "Commercial creator license",
    formats: ["PSD", "PNG", "WEBM"],
    version: "2.1",
    updatedAt: "July 2026",
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    slug: "focusdesk-productivity-app",
    category: "Productivity apps",
    categorySlug: "productivity-apps",
    title: "FocusDesk personal productivity workspace",
    description:
      "A lightweight desktop planning system for projects, habits, notes, and weekly reviews.",
    longDescription:
      "Organize work in one distraction-free workspace. Includes local-first project planning, recurring review templates, keyboard navigation, and exportable backups.",
    seller: "Clearframe Labs",
    sellerSlug: "clearframe-labs",
    priceCents: 3900,
    rating: 4.7,
    reviews: 118,
    sales: "1.2k",
    delivery: "Instant license delivery",
    badge: "New release",
    type: "DOWNLOAD",
    icon: "▣",
    stockCount: 240,
    included: ["Desktop app", "One year of updates", "Quick-start workspace"],
    license: "Single-user commercial license",
    formats: ["Windows", "macOS"],
    version: "1.4",
    updatedAt: "July 2026",
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    slug: "editorial-brand-template-suite",
    category: "Design templates",
    categorySlug: "design-templates",
    title: "Editorial brand template suite",
    description:
      "A refined identity system with social templates, pitch layouts, launch graphics, and usage guidance.",
    longDescription:
      "Create an editorial visual language across social, presentations, and campaigns. Every layout uses editable grids, reusable styles, and accessible color guidance.",
    seller: "Form & Field",
    sellerSlug: "form-field",
    priceCents: 4800,
    rating: 4.9,
    reviews: 204,
    sales: "2.6k",
    delivery: "Instant download",
    badge: "Bestseller",
    type: "DOWNLOAD",
    icon: "✦",
    stockCount: 92,
    included: [
      "80 social layouts",
      "24 presentation slides",
      "Brand usage guide",
    ],
    license: "Extended commercial license",
    formats: ["FIG", "PPTX", "PNG"],
    version: "3.0",
    updatedAt: "June 2026",
  },
  {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    slug: "saas-dashboard-component-library",
    category: "UI components",
    categorySlug: "ui-components",
    title: "SaaS dashboard component library",
    description:
      "Accessible React components for analytics, onboarding, settings, billing, and team management.",
    longDescription:
      "A documented component library for modern SaaS products. Includes responsive layouts, semantic states, keyboard interactions, tokenized themes, and implementation examples.",
    seller: "Interface Foundry",
    sellerSlug: "interface-foundry",
    priceCents: 5900,
    rating: 4.9,
    reviews: 156,
    sales: "1.9k",
    delivery: "Instant repository access",
    badge: "Developer pick",
    type: "DOWNLOAD",
    icon: "</>",
    stockCount: 110,
    included: ["64 React components", "Design tokens", "Implementation guide"],
    license: "Unlimited projects license",
    formats: ["TSX", "CSS", "FIG"],
    version: "4.2",
    updatedAt: "July 2026",
  },
  {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    slug: "product-launch-motion-toolkit",
    category: "Motion graphics",
    categorySlug: "motion-graphics",
    title: "Product launch motion toolkit",
    description:
      "Modular motion scenes, titles, transitions, and social cutdowns for product announcements.",
    longDescription:
      "Produce a polished launch film with modular, editable motion assets. The toolkit includes timing guidance, typography scenes, product reveals, and platform-specific exports.",
    seller: "Motion District",
    sellerSlug: "motion-district",
    priceCents: 4400,
    rating: 4.8,
    reviews: 91,
    sales: "940",
    delivery: "Instant download",
    badge: "Trending",
    type: "DOWNLOAD",
    icon: "▶",
    stockCount: 51,
    included: ["36 motion scenes", "12 title systems", "Export presets"],
    license: "Commercial project license",
    formats: ["AEP", "MOGRT", "MP4"],
    version: "2.6",
    updatedAt: "May 2026",
  },
  {
    id: "10101010-1010-4010-8010-101010101010",
    slug: "cinematic-interface-sound-library",
    category: "Sound effects",
    categorySlug: "sound-effects",
    title: "Cinematic interface sound library",
    description:
      "A curated library of clean interface, transition, notification, and ambient production sounds.",
    longDescription:
      "Give apps, videos, and games a coherent audio language. Files are organized by intent, loudness-balanced, tagged, and supplied with a clear commercial license.",
    seller: "Signal & Tone",
    sellerSlug: "signal-tone",
    priceCents: 2200,
    rating: 4.7,
    reviews: 83,
    sales: "760",
    delivery: "Instant download",
    badge: "Audio pick",
    type: "DOWNLOAD",
    icon: "♫",
    stockCount: 133,
    included: ["420 WAV files", "Searchable cue sheet", "Loudness guide"],
    license: "Royalty-free commercial license",
    formats: ["WAV", "MP3"],
    version: "1.8",
    updatedAt: "April 2026",
  },
  {
    id: "20202020-2020-4020-8020-202020202020",
    slug: "startup-financial-model-forecast",
    category: "Finance models",
    categorySlug: "finance-models",
    title: "Startup financial model and forecast",
    description:
      "A guided five-year model covering revenue, costs, hiring, cash flow, runway, and scenarios.",
    longDescription:
      "Build an investor-ready operating forecast from clear assumptions. The workbook includes scenario controls, charts, validation checks, and a plain-language setup guide.",
    seller: "Metric House",
    sellerSlug: "metric-house",
    priceCents: 3600,
    rating: 4.9,
    reviews: 132,
    sales: "1.5k",
    delivery: "Instant download",
    badge: "Business pick",
    type: "DOWNLOAD",
    icon: "▰",
    stockCount: 72,
    included: ["Five-year model", "Scenario dashboard", "Assumption guide"],
    license: "Single-business commercial license",
    formats: ["XLSX", "GSHEET"],
    version: "3.2",
    updatedAt: "July 2026",
  },
  {
    id: "30303030-3030-4030-8030-303030303030",
    slug: "ux-research-practical-course",
    category: "Online courses",
    categorySlug: "online-courses",
    title: "Practical UX research course",
    description:
      "A project-based course on interviews, usability testing, synthesis, and decision-ready research reports.",
    longDescription:
      "Learn a complete research workflow through short lessons and a realistic project. Includes scripts, templates, exercises, critique examples, and accessible captions.",
    seller: "Research Practice",
    sellerSlug: "research-practice",
    priceCents: 7200,
    rating: 4.9,
    reviews: 176,
    sales: "2.1k",
    delivery: "Immediate course access",
    badge: "Top course",
    type: "DOWNLOAD",
    icon: "◇",
    stockCount: 300,
    included: [
      "28 video lessons",
      "Project workbook",
      "Research template library",
    ],
    license: "Individual learning license",
    formats: ["MP4", "PDF", "DOCX"],
    version: "2026 edition",
    updatedAt: "July 2026",
  },
  {
    id: "40404040-4040-4040-8040-404040404040",
    slug: "modular-product-visualization-scenes",
    category: "3D models",
    categorySlug: "3d-models",
    title: "Modular product visualization scenes",
    description:
      "Studio-quality 3D scenes, materials, lights, and camera setups for product presentation.",
    longDescription:
      "Create consistent product visuals from modular studio scenes. Files include adjustable lighting, reusable materials, camera presets, and practical render notes.",
    seller: "Volume Studio",
    sellerSlug: "volume-studio",
    priceCents: 5200,
    rating: 4.8,
    reviews: 69,
    sales: "620",
    delivery: "Instant download",
    badge: "3D pick",
    type: "DOWNLOAD",
    icon: "⬡",
    stockCount: 45,
    included: ["14 studio scenes", "32 materials", "Lighting handbook"],
    license: "Commercial render license",
    formats: ["BLEND", "FBX", "OBJ"],
    version: "2.0",
    updatedAt: "June 2026",
  },
  {
    id: "50505050-5050-4050-8050-505050505050",
    slug: "editorial-lightroom-preset-collection",
    category: "Photo presets",
    categorySlug: "photo-presets",
    title: "Editorial Lightroom preset collection",
    description:
      "A balanced set of editorial color recipes for portraits, travel, products, and low-light work.",
    longDescription:
      "Develop a recognizable photographic style while keeping skin tones natural. Includes desktop and mobile presets, profile notes, before-and-after references, and adjustment guidance.",
    seller: "Northlight Archive",
    sellerSlug: "northlight-archive",
    priceCents: 2600,
    rating: 4.8,
    reviews: 147,
    sales: "1.8k",
    delivery: "Instant download",
    badge: "Photographer pick",
    type: "DOWNLOAD",
    icon: "◈",
    stockCount: 180,
    included: ["42 desktop presets", "42 mobile presets", "Editing handbook"],
    license: "Commercial photography license",
    formats: ["XMP", "DNG", "PDF"],
    version: "4.1",
    updatedAt: "July 2026",
  },
];
