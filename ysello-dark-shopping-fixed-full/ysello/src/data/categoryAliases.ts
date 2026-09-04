export const categoryAliasGroups: Record<string, string[]> = {
  "social-media-marketplace": [
    "social-media",
    "instagram",
    "facebook",
    "twitter",
    "twitter-x",
    "discord",
    "telegram",
    "tiktok",
  ],
  "social-media-marketplace-instagram": ["instagram"],
  "social-media-marketplace-facebook": ["facebook"],
  "social-media-marketplace-x-twitter": ["twitter", "twitter-x"],
  "social-media-marketplace-discord": ["discord"],
  "social-media-marketplace-telegram": ["telegram"],
  "social-media-marketplace-tiktok": ["tiktok"],
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
