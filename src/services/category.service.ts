import { prisma } from "../lib/prisma.js";
import {
  marketplaceTaxonomy,
  type MarketplaceTaxonomyNode,
} from "../data/marketplaceTaxonomy.js";

export type DefaultCategory = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  parentSlug?: string;
  imageUrl?: string;
  bannerUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
};

const _legacyMarketplaceCategories: DefaultCategory[] = [
  {
    slug: "social-media",
    name: "Social media",
    description:
      "Creator-safe social media templates, calendars, profile assets, moderation workflows, and analytics tools. Account trading, fake engagement, bots, spam, and credentials are prohibited.",
    icon: "◉",
    sortOrder: 10,
  },
  {
    slug: "instagram",
    parentSlug: "social-media",
    name: "Instagram",
    description:
      "Instagram content templates, Reels planning packs, caption systems, profile audit worksheets, and reporting dashboards.",
    icon: "◉",
    sortOrder: 11,
  },
  {
    slug: "facebook",
    parentSlug: "social-media",
    name: "Facebook",
    description:
      "Facebook page kits, group resources, ad creative planning, and community management templates for legitimate brands.",
    icon: "f",
    sortOrder: 12,
  },
  {
    slug: "twitter-x",
    parentSlug: "social-media",
    name: "Twitter / X",
    description:
      "Thread playbooks, post calendars, analytics trackers, launch templates, and brand voice systems for X.",
    icon: "𝕏",
    sortOrder: 13,
  },
  {
    slug: "tiktok",
    parentSlug: "social-media",
    name: "TikTok",
    description:
      "TikTok hook libraries, storyboard packs, editing checklists, caption frameworks, and publishing calendars.",
    icon: "♪",
    sortOrder: 14,
  },
  {
    slug: "youtube",
    parentSlug: "social-media",
    name: "YouTube",
    description:
      "YouTube channel assets, thumbnail templates, video scripts, Shorts workflows, and analytics review systems.",
    icon: "▶",
    sortOrder: 15,
  },
  {
    slug: "discord",
    parentSlug: "social-media",
    name: "Discord",
    description:
      "Discord server kits, role plans, moderation workflows, onboarding copy, and support-ticket playbooks.",
    icon: "☯",
    sortOrder: 16,
  },
  {
    slug: "telegram",
    parentSlug: "social-media",
    name: "Telegram",
    description:
      "Telegram channel calendars, announcement packs, community moderation workflows, and support scripts.",
    icon: "✈",
    sortOrder: 17,
  },
  {
    slug: "linkedin",
    parentSlug: "social-media",
    name: "LinkedIn",
    description:
      "LinkedIn profile resources, company-page templates, thought leadership calendars, and B2B content systems.",
    icon: "in",
    sortOrder: 18,
  },
  {
    slug: "snapchat",
    parentSlug: "social-media",
    name: "Snapchat",
    description:
      "Snapchat creative planning kits, story prompts, AR campaign worksheets, and brand-safe publishing resources.",
    icon: "👻",
    sortOrder: 19,
  },
  {
    slug: "pinterest",
    parentSlug: "social-media",
    name: "Pinterest",
    description:
      "Pinterest pin templates, board planning, SEO worksheets, seasonal calendars, and analytics dashboards.",
    icon: "P",
    sortOrder: 20,
  },
  {
    slug: "reddit",
    parentSlug: "social-media",
    name: "Reddit",
    description:
      "Reddit community planning, moderation guides, launch checklists, and transparent campaign resources.",
    icon: "R",
    sortOrder: 21,
  },
  {
    slug: "twitch",
    parentSlug: "social-media",
    name: "Twitch",
    description:
      "Twitch stream overlays, schedule templates, channel point ideas, moderation docs, and sponsorship kits.",
    icon: "T",
    sortOrder: 22,
  },

  // Third-level listing types create the smooth Category → Platform → Type flow.
  // These describe legitimate digital assets/services; account credentials and account trading remain prohibited.
  ...[
    "instagram",
    "facebook",
    "tiktok",
    "twitter-x",
    "linkedin",
    "snapchat",
  ].flatMap((platformSlug, platformIndex) => [
    {
      slug: `${platformSlug}-new`,
      parentSlug: platformSlug,
      name: "Starter resources",
      description:
        "Original templates, setup services, and digital assets for starting or refreshing a legitimate presence on this platform.",
      icon: "N",
      sortOrder: 30 + platformIndex * 10,
    },
    {
      slug: `${platformSlug}-old`,
      parentSlug: platformSlug,
      name: "Established brand resources",
      description:
        "Content systems, mature brand assets, audits, and migration services for an existing legitimate brand presence.",
      icon: "O",
      sortOrder: 31 + platformIndex * 10,
    },
    {
      slug: `${platformSlug}-with-followers`,
      parentSlug: platformSlug,
      name: "Audience analytics",
      description:
        "Audience research, analytics, and content-planning resources for existing communities. Fake engagement and follower sales are prohibited.",
      icon: "A",
      sortOrder: 32 + platformIndex * 10,
    },
    {
      slug: `${platformSlug}-with-posts`,
      parentSlug: platformSlug,
      name: "Content packs",
      description:
        "Ready-to-customize content packs, post libraries, and publishing workflows for this platform.",
      icon: "P",
      sortOrder: 33 + platformIndex * 10,
    },
    {
      slug: `${platformSlug}-business`,
      parentSlug: platformSlug,
      name: "Business ready",
      description:
        "Business setup documentation, brand kits, moderation workflows, and lawful commercial resources for this platform.",
      icon: "B",
      sortOrder: 34 + platformIndex * 10,
    },
  ]),

  {
    slug: "email-services",
    name: "Email services",
    description:
      "Email templates, newsletter systems, deliverability education, campaign workflows, and integrations. Email accounts, harvested lists, spam tools, and credentials are prohibited.",
    icon: "✉",
    sortOrder: 100,
  },
  {
    slug: "gmail",
    parentSlug: "email-services",
    name: "Gmail",
    description:
      "Gmail and Google Workspace templates, inbox organization systems, filters, signatures, and training materials.",
    icon: "G",
    sortOrder: 101,
  },
  {
    slug: "outlook",
    parentSlug: "email-services",
    name: "Outlook / Microsoft mail",
    description:
      "Outlook templates, Microsoft 365 email workflows, calendar coordination systems, and mailbox organization resources.",
    icon: "O",
    sortOrder: 102,
  },
  {
    slug: "yahoo-mail",
    parentSlug: "email-services",
    name: "Yahoo Mail",
    description:
      "Yahoo Mail setup guides, templates, organization systems, and legitimate email productivity resources.",
    icon: "Y",
    sortOrder: 103,
  },
  {
    slug: "proton-mail",
    parentSlug: "email-services",
    name: "Proton Mail",
    description:
      "Privacy-first email workflows, templates, onboarding docs, and safe productivity resources for Proton Mail.",
    icon: "P",
    sortOrder: 104,
  },
  {
    slug: "zoho-mail",
    parentSlug: "email-services",
    name: "Zoho Mail",
    description:
      "Zoho Mail configuration guides, team templates, signatures, and inbox workflow packs.",
    icon: "Z",
    sortOrder: 105,
  },
  {
    slug: "mailchimp",
    parentSlug: "email-services",
    name: "Mailchimp",
    description:
      "Mailchimp campaign templates, automation maps, signup form copy, and reporting dashboards for opt-in audiences.",
    icon: "M",
    sortOrder: 106,
  },
  {
    slug: "sendgrid",
    parentSlug: "email-services",
    name: "SendGrid",
    description:
      "Transactional email templates, integration checklists, deliverability worksheets, and reporting helpers for SendGrid.",
    icon: "S",
    sortOrder: 107,
  },
  {
    slug: "brevo",
    parentSlug: "email-services",
    name: "Brevo",
    description:
      "Brevo marketing automation templates, opt-in campaign workflows, segmentation sheets, and compliance checklists.",
    icon: "B",
    sortOrder: 108,
  },
  {
    slug: "klaviyo",
    parentSlug: "email-services",
    name: "Klaviyo",
    description:
      "Klaviyo ecommerce flow templates, retention calendars, segmentation worksheets, and performance dashboards.",
    icon: "K",
    sortOrder: 109,
  },

  {
    slug: "games",
    name: "Games",
    description:
      "Game assets, guides, UI kits, mods where allowed, coaching sessions, and legitimate digital resources. Stolen accounts, cheats, exploits, and unauthorized keys are prohibited.",
    icon: "🎮",
    sortOrder: 200,
  },
  {
    slug: "pc-games-steam",
    parentSlug: "games",
    name: "PC games / Steam",
    description:
      "Steam and PC game resources, overlays, UI kits, asset packs, coaching, and allowed modding resources.",
    icon: "S",
    sortOrder: 201,
  },
  {
    slug: "epic-games",
    parentSlug: "games",
    name: "Epic Games",
    description:
      "Epic Games-compatible creative resources, guides, assets, and legitimate player support materials.",
    icon: "E",
    sortOrder: 202,
  },
  {
    slug: "playstation",
    parentSlug: "games",
    name: "PlayStation",
    description:
      "PlayStation guides, templates, coaching assets, overlays, and legal digital resources for console players.",
    icon: "PS",
    sortOrder: 203,
  },
  {
    slug: "xbox",
    parentSlug: "games",
    name: "Xbox",
    description:
      "Xbox guides, coaching resources, overlays, community assets, and legitimate digital gaming resources.",
    icon: "X",
    sortOrder: 204,
  },
  {
    slug: "nintendo",
    parentSlug: "games",
    name: "Nintendo",
    description:
      "Nintendo-friendly guides, stream assets, fan-safe resources, and allowed digital materials.",
    icon: "N",
    sortOrder: 205,
  },
  {
    slug: "roblox",
    parentSlug: "games",
    name: "Roblox",
    description:
      "Roblox development assets, UI kits, scripting education, thumbnails, and studio workflows. Accounts and Robux trading are not allowed.",
    icon: "R",
    sortOrder: 206,
  },
  {
    slug: "minecraft",
    parentSlug: "games",
    name: "Minecraft",
    description:
      "Minecraft builds, texture packs, server documents, datapacks, and allowed resource packs.",
    icon: "M",
    sortOrder: 207,
  },
  {
    slug: "fortnite",
    parentSlug: "games",
    name: "Fortnite",
    description:
      "Fortnite coaching documents, creative maps resources, overlays, thumbnails, and legitimate player guides.",
    icon: "F",
    sortOrder: 208,
  },
  {
    slug: "valorant",
    parentSlug: "games",
    name: "Valorant",
    description:
      "Valorant coaching, aim routines, VOD review templates, overlays, and training resources. Cheats and boosting are not allowed.",
    icon: "V",
    sortOrder: 209,
  },
  {
    slug: "pubg",
    parentSlug: "games",
    name: "PUBG",
    description:
      "PUBG training guides, sensitivity worksheets, overlays, stream packs, and strategy resources.",
    icon: "P",
    sortOrder: 210,
  },
  {
    slug: "free-fire",
    parentSlug: "games",
    name: "Free Fire",
    description:
      "Free Fire guides, coaching packs, thumbnails, overlays, and legitimate player resources.",
    icon: "FF",
    sortOrder: 211,
  },
  {
    slug: "league-of-legends",
    parentSlug: "games",
    name: "League of Legends",
    description:
      "League coaching resources, champion guides, VOD review sheets, overlays, and strategy packs.",
    icon: "LoL",
    sortOrder: 212,
  },
  {
    slug: "dota-2",
    parentSlug: "games",
    name: "Dota 2",
    description:
      "Dota 2 strategy guides, coaching templates, overlays, and replay review worksheets.",
    icon: "D2",
    sortOrder: 213,
  },
  {
    slug: "genshin-impact",
    parentSlug: "games",
    name: "Genshin Impact",
    description:
      "Genshin guides, planners, fan-safe resources, team-building worksheets, and content templates.",
    icon: "GI",
    sortOrder: 214,
  },
  {
    slug: "mobile-legends",
    parentSlug: "games",
    name: "Mobile Legends",
    description:
      "Mobile Legends guides, coaching documents, overlays, and team strategy resources.",
    icon: "ML",
    sortOrder: 215,
  },
  {
    slug: "ea-fc",
    parentSlug: "games",
    name: "EA FC / football games",
    description:
      "EA FC training guides, tactics sheets, overlays, thumbnails, and coaching resources.",
    icon: "FC",
    sortOrder: 216,
  },
  {
    slug: "gta",
    parentSlug: "games",
    name: "GTA",
    description:
      "GTA roleplay resources, server documents, UI packs, stream assets, and permitted creative resources.",
    icon: "GTA",
    sortOrder: 217,
  },

  {
    slug: "streaming-apps",
    name: "Streaming apps",
    description:
      "Streaming app templates, guides, setup workflows, watch-party resources, and creator assets. Account sharing, stolen subscriptions, and credentials are prohibited.",
    icon: "▶",
    sortOrder: 300,
  },
  {
    slug: "netflix",
    parentSlug: "streaming-apps",
    name: "Netflix",
    description:
      "Netflix watch-party resources, lawful guides, creative templates, and streaming-related organization tools.",
    icon: "N",
    sortOrder: 301,
  },
  {
    slug: "disney-plus",
    parentSlug: "streaming-apps",
    name: "Disney+",
    description:
      "Disney+ planning resources, watch-party templates, and lawful digital organization tools.",
    icon: "D+",
    sortOrder: 302,
  },
  {
    slug: "prime-video",
    parentSlug: "streaming-apps",
    name: "Prime Video",
    description:
      "Prime Video watch-list templates, lawful guides, and streaming organization resources.",
    icon: "PV",
    sortOrder: 303,
  },
  {
    slug: "hulu",
    parentSlug: "streaming-apps",
    name: "Hulu",
    description:
      "Hulu watch-list templates, lawful streaming resources, and entertainment planning tools.",
    icon: "H",
    sortOrder: 304,
  },
  {
    slug: "max",
    parentSlug: "streaming-apps",
    name: "Max",
    description:
      "Max watch-list resources, lawful guides, and streaming organization templates.",
    icon: "M",
    sortOrder: 305,
  },
  {
    slug: "apple-tv-plus",
    parentSlug: "streaming-apps",
    name: "Apple TV+",
    description:
      "Apple TV+ planning templates, lawful guides, and entertainment organization resources.",
    icon: "TV",
    sortOrder: 306,
  },
  {
    slug: "youtube-premium",
    parentSlug: "streaming-apps",
    name: "YouTube Premium",
    description:
      "YouTube Premium workflow guides, creator resources, lawful subscription planning, and account setup education.",
    icon: "YT",
    sortOrder: 307,
  },
  {
    slug: "spotify",
    parentSlug: "streaming-apps",
    name: "Spotify",
    description:
      "Spotify playlist templates, podcast planning kits, creator assets, and lawful music workflow resources.",
    icon: "♬",
    sortOrder: 308,
  },
  {
    slug: "twitch-streaming",
    parentSlug: "streaming-apps",
    name: "Twitch streaming",
    description:
      "Twitch stream setup packs, overlays, moderation docs, and channel growth resources.",
    icon: "T",
    sortOrder: 309,
  },

  {
    slug: "ai-platforms",
    name: "AI platforms",
    description:
      "Prompt systems, AI workflows, automation templates, evaluation sheets, and education for responsible AI usage. API keys, accounts, and bypass tools are prohibited.",
    icon: "◎",
    sortOrder: 400,
  },
  {
    slug: "chatgpt",
    parentSlug: "ai-platforms",
    name: "ChatGPT",
    description:
      "ChatGPT prompt systems, workflow packs, team playbooks, review checklists, and productivity templates.",
    icon: "AI",
    sortOrder: 401,
  },
  {
    slug: "openai-api",
    parentSlug: "ai-platforms",
    name: "OpenAI API",
    description:
      "OpenAI API project templates, prompt evaluation sheets, integration guides, and responsible deployment checklists.",
    icon: "OA",
    sortOrder: 402,
  },
  {
    slug: "claude",
    parentSlug: "ai-platforms",
    name: "Claude",
    description:
      "Claude prompt libraries, document workflows, research templates, and human review systems.",
    icon: "C",
    sortOrder: 403,
  },
  {
    slug: "gemini",
    parentSlug: "ai-platforms",
    name: "Gemini",
    description:
      "Gemini workflows, prompt packs, team templates, and research productivity resources.",
    icon: "G",
    sortOrder: 404,
  },
  {
    slug: "midjourney",
    parentSlug: "ai-platforms",
    name: "Midjourney",
    description:
      "Midjourney prompt packs, style boards, art direction templates, and production workflows.",
    icon: "MJ",
    sortOrder: 405,
  },
  {
    slug: "runway",
    parentSlug: "ai-platforms",
    name: "Runway",
    description:
      "Runway video workflows, storyboard templates, prompt systems, and production checklists.",
    icon: "R",
    sortOrder: 406,
  },
  {
    slug: "perplexity",
    parentSlug: "ai-platforms",
    name: "Perplexity",
    description:
      "Perplexity research workflows, citation checklists, knowledge-base templates, and briefing systems.",
    icon: "P",
    sortOrder: 407,
  },
  {
    slug: "elevenlabs",
    parentSlug: "ai-platforms",
    name: "ElevenLabs",
    description:
      "ElevenLabs voice workflow templates, production scripts, consent checklists, and audio project systems.",
    icon: "11",
    sortOrder: 408,
  },
  {
    slug: "hugging-face",
    parentSlug: "ai-platforms",
    name: "Hugging Face",
    description:
      "Hugging Face model evaluation templates, project docs, and deployment learning resources.",
    icon: "HF",
    sortOrder: 409,
  },
  {
    slug: "canva-ai",
    parentSlug: "ai-platforms",
    name: "Canva AI",
    description:
      "Canva AI design workflows, template prompts, brand kits, and production checklists.",
    icon: "CA",
    sortOrder: 410,
  },

  {
    slug: "subscription-platforms",
    name: "Subscription platforms",
    description:
      "Subscription app templates, onboarding docs, productivity systems, and lawful workflow resources. Shared accounts, stolen subscriptions, and credentials are prohibited.",
    icon: "★",
    sortOrder: 500,
  },
  {
    slug: "adobe",
    parentSlug: "subscription-platforms",
    name: "Adobe Creative Cloud",
    description:
      "Adobe templates, project workflows, Lightroom presets, Premiere packs, and legitimate creator resources.",
    icon: "A",
    sortOrder: 501,
  },
  {
    slug: "canva",
    parentSlug: "subscription-platforms",
    name: "Canva",
    description:
      "Canva templates, brand kits, social packs, presentation systems, and design workflows.",
    icon: "C",
    sortOrder: 502,
  },
  {
    slug: "notion",
    parentSlug: "subscription-platforms",
    name: "Notion",
    description:
      "Notion dashboards, databases, productivity operating systems, and team workspace templates.",
    icon: "N",
    sortOrder: 503,
  },
  {
    slug: "microsoft-365",
    parentSlug: "subscription-platforms",
    name: "Microsoft 365",
    description:
      "Microsoft 365 templates, Excel dashboards, Word systems, Teams workflows, and business productivity resources.",
    icon: "M",
    sortOrder: 504,
  },
  {
    slug: "google-workspace",
    parentSlug: "subscription-platforms",
    name: "Google Workspace",
    description:
      "Google Sheets dashboards, Docs systems, Drive workflows, Calendar templates, and admin playbooks.",
    icon: "G",
    sortOrder: 505,
  },
  {
    slug: "slack",
    parentSlug: "subscription-platforms",
    name: "Slack",
    description:
      "Slack onboarding packs, workflow templates, channel guides, and team communication systems.",
    icon: "S",
    sortOrder: 506,
  },
  {
    slug: "zoom",
    parentSlug: "subscription-platforms",
    name: "Zoom",
    description:
      "Zoom meeting templates, webinar checklists, facilitation packs, and remote work resources.",
    icon: "Z",
    sortOrder: 507,
  },
  {
    slug: "grammarly",
    parentSlug: "subscription-platforms",
    name: "Grammarly",
    description:
      "Writing workflows, editing checklists, style guides, and responsible Grammarly usage resources.",
    icon: "Gr",
    sortOrder: 508,
  },
  {
    slug: "vpn-tools",
    parentSlug: "subscription-platforms",
    name: "VPN tools",
    description:
      "VPN setup education, privacy checklists, and lawful security awareness resources.",
    icon: "VPN",
    sortOrder: 509,
  },
  {
    slug: "cloud-storage",
    parentSlug: "subscription-platforms",
    name: "Cloud storage",
    description:
      "Dropbox, iCloud, Google Drive, and OneDrive organization systems, naming standards, and backup workflows.",
    icon: "☁",
    sortOrder: 510,
  },
];

