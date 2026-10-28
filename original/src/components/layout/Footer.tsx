import { useLocation } from "react-router-dom";
import { useWebConfig } from "@/hooks/useWebConfig";

const HIDDEN_PREFIXES = ["/admin", "/login", "/watch"];

const DEFAULT_FOOTER_TEXT = "© 2026 StreamFusion.top. Todos los derechos reservados.";

const Footer = () => {
  const location = useLocation();
  const { data: config } = useWebConfig();

  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const text = (config?.footerText as string | undefined)?.trim() || DEFAULT_FOOTER_TEXT;

  return (
    <footer className="border-t border-border bg-background/60 backdrop-blur-sm">
      <div className="px-4 md:px-12 py-6 text-center text-xs md:text-sm text-muted-foreground">
        {text}
      </div>
    </footer>
  );
};

export default Footer;