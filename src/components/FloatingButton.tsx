import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
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

const FloatingButton = () => {
  const { data: config } = useWebConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [open]);
  const list: FloatingItem[] = Array.isArray(config?.floatingButtons) && config.floatingButtons.length ? config.floatingButtons : config?.floatingButton ? [config.floatingButton] : [];
  const enabled = list.filter((fb) => fb?.enabled && fb?.url);
  if (!enabled.length) return null;
  return <div className="sf-utility" ref={ref}>
    {open && <div className="sf-utility-menu" id="sf-utility-links">{enabled.map((fb,i) => {const entry=ICON_MAP[fb.icon || "android"] || ICON_MAP.link; const Icon=entry.icon; return <a key={fb.id || i} href={fb.url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}><Icon style={{color:entry.color}} className="w-5 h-5" /><span>{fb.tooltip || (fb.icon === "android" ? "Descargar la app" : fb.icon || "Abrir enlace")}</span></a>})}</div>}
    <button className="sf-utility-toggle" aria-label={open ? "Cerrar accesos" : "Apps y comunidad"} aria-expanded={open} aria-controls="sf-utility-links" onClick={() => setOpen(!open)}>{open ? <X size={19} /> : <Plus size={19} />}</button>
  </div>;
};
export default FloatingButton;