function taxonomyRows(
  nodes: MarketplaceTaxonomyNode[],
  parentSlug: string,
  icon: string,
  baseOrder: number,
  sequence: { value: number },
): DefaultCategory[] {
  return nodes.flatMap((node) => {
    sequence.value += 1;
    const row: DefaultCategory = {
      slug: node.slug,
      parentSlug,
      name: node.name,
      description: node.description,
      icon,
      sortOrder: baseOrder + sequence.value,
      seoTitle: `Buy ${node.name} digital products | Ysello`,
      seoDescription: node.description.slice(0, 170),
      isFeatured: false,
      isTrending: false,
    };
    return [
      row,
      ...(node.children
        ? taxonomyRows(node.children, node.slug, icon, baseOrder, sequence)
        : []),
    ];
  });
}

export const defaultMarketplaceCategories: DefaultCategory[] =
  marketplaceTaxonomy.flatMap((category, categoryIndex) => {
    const baseOrder = (categoryIndex + 1) * 10_000;
    const sequence = { value: 0 };
    return [
      {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: baseOrder,
        seoTitle: `Buy ${category.name} digital products | Ysello`,
        seoDescription: category.description.slice(0, 170),
        isFeatured: true,
        isTrending: categoryIndex < 4,
      },
      ...taxonomyRows(
        category.subcategories,
        category.slug,
        category.icon,
        baseOrder,
        sequence,
      ),
    ];
  });

