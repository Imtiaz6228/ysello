import type { IconType } from "react-icons";
import {
  FaYahoo,
  FaAndroid,
  FaApple,
  FaGamepad,
  FaGift,
  FaGoogle,
  FaHashtag,
  FaLinkedin,
  FaRedditAlien,
  FaSteam,
  FaSyncAlt,
  FaTags,
  FaWindows,
  FaXbox,
} from "react-icons/fa";
import {
  SiGmail,
  SiClaude,
  SiGooglegemini,
  SiNetflix,
  SiSpotify,
  SiProtonmail,
  SiVk,
  SiBattledotnet,
  SiDiscord,
  SiEa,
  SiEpicgames,
  SiFacebook,
  SiGogdotcom,
  SiInstagram,
  SiPinterest,
  SiPlaystation,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiUbisoft,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";

import { PiOpenAiLogo, PiMicrosoftOutlookLogoFill } from "react-icons/pi";

const categoryIcons: Record<string, IconType> = {
  gaming: FaGamepad,
  software: FaWindows,
  subscriptions: FaSyncAlt,
  "gift-cards": FaGift,
  "social-media": FaHashtag,
  outlet: FaTags,
};

const platformIcons: Record<string, IconType> = {
  facebook: SiFacebook,
  instagram: SiInstagram,
  threads: SiThreads,
  x: SiX,
  tiktok: SiTiktok,
  telegram: SiTelegram,
  discord: SiDiscord,
  snapchat: SiSnapchat,
  whatsapp: SiWhatsapp,
  youtube: SiYoutube,
  streaming: SiTwitch,
  linkedin: FaLinkedin,
  pinterest: SiPinterest,
  reddit: FaRedditAlien,
  google: FaGoogle,
  gmail: SiGmail,
  outlook: PiMicrosoftOutlookLogoFill,
  yahoo: FaYahoo,
  protonmail: SiProtonmail,
  chatgpt: PiOpenAiLogo,
  claude: SiClaude,
  gemini: SiGooglegemini,
  netflix: SiNetflix,
  spotify: SiSpotify,
  vk: SiVk,
  steam: FaSteam,
  xbox: FaXbox,
  "xbox-live": FaXbox,
  playstation: SiPlaystation,
  "epic-games": SiEpicgames,
  ea: SiEa,
  gog: SiGogdotcom,
  ubisoft: SiUbisoft,
  "battle-net": SiBattledotnet,
  windows: FaWindows,
  microsoft: FaWindows,
  apple: FaApple,
  android: FaAndroid,
};

const brandNames: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  x: "X",
  tiktok: "TikTok",
  telegram: "Telegram",
  discord: "Discord",
  snapchat: "Snapchat",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  streaming: "Twitch",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  reddit: "Reddit",
  google: "Google",
  gmail: "Gmail",
  outlook: "Outlook",
  yahoo: "Yahoo",
  protonmail: "Proton Mail",
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  netflix: "Netflix",
  spotify: "Spotify",
  vk: "VK",
  steam: "Steam",
  xbox: "Xbox",
  "xbox-live": "Xbox",
  playstation: "PlayStation",
  "epic-games": "Epic Games",
  ea: "EA",
  gog: "GOG",
  ubisoft: "Ubisoft",
  "battle-net": "Battle.net",
  windows: "Windows",
  microsoft: "Microsoft",
  apple: "Apple",
  android: "Android",
};

