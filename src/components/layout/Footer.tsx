import { Link, useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";
import { useWebConfig } from "@/hooks/useWebConfig";

const HIDDEN_PREFIXES = ["/admin", "/login", "/watch"];

const DEFAULT_LOGO = "https://raw.githubusercontent.com/Javier0618/Imagenes/main/SFusionLogo.png";
const DEFAULT_FOOTER_TEXT = "© 2026 StreamFusion.top. Todos los derechos reservados.";

const sections = [
  { to: "/", label: "Inicio" },
  { to: "/movies", label: "Películas" },
  { to: "/series", label: "Series" },
  { to: "/animes", label: "Animes" },
  { to: "/doramas", label: "Doramas" },
];

const Footer = () => {
  const location = useLocation();
  const { data: config } = useWebConfig();

  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const text = (config?.footerText as string | undefined)?.trim() || DEFAULT_FOOTER_TEXT;
  const logoUrl = (config?.logoUrl as string | undefined) || DEFAULT_LOGO;

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="mt-8 border-t border-border/70 bg-card/30">
      <div className="px-4 md:px-10 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* Marca */}
          <div className="max-w-xs">
            <img src={logoUrl} alt="StreamFusion" className="h-7 w-fit object-contain" />
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Películas, series, animes y doramas, reunidos en un solo lugar.
            </p>
          </div>

          {/* Explorar */}
          <nav aria-label="Explorar">
            <h2 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-3.5 rounded-full bg-primary" />
              Explorar
            </h2>
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5">
              {sections.map((s) => (
                <li key={s.to}>
                  <Link
                    to={s.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-muted-foreground">
          <p>{text}</p>
          <button
            onClick={toTop}
            className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            Volver arriba
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