let ensuredCategoriesAt = 0;

const retiredCategoryPrefixes = [
  "gaming",
  "social-media-marketplace",
  "email-accounts-marketplace",
  "ai-marketplace",
  "software-marketplace-proxy",
  "software-marketplace-rdp",
];

export async function ensureDefaultMarketplaceCategories(force = false) {
  const now = Date.now();
  if (!force && now - ensuredCategoriesAt < 60_000) return;
  ensuredCategoriesAt = now;

  await prisma.category.updateMany({
    where: {
      OR: retiredCategoryPrefixes.flatMap((slug) => [
        { slug },
        { slug: { startsWith: `${slug}-` } },
      ]),
    },
    data: { isActive: false },
  });

  const pending = [...defaultMarketplaceCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const bySlug = new Map<string, { id: string }>();
  let passes = 0;

  while (pending.length && passes < defaultMarketplaceCategories.length + 2) {
    passes += 1;
    let progressed = false;

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const category = pending[index];
      const parentId = category.parentSlug
        ? bySlug.get(category.parentSlug)?.id
        : undefined;
      if (category.parentSlug && !parentId) continue;

      const saved = await prisma.category.upsert({
        where: { slug: category.slug },
        create: {
          parentId: parentId ?? null,
          name: category.name,
          slug: category.slug,
          description: category.description,
          seoTitle: category.seoTitle ?? category.name,
          seoDescription:
            category.seoDescription ?? category.description.slice(0, 170),
          imageUrl: category.imageUrl ?? null,
          icon: category.icon,
          bannerUrl: category.bannerUrl ?? null,
          metaKeywords: category.metaKeywords ?? [],
          isFeatured: category.isFeatured ?? false,
          isTrending: category.isTrending ?? false,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        update: {
          parentId: parentId ?? null,
          name: category.name,
          description: category.description,
          seoTitle: category.seoTitle ?? category.name,
          seoDescription:
            category.seoDescription ?? category.description.slice(0, 170),
          imageUrl: category.imageUrl ?? null,
          icon: category.icon,
          bannerUrl: category.bannerUrl ?? null,
          metaKeywords: category.metaKeywords ?? [],
          isFeatured: category.isFeatured ?? false,
          isTrending: category.isTrending ?? false,
          sortOrder: category.sortOrder,
        },
        select: { id: true },
      });

      bySlug.set(category.slug, saved);
      pending.splice(index, 1);
      progressed = true;
    }

    if (!progressed) break;
  }
}
