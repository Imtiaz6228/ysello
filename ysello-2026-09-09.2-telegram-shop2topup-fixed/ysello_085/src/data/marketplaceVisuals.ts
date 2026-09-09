const artwork = {
  social: "/category-art/social-media.webp",
  ai: "/category-art/ai-productivity.webp",
  creative: "/category-art/design-creative.webp",
  software: "/category-art/software.webp",
  business: "/category-art/business.webp",
  learning: "/category-art/courses.webp",
} as const;

export function marketplaceArtworkFor(
  category?: string | null,
  slug?: string | null,
  title?: string | null,
) {
  const value = `${category ?? ""} ${slug ?? ""} ${title ?? ""}`.toLowerCase();

  if (
    /(social|instagram|facebook|telegram|tiktok|twitter|discord|creator|content)/.test(
      value,
    )
  )
    return artwork.social;
  if (/(ai|automation|productiv|prompt|workflow|neural|chatgpt)/.test(value))
    return artwork.ai;
  if (/(design|creative|brand|graphic|video|audio|template|ui|ux)/.test(value))
    return artwork.creative;
  if (/(software|developer|code|game|license|security|vpn|mobile)/.test(value))
    return artwork.software;
  if (/(business|email|marketing|commerce|finance|operations)/.test(value))
    return artwork.business;
  if (/(course|learn|education|coaching|guide|training|stream)/.test(value))
    return artwork.learning;

  return artwork.creative;
}
