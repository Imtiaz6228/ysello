export const categoryAliasGroups: Record<string, string[]> = {
  "social-media-marketplace": ["social-media"],
  ...Object.fromEntries(
    [
      "facebook",
      "instagram",
      "gmail",
      "telegram",
      "outlook",
      "discord",
      "tiktok",
      "whatsapp",
      "youtube",
      "threads",
      "reddit",
      "snapchat",
      "linkedin",
      "pinterest",
      "yahoo",
      "protonmail",
      "chatgpt",
      "claude",
      "gemini",
      "netflix",
      "spotify",
      "steam",
      "vk",
      "google",
      "streaming",
    ].map((slug) => [
      `${slug}-accounts`,
      [slug, `social-media-marketplace-${slug}`],
    ]),
  ),
  "x-accounts": [
    "x",
    "twitter",
    "twitter-x",
    "social-media-marketplace-x-twitter",
  ],
  "email-accounts-marketplace": ["email-account"],
  "ai-marketplace": ["ai-workflows"],
  "software-marketplace": ["software-apps"],
  gaming: ["games-gaming"],
};

export function equivalentCategorySlugs(slug: string) {
  const equivalents = new Set([slug]);
  for (const [canonical, aliases] of Object.entries(categoryAliasGroups)) {
    if (canonical === slug || aliases.includes(slug)) {
      equivalents.add(canonical);
      aliases.forEach((alias) => equivalents.add(alias));
    }
  }
  return equivalents;
}
