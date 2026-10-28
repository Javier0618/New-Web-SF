import { useEffect } from "react";
import { useLocation } from "@/lib/react-router-shim";
import { useWebConfig } from "@/hooks/useWebConfig";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const getPageTitle = (pathname: string, base: string): string => {
  if (pathname === "/") return `${base} - Tu lugar de entretenimiento`;
  if (pathname === "/movies") return `Películas - ${base}`;
  if (pathname === "/series") return `Series - ${base}`;
  if (pathname === "/animes") return `Animes - ${base}`;
  if (pathname === "/doramas") return `Doramas - ${base}`;
  if (pathname === "/search") return `Buscar - ${base}`;
  if (pathname === "/login") return `Iniciar Sesión - ${base}`;
  if (pathname === "/profile") return `Mi Perfil - ${base}`;
  if (pathname === "/messages") return `Mensajes - ${base}`;
  if (pathname === "/admin") return `Admin - ${base}`;
  if (pathname.startsWith("/category/")) {
    const type = pathname.split("/category/")[1];
    return `${type.charAt(0).toUpperCase() + type.slice(1)} - ${base}`;
  }
  if (pathname.startsWith("/pelicula/") || pathname.startsWith("/serie/")) {
    const slug = pathname.split("/").pop() || "";
    const name = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return `${name} - ${base}`;
  }
  if (pathname.startsWith("/watch/")) return `Reproduciendo - ${base}`;
  return base;
};

const AnalyticsTracker = () => {
  const location = useLocation();
  const { data: webConfig } = useWebConfig();
  const siteName = webConfig?.site_name || "StreamFusion";

  useEffect(() => {
    const title = getPageTitle(location.pathname, siteName);
    document.title = title;

    if (window.gtag) {
      window.gtag("config", "G-VZEP4GTRKY", {
        page_path: location.pathname + location.search,
        page_title: title,
      });
    }
  }, [location, siteName]);

  return null;
};

export default AnalyticsTracker;
