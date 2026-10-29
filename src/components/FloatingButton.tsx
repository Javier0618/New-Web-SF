import { useWebConfig } from "@/hooks/useWebConfig";
import {
  FaAndroid,
  FaWhatsapp,
  FaTelegram,
  FaFacebookMessenger,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTwitter,
  FaDiscord,
  FaFacebook,
  FaGlobe,
  FaDownload,
  FaEnvelope,
  FaLink,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICON_MAP: Record<string, { icon: IconType; color: string }> = {
  android: { icon: FaAndroid, color: "#3DDC84" },
  whatsapp: { icon: FaWhatsapp, color: "#25D366" },
  telegram: { icon: FaTelegram, color: "#0088cc" },
  messenger: { icon: FaFacebookMessenger, color: "#006AFF" },
  instagram: { icon: FaInstagram, color: "#E1306C" },
  tiktok: { icon: FaTiktok, color: "#000000" },
  youtube: { icon: FaYoutube, color: "#FF0000" },
  twitter: { icon: FaTwitter, color: "#1DA1F2" },
  discord: { icon: FaDiscord, color: "#5865F2" },
  facebook: { icon: FaFacebook, color: "#1877F2" },
  web: { icon: FaGlobe, color: "#6366f1" },
  download: { icon: FaDownload, color: "#10b981" },
  email: { icon: FaEnvelope, color: "#EA4335" },
  link: { icon: FaLink, color: "#8b5cf6" },
};

export const FLOATING_ICONS = Object.entries(ICON_MAP).map(([id, { icon, color }]) => ({
  id,
  icon,
  color,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}));

interface FloatingItem {
  id?: string;
  enabled?: boolean;
  url?: string;
  icon?: string;
  tooltip?: string;
}

const SingleButton = ({ fb, index }: { fb: FloatingItem; index: number }) => {
  const iconKey = fb.icon || "android";
  const entry = ICON_MAP[iconKey] || ICON_MAP.android;
  const Icon = entry.icon;
  const bgColor = entry.color;

  // Stack vertically: bottom-6, bottom-24, bottom-[10.5rem], ...
  const bottom = 1 + index * 3.75;

  return (
    <a
      href={fb.url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-3 md:left-6 z-[60] flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-full shadow-lg transition-transform duration-300 ease-out hover:scale-105 active:scale-95"
      style={{ backgroundColor: bgColor, bottom: `calc(${bottom}rem + var(--sf-bottom-nav))` }}
      title={fb.tooltip || ""}
    >
      <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
    </a>
  );
};

const FloatingButton = () => {
  const { data: config } = useWebConfig();

  // New format: array of buttons. Fallback to legacy single object.
  const list: FloatingItem[] =
    Array.isArray(config?.floatingButtons) && config.floatingButtons.length > 0
      ? config.floatingButtons
      : config?.floatingButton
        ? [config.floatingButton]
        : [];

  const enabled = list.filter((fb) => fb?.enabled && fb?.url);
  if (enabled.length === 0) return null;

  return (
    <>
      {enabled.map((fb, i) => (
        <SingleButton key={fb.id || i} fb={fb} index={i} />
      ))}
    </>
  );
};

export default FloatingButton;
