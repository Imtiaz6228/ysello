import type { IconType } from "react-icons";
import {
  FaAndroid,
  FaApple,
  FaGamepad,
  FaGift,
  FaHashtag,
  FaLinkedin,
  FaSteam,
  FaSyncAlt,
  FaTags,
  FaWindows,
  FaXbox,
} from "react-icons/fa";
import {
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
  apple: FaApple,
  android: FaAndroid,
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