const brandPatterns: Array<[string, RegExp]> = [
  ["outlook", /\boutlook\b|\bhotmail\b|\blive\.com\b/i],
  ["yahoo", /\byahoo\b/i],
  ["protonmail", /\bproton\s*mail\b|\bproton\b/i],
  ["chatgpt", /\bchat\s*gpt\b|\bopenai\b/i],
  ["claude", /\bclaude\b|\banthropic\b/i],
  ["gemini", /\bgemini\b/i],
  ["netflix", /\bnetflix\b/i],
  ["spotify", /\bspotify\b/i],
  ["vk", /\bvk\b|\bvkontakte\b/i],
  ["instagram", /\binstagram\b/i],
  ["facebook", /\bfacebook\b|\bfb\b/i],
  ["threads", /\bthreads\b/i],
  ["tiktok", /\btik\s*tok\b|\btiktok\b/i],
  ["telegram", /\btelegram\b/i],
  ["discord", /\bdiscord\b/i],
  ["snapchat", /\bsnapchat\b/i],
  ["whatsapp", /\bwhats\s*app\b|\bwhatsapp\b/i],
  ["youtube", /\byou\s*tube\b|\byoutube\b/i],
  ["streaming", /\btwitch\b/i],
  ["linkedin", /\blinked\s*in\b|\blinkedin\b/i],
  ["pinterest", /\bpinterest\b/i],
  ["reddit", /\breddit\b/i],
  ["gmail", /\bgmail\b/i],
  ["google", /\bgoogle\b/i],
  ["steam", /\bsteam\b/i],
  ["xbox", /\bxbox\b/i],
  ["playstation", /\bplaystation\b|\bpsn\b|\bps[345]\b/i],
  ["epic-games", /\bepic\s*games?\b/i],
  ["battle-net", /\bbattle\.?net\b|\bblizzard\b/i],
  ["ubisoft", /\bubisoft\b/i],
  ["gog", /\bgog\b/i],
  ["ea", /\bea\s*app\b|\belectronic arts\b/i],
  ["windows", /\bwindows\b/i],
  ["microsoft", /\bmicrosoft\b/i],
  ["apple", /\bapple\b|\bicloud\b|\bios\b/i],
  ["android", /\bandroid\b/i],
  ["x", /\btwitter\b|\bx\.com\b/i],
];

export function marketplacePlatformBrandSlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  if (platformIcons[normalizedSlug]) return normalizedSlug;

  return (
    Object.keys(platformIcons).find((brandSlug) =>
      normalizedSlug.startsWith(`${brandSlug}-`),
    ) ?? normalizedSlug
  );
}

export function detectMarketplaceBrandSlug(...values: Array<unknown>) {
  const text = values
    .filter(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    .join(" ")
    .trim();
  if (!text) return null;

  const direct = marketplacePlatformBrandSlug(
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  );
  if (platformIcons[direct]) return direct;

  return brandPatterns.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export function marketplaceBrandName(slug: string) {
  return brandNames[marketplacePlatformBrandSlug(slug)] ?? slug;
}

export function MarketplaceCategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = categoryIcons[slug] ?? FaHashtag;
  return <Icon className={className} aria-hidden="true" />;
}

export function MarketplacePlatformIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = platformIcons[marketplacePlatformBrandSlug(slug)] ?? FaHashtag;
  return <Icon className={className} aria-hidden="true" />;
}

export function MarketplaceBrandArtwork({
  brandSlug,
  className = "",
  compact = false,
}: {
  brandSlug: string;
  className?: string;
  compact?: boolean;
}) {
  const normalized = marketplacePlatformBrandSlug(brandSlug);
  const Icon = platformIcons[normalized];
  if (!Icon) return null;
  return (
    <span
      className={`ys-brand-artwork brand-${normalized} ${compact ? "compact" : ""} ${className}`.trim()}
      aria-label={`${marketplaceBrandName(normalized)} product`}
      role="img"
    >
      <span className="ys-brand-artwork-icon">
        <Icon aria-hidden="true" />
      </span>
      {!compact ? (
        <span className="ys-brand-artwork-copy">
          <strong>{marketplaceBrandName(normalized)}</strong>
          <small>Ysello marketplace</small>
        </span>
      ) : null}
    </span>
  );
}

export function YselloMarketplaceArtwork({
  label = "Digital product",
  className = "",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`ys-brand-artwork ys-brand-artwork-generic ${compact ? "compact" : ""} ${className}`.trim()}
      aria-label={`${label} on Ysello`}
      role="img"
    >
      <span className="ys-brand-artwork-generic-mark">Y</span>
      {!compact ? (
        <span className="ys-brand-artwork-copy">
          <strong>ysello</strong>
          <small>{label}</small>
        </span>
      ) : null}
    </span>
  );
}
