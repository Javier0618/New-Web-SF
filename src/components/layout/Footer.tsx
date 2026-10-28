import { useLocation } from "react-router-dom";
import { useWebConfig } from "@/hooks/useWebConfig";

const HIDDEN_PREFIXES = ["/admin", "/login", "/watch"];

const DEFAULT_LOGO = "https://raw.githubusercontent.com/Javier0618/Imagenes/main/SFusionLogo.png";
const DEFAULT_FOOTER_TEXT = "© 2026 StreamFusion.top. Todos los derechos reservados.";

const Footer = () => {
  const location = useLocation();
  const { data: config } = useWebConfig();

  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const text = (config?.footerText as string | undefined)?.trim() || DEFAULT_FOOTER_TEXT;

  return (
    <footer className="border-t border-border/70">
      <div className="px-4 md:px-10 py-8 flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
        <img
          src={(config?.logoUrl as string | undefined) || DEFAULT_LOGO}
          alt="StreamFusion"
          className="h-6 w-fit object-contain opacity-80"
        />
        <p className="sm:ml-auto">{text}</p>
      </div>
    </footer>
  );
};

export default Footer;
