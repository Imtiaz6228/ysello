export type MarketplaceTaxonomyNode = {
  slug: string;
  name: string;
  description: string;
  children?: MarketplaceTaxonomyNode[];
};

export type MarketplaceTaxonomyItem = {
  slug: string;
  name: string;
  description: string;
  accent: "blue" | "purple" | "orange" | "emerald" | "rose" | "cyan";
  icon: string;
  subcategories: MarketplaceTaxonomyNode[];
};

const nodes = (
  description: string,
  items: Array<[string, string]>,
): MarketplaceTaxonomyNode[] =>
  items.map(([slug, name]) => ({ slug, name, description }));

export const marketplaceTaxonomy: MarketplaceTaxonomyItem[] = [
  {
    slug: "gaming",
    name: "Gaming",
    description:
      "PC and console games, add-ons, memberships, top-ups and gaming currencies.",
    accent: "blue",
    icon: "GAME",
    subcategories: [
      {
        slug: "games-by-platform",
        name: "By platform",
        description: "Find games for your preferred storefront or console.",
        children: nodes("Games and digital products for this platform.", [
          ["steam-games", "Steam"],
          ["xbox-live-games", "Xbox Live"],
          ["playstation-games", "PlayStation"],
          ["nintendo-eshop-games", "Nintendo eShop"],
          ["ea-app-games", "EA App"],
          ["gog-games", "GOG"],
          ["ubisoft-connect-games", "Ubisoft Connect"],
          ["epic-games", "Epic Games"],
          ["battle-net-games", "Battle.net"],
        ]),
      },
      {
        slug: "games-by-genre",
        name: "By genre",
        description: "Browse the styles of games you enjoy most.",
        children: nodes("Popular games in this genre.", [
          ["rpg-games", "RPG"],
          ["adventure-games", "Adventure"],
          ["action-shooting-games", "Action & shooting"],
          ["sports-games", "Sports"],
          ["fighting-games", "Fighting"],
          ["strategy-games", "Strategy"],
          ["simulation-games", "Simulator"],
          ["racing-games", "Racing"],
          ["indie-games", "Indie"],
        ]),
      },
      {
        slug: "games-by-device",
        name: "By device",
        description: "Products matched to the device you play on.",
        children: nodes("Compatible games and digital products.", [
          ["pc-gaming", "PC"],
          ["xbox-gaming", "Xbox"],
          ["playstation-gaming", "PlayStation"],
          ["nintendo-gaming", "Nintendo"],
          ["android-gaming", "Android"],
          ["ios-gaming", "iOS"],
        ]),
      },
      {
        slug: "new-game-releases",
        name: "New releases",
        description: "Recently released games and upcoming launches.",
        children: nodes("New and upcoming gaming releases.", [
          ["new-pc-games", "New PC games"],
          ["new-console-games", "New console games"],
          ["preorder-games", "Preorders"],
          ["early-access-games", "Early access"],
        ]),
      },
      {
        slug: "game-dlcs",
        name: "DLCs",
        description: "Expansions, season passes and additional game content.",
        children: nodes("Downloadable content for supported games.", [
          ["story-dlcs", "Story expansions"],
          ["season-passes", "Season passes"],
          ["extra-game-content", "Extra content"],
        ]),
      },
      {
        slug: "gaming-gift-cards",
        name: "Gaming gift cards",
        description: "Wallet codes and gaming credit from supported brands.",
        children: nodes("Digital gaming credit and wallet codes.", [
          ["steam-gift-cards", "Steam"],
          ["playstation-gift-cards", "PlayStation"],
          ["xbox-gift-cards", "Xbox"],
          ["nintendo-gift-cards", "Nintendo eShop"],
          ["blizzard-gift-cards", "Blizzard"],
          ["razer-gold-gift-cards", "Razer Gold"],
          ["valorant-gift-cards", "Valorant"],
          ["league-of-legends-gift-cards", "League of Legends"],
          ["roblox-gift-cards", "Roblox"],
        ]),
      },
      {
        slug: "gaming-subscriptions",
        name: "Gaming subscriptions",
        description: "Memberships for games, consoles and online communities.",
        children: nodes("Gaming membership and subscription plans.", [
          ["xbox-game-pass", "Xbox Game Pass"],
          ["playstation-plus", "PlayStation Plus"],
          ["nintendo-switch-online", "Nintendo Switch Online"],
          ["ea-play", "EA Play"],
          ["world-of-warcraft-subscription", "World of Warcraft"],
          ["discord-nitro", "Discord Nitro"],
          ["final-fantasy-xiv-subscription", "Final Fantasy XIV"],
        ]),
      },
      {
        slug: "mobile-game-topups",
        name: "Mobile game top-ups",
        description: "Fast credit for popular mobile games.",
        children: nodes("Top-up credit for supported mobile games.", [
          ["mobile-legends-topup", "Mobile Legends"],
          ["pubg-mobile-topup", "PUBG Mobile"],
          ["fortnite-topup", "Fortnite"],
          ["honkai-star-rail-topup", "Honkai: Star Rail"],
          ["marvel-rivals-topup", "Marvel Rivals"],
          ["where-winds-meet-topup", "Where Winds Meet"],
        ]),
      },
      {
        slug: "gaming-currencies",
        name: "Currencies and points",
        description: "Official points, coins and wallet currencies.",
        children: nodes("Digital points and game currency.", [
          ["fc-points", "FC Points"],
          ["gta-online-currency", "GTA Online"],
          ["roblox-robux", "Roblox"],
          ["fortnite-vbucks", "Fortnite V-Bucks"],
          ["minecraft-coins", "Minecraft"],
          ["path-of-exile-points", "Path of Exile"],
          ["valorant-points", "Valorant Points"],
        ]),
      },
    ],
  },
  {
    slug: "software",
    name: "Software",
    description:
      "Productivity, creative, security and operating-system software with clear delivery terms.",
    accent: "cyan",
    icon: "SOFT",
    subcategories: [
      {
        slug: "creative-software",
        name: "Image, video and audio",
        description: "Creative production tools for every workflow.",
        children: nodes("Creative software and production tools.", [
          ["image-photo-editing", "Image & photo editing"],
          ["video-editing-software", "Video editing"],
          ["audio-editing-software", "Sound editing & recording"],
          ["animation-software", "Animation"],
          ["streaming-software", "Streaming tools"],
        ]),
      },
      {
        slug: "office-business-software",
        name: "Office and business",
        description: "Tools for documents, planning and business operations.",
        children: nodes("Business and productivity software.", [
          ["office-suites", "Office suites"],
          ["project-management-software", "Project management"],
          ["presentation-software", "Presentation & visualization"],
          ["accounting-software", "Accounting"],
          ["remote-work-software", "Remote work"],
        ]),
      },
      {
        slug: "security-software",
        name: "Security",
        description: "Protection and privacy software for supported devices.",
        children: nodes("Security and privacy software.", [
          ["antivirus-software", "Antivirus"],
          ["vpn-software", "VPN"],
          ["password-managers", "Password managers"],
          ["backup-software", "Backup & recovery"],
        ]),
      },
      {
        slug: "software-tools",
        name: "Tools",
        description: "Utilities for maintenance, recovery and development.",
        children: nodes("Utilities and specialist software tools.", [
          ["driver-recovery-tools", "Drivers & recovery"],
          ["pc-maintenance-tools", "PC maintenance"],
          ["developer-tools", "Developer tools"],
          ["data-utilities", "Data utilities"],
          ["other-software-tools", "Other tools"],
        ]),
      },
      {
        slug: "operating-systems",
        name: "Operating systems",
        description: "Operating systems and related editions.",
        children: nodes("Operating-system products and editions.", [
          ["windows-11", "Windows 11"],
          ["windows-10", "Windows 10"],
          ["windows-server", "Windows Server"],
          ["operating-system-bundles", "OS bundles"],
        ]),
      },
    ],
  },
  {
    slug: "subscriptions",
    name: "Subscriptions",
    description:
      "Gaming, entertainment, AI, music and professional subscription plans.",
    accent: "purple",
    icon: "SUB",
    subcategories: [
      {
        slug: "subscription-gaming",
        name: "Gaming subscriptions",
        description: "Console and game membership plans.",
        children: nodes("Gaming subscription plans.", [
          ["subscription-xbox-game-pass", "Xbox Game Pass"],
          ["subscription-playstation-plus", "PlayStation Plus"],
          ["subscription-nintendo-online", "Nintendo Switch Online"],
          ["subscription-ea-play", "EA Play"],
          ["subscription-discord", "Discord Nitro"],
        ]),
      },
      {
        slug: "video-streaming-subscriptions",
        name: "Video streaming",
        description: "Plans for movies, series, sport and live streams.",
        children: nodes("Video and live-streaming subscriptions.", [
          ["netflix-subscription", "Netflix"],
          ["crunchyroll-subscription", "Crunchyroll"],
          ["disney-plus-subscription", "Disney+"],
          ["prime-video-subscription", "Prime Video"],
          ["apple-tv-subscription", "Apple TV+"],
          ["hbo-max-subscription", "HBO Max"],
          ["twitch-subscription", "Twitch"],
        ]),
      },
      {
        slug: "ai-subscriptions",
        name: "AI",
        description: "AI productivity and creative subscription plans.",
        children: nodes("AI and creator subscription plans.", [
          ["chatgpt-subscription", "ChatGPT"],
          ["perplexity-subscription", "Perplexity"],
          ["gemini-subscription", "Gemini"],
          ["claude-subscription", "Claude"],
          ["canva-subscription", "Canva"],
          ["cursor-subscription", "Cursor"],
        ]),
      },
      {
        slug: "music-subscriptions",
        name: "Music",
        description: "Music streaming and creator-audio memberships.",
        children: nodes("Music and audio subscription plans.", [
          ["spotify-subscription", "Spotify"],
          ["apple-music-subscription", "Apple Music"],
          ["tidal-subscription", "Tidal"],
          ["deezer-subscription", "Deezer"],
          ["splice-subscription", "Splice"],
        ]),
      },
      {
        slug: "social-subscriptions",
        name: "Social",
        description: "Premium social, community and professional plans.",
        children: nodes("Social and community subscription plans.", [
          ["linkedin-premium", "LinkedIn Premium"],
          ["snapchat-plus", "Snapchat+"],
          ["discord-community-subscription", "Discord"],
          ["creator-platform-subscriptions", "Creator platforms"],
        ]),
      },
      {
        slug: "learning-subscriptions",
        name: "Learning",
        description: "Professional and creative learning memberships.",
        children: nodes("Online learning subscription plans.", [
          ["technology-learning", "Technology"],
          ["business-learning", "Business"],
          ["language-learning", "Languages"],
          ["creative-learning", "Creative skills"],
        ]),
      },
    ],
  },
  {
    slug: "gift-cards",
    name: "Gift cards",
    description:
      "Digital gift cards for gaming, shopping, entertainment, mobile and everyday use.",
    accent: "orange",
    icon: "GIFT",
    subcategories: [
      {
        slug: "gift-card-gaming",
        name: "Gaming gift cards",
        description: "Wallet cards for leading gaming platforms.",
        children: nodes("Gaming wallet and gift cards.", [
          ["gift-card-steam", "Steam"],
          ["gift-card-playstation", "PlayStation"],
          ["gift-card-xbox", "Xbox"],
          ["gift-card-nintendo", "Nintendo"],
          ["gift-card-razer-gold", "Razer Gold"],
          ["gift-card-blizzard", "Blizzard"],
        ]),
      },
      {
        slug: "shopping-gift-cards",
        name: "Shopping",
        description: "Gift cards for popular online and retail stores.",
        children: nodes("Digital shopping gift cards.", [
          ["amazon-gift-cards", "Amazon"],
          ["apple-gift-cards", "Apple"],
          ["google-play-gift-cards", "Google Play"],
          ["ebay-gift-cards", "eBay"],
          ["nike-gift-cards", "Nike"],
          ["adidas-gift-cards", "Adidas"],
          ["zalando-gift-cards", "Zalando"],
        ]),
      },
      {
        slug: "mobile-recharges",
        name: "Mobile recharges",
        description: "Mobile credit and plan recharge products.",
        children: nodes("Mobile recharge credit.", [
          ["vodafone-recharge", "Vodafone"],
          ["orange-recharge", "Orange"],
          ["tmobile-recharge", "T-Mobile"],
          ["lycamobile-recharge", "Lycamobile"],
          ["lebara-recharge", "Lebara"],
        ]),
      },
      {
        slug: "travel-esim",
        name: "Travel eSIM",
        description: "Regional and global travel data plans.",
        children: nodes("Digital travel data plans.", [
          ["global-esim", "Global eSIM"],
          ["europe-esim", "Europe eSIM"],
          ["asia-esim", "Asia eSIM"],
          ["usa-esim", "USA eSIM"],
        ]),
      },
      {
        slug: "cash-gift-cards",
        name: "Cash gift cards",
        description: "Prepaid payment and cash-equivalent cards.",
        children: nodes("Digital prepaid payment cards.", [
          ["visa-prepaid", "Visa prepaid"],
          ["mastercard-prepaid", "Mastercard prepaid"],
          ["paypal-gift-cards", "PayPal"],
          ["cash-prepaid-cards", "Other prepaid cards"],
        ]),
      },
      {
        slug: "entertainment-gift-cards",
        name: "Entertainment",
        description: "Cards for streaming, music and digital content.",
        children: nodes("Entertainment gift cards.", [
          ["netflix-gift-cards", "Netflix"],
          ["spotify-gift-cards", "Spotify"],
          ["apple-music-gift-cards", "Apple Music"],
          ["twitch-gift-cards", "Twitch"],
        ]),
      },
    ],
  },
  {
    slug: "social-media",
    name: "Social media",
    description:
      "Legitimate creator assets, content systems and professional social-media services.",
    accent: "rose",
    icon: "SOC",
    subcategories: [
      {
        slug: "facebook-social-products",
        name: "Facebook",
        description: "Facebook marketplace products and account inventory.",
        children: nodes("Facebook products.", [
          ["facebook-accounts", "Accounts"],
        ]),
      },
      {
        slug: "instagram-creator-tools",
        name: "Instagram",
        description: "Templates and services for original Instagram content.",
        children: nodes("Creator-safe Instagram resources.", [
          ["instagram-accounts", "Accounts"],
          ["instagram-reels-templates", "Reels templates"],
          ["instagram-caption-packs", "Caption packs"],
          ["instagram-content-calendars", "Content calendars"],
          ["instagram-profile-audits", "Profile audits"],
        ]),
      },
      {
        slug: "threads-social-products",
        name: "Threads",
        description: "Threads marketplace products and account inventory.",
        children: nodes("Threads products.", [
          ["threads-accounts", "Accounts"],
        ]),
      },
      {
        slug: "x-social-products",
        name: "X / Twitter",
        description: "X marketplace products and account inventory.",
        children: nodes("X products.", [["x-accounts", "Accounts"]]),
      },
      {
        slug: "tiktok-creator-tools",
        name: "TikTok",
        description: "Content planning and production resources for TikTok.",
        children: nodes("Creator-safe TikTok resources.", [
          ["tiktok-accounts", "Accounts"],
          ["tiktok-hook-libraries", "Hook libraries"],
          ["tiktok-storyboards", "Video storyboards"],
          ["tiktok-content-calendars", "Content calendars"],
        ]),
      },
      {
        slug: "telegram-social-products",
        name: "Telegram",
        description: "Telegram marketplace products and account inventory.",
        children: nodes("Telegram products.", [
          ["telegram-accounts", "Accounts"],
        ]),
      },
      {
        slug: "discord-social-products",
        name: "Discord",
        description: "Discord marketplace products and account inventory.",
        children: nodes("Discord products.", [
          ["discord-accounts", "Accounts"],
        ]),
      },
      {
        slug: "snapchat-social-products",
        name: "Snapchat",
        description: "Snapchat marketplace products and account inventory.",
        children: nodes("Snapchat products.", [
          ["snapchat-accounts", "Accounts"],
        ]),
      },
      {
        slug: "whatsapp-social-products",
        name: "WhatsApp",
        description: "WhatsApp marketplace products and account inventory.",
        children: nodes("WhatsApp products.", [
          ["whatsapp-accounts", "Accounts"],
        ]),
      },
      {
        slug: "youtube-creator-tools",
        name: "YouTube",
        description: "Channel graphics, scripts and production systems.",
        children: nodes("YouTube creator resources.", [
          ["youtube-accounts", "Accounts"],
          ["youtube-thumbnail-templates", "Thumbnail templates"],
          ["youtube-script-systems", "Script systems"],
          ["youtube-channel-branding", "Channel branding"],
          ["youtube-editing-services", "Video editing services"],
        ]),
      },
      {
        slug: "streaming-creator-tools",
        name: "Twitch & streaming",
        description: "Broadcast graphics and channel-production resources.",
        children: nodes("Streaming creator resources.", [
          ["streaming-accounts", "Accounts"],
          ["streaming-overlays", "Streaming overlays"],
          ["stream-alert-packs", "Alert packs"],
          ["stream-channel-branding", "Channel branding"],
        ]),
      },
      {
        slug: "community-tools",
        name: "Community tools",
        description: "Legitimate resources for owned online communities.",
        children: nodes("Community planning and moderation resources.", [
          ["community-accounts", "Accounts"],
          ["discord-server-kits", "Discord server kits"],
          ["telegram-channel-kits", "Telegram channel kits"],
          ["community-moderation-tools", "Moderation systems"],
        ]),
      },
      {
        slug: "social-marketing-tools",
        name: "Social marketing",
        description: "Campaign planning and compliant creative systems.",
        children: nodes("Social marketing resources.", [
          ["social-marketing-accounts", "Accounts"],
          ["facebook-ad-creative", "Facebook ad creative"],
          ["linkedin-content-kits", "LinkedIn content kits"],
          ["x-thread-playbooks", "X thread playbooks"],
          ["social-reporting-dashboards", "Reporting dashboards"],
        ]),
      },
    ],
  },
  {
    slug: "outlet",
    name: "Outlet",
    description:
      "Limited-time bundles, lower-price picks and new marketplace promotions.",
    accent: "emerald",
    icon: "SALE",
    subcategories: [
      {
        slug: "outlet-by-price",
        name: "Shop by price",
        description: "Find digital products within your budget.",
        children: nodes("Marketplace deals by price.", [
          ["outlet-under-5", "Under $5"],
          ["outlet-under-10", "Under $10"],
          ["outlet-under-20", "Under $20"],
          ["outlet-under-50", "Under $50"],
        ]),
      },
      {
        slug: "outlet-deals",
        name: "Marketplace deals",
        description: "Curated promotions and product bundles.",
        children: nodes("Current marketplace promotions.", [
          ["outlet-bestsellers", "Bestseller deals"],
          ["outlet-bundles", "Bundles"],
          ["outlet-new-arrivals", "New arrivals"],
          ["outlet-weekly-deals", "Weekly deals"],
        ]),
      },
    ],
  },
];

function flattenNodes(
  items: MarketplaceTaxonomyNode[],
): MarketplaceTaxonomyNode[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenNodes(item.children) : []),
  ]);
}

export function flattenedTaxonomyNodes(category: MarketplaceTaxonomyItem) {
  return flattenNodes(category.subcategories);
}

export const marketplaceRootSlugs = new Set(
  marketplaceTaxonomy.map((category) => category.slug),
);

export const marketplaceTaxonomySlugs = new Set(
  marketplaceTaxonomy.flatMap((category) => [
    category.slug,
    ...flattenedTaxonomyNodes(category).map((node) => node.slug),
  ]),
);
