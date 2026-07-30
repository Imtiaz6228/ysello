import type { IconType } from "react-icons";
import {
  FaGamepad,
  FaGift,
  FaHashtag,
  FaLinkedin,
  FaSyncAlt,
  FaTags,
  FaWindows,
} from "react-icons/fa";
import {
  SiDiscord,
  SiFacebook,
  SiInstagram,
  SiPinterest,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";

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
};

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
  const Icon = platformIcons[slug] ?? FaHashtag;
  return <Icon className={className} aria-hidden="true" />;
}
