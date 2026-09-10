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
  "instagram-new-accounts": ["instagram-new"],
  "instagram-old-accounts": ["instagram-old"],
  "instagram-accounts-with-followers": ["instagram-with-followers"],
  "instagram-accounts-with-posts": ["instagram-with-posts"],
  "facebook-new-accounts": ["facebook-new"],
  "facebook-old-accounts": ["facebook-old"],
  "facebook-accounts-with-followers": ["facebook-with-followers"],
  "facebook-accounts-with-posts": ["facebook-with-posts"],
  "x-new-accounts": ["x-new", "twitter-x-new"],
  "x-old-accounts": ["x-old", "twitter-x-old"],
  "x-accounts-with-followers": ["x-with-followers", "twitter-x-with-followers"],
  "x-accounts-with-posts": ["x-with-posts", "twitter-x-with-posts"],
  "tiktok-new-accounts": ["tiktok-new"],
  "tiktok-old-accounts": ["tiktok-old"],
  "tiktok-accounts-with-followers": ["tiktok-with-followers"],
  "tiktok-accounts-with-posts": ["tiktok-with-posts"],

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
