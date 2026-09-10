export const platformDefinitions = [
  {
    slug: "facebook",
    name: "Facebook",
    pattern: /\bfacebook\b|\bfb\b|фейсбук|фейсбук/i,
  },
  {
    slug: "instagram",
    name: "Instagram",
    pattern: /\binstagram\b|\binsta\b|инстаграм/i,
  },
  { slug: "gmail", name: "Gmail", pattern: /\bgmail\b|\bgoogle\s*mail\b/i },
  { slug: "telegram", name: "Telegram", pattern: /\btelegram\b|телеграм/i },
  {
    slug: "outlook",
    name: "Outlook",
    pattern: /\boutlook\b|\bhotmail\b|\blive\.com\b/i,
  },
  {
    slug: "x",
    name: "X / Twitter",
    pattern: /\btwitter\b|\bx\.com\b|твиттер/i,
  },
  { slug: "tiktok", name: "TikTok", pattern: /\btik\s*tok\b|тикток/i },
  { slug: "discord", name: "Discord", pattern: /\bdiscord\b|дискорд/i },
  { slug: "whatsapp", name: "WhatsApp", pattern: /\bwhats\s*app\b|ватсап/i },
  { slug: "youtube", name: "YouTube", pattern: /\byou\s*tube\b|ютуб/i },
  { slug: "threads", name: "Threads", pattern: /\bthreads\b/i },
  { slug: "reddit", name: "Reddit", pattern: /\breddit\b|реддит/i },
  { slug: "snapchat", name: "Snapchat", pattern: /\bsnapchat\b/i },
  { slug: "linkedin", name: "LinkedIn", pattern: /\blinked\s*in\b/i },
  { slug: "pinterest", name: "Pinterest", pattern: /\bpinterest\b/i },
  { slug: "yahoo", name: "Yahoo", pattern: /\byahoo\b/i },
  {
    slug: "protonmail",
    name: "Proton Mail",
    pattern: /\bproton\s*mail\b|\bproton\b/i,
  },
  { slug: "chatgpt", name: "ChatGPT", pattern: /\bchat\s*gpt\b|\bopenai\b/i },
  { slug: "claude", name: "Claude", pattern: /\bclaude\b|\banthropic\b/i },
  { slug: "gemini", name: "Gemini", pattern: /\bgemini\b/i },
  { slug: "netflix", name: "Netflix", pattern: /\bnetflix\b/i },
  { slug: "spotify", name: "Spotify", pattern: /\bspotify\b/i },
  { slug: "steam", name: "Steam", pattern: /\bsteam\b/i },
  { slug: "vk", name: "VK", pattern: /\bvk\b|\bvkontakte\b|вконтакте/i },
  { slug: "streaming", name: "Twitch", pattern: /\btwitch\b/i },
  { slug: "google", name: "Google", pattern: /\bgoogle\b/i },
] as const;
export type ProductPlatform = (typeof platformDefinitions)[number];

/** The first platform mentioned in the title is the product; included mail comes later. */
export function identifyProductPlatform(
  ...values: unknown[]
): ProductPlatform | undefined {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const direct = value
      .trim()
      .toLowerCase()
      .replace(/-accounts$/, "");
    const exact = platformDefinitions.find(
      (item) => item.slug === direct || item.name.toLowerCase() === direct,
    );
    if (exact) return exact;
    const matches = platformDefinitions
      .flatMap((item) => {
        const match = item.pattern.exec(value);
        return match ? [{ item, index: match.index }] : [];
      })
      .sort((a, b) => a.index - b.index);
    if (matches.length) return matches[0].item;
  }
  return undefined;
}
export function platformCategorySlug(platform: ProductPlatform) {
  return `${platform.slug}-accounts`;
}
export function platformImage(platform: ProductPlatform) {
  return `/brand-icons/${platform.slug}.svg`;
}
