import { useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUp,
  ArrowUpRight,
  Play,
  Clapperboard,
  Compass,
  Search,
  UserRound,
} from "lucide-react";
import { useWebConfig } from "@/hooks/useWebConfig";
import { useContent } from "@/hooks/useContent";
import { useAuth } from "@/contexts/AuthContext";
import { dailySelection } from "@/lib/discovery";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { FLOATING_ICONS } from "@/components/FloatingButton";

const HIDDEN_PREFIXES = ["/admin", "/login", "/watch"];
const DEFAULT_LOGO = "https://raw.githubusercontent.com/Javier0618/Imagenes/main/SFusionLogo.png";
const sections = [
  { to: "/movies", label: "Películas" },
  { to: "/series", label: "Series" },
  { to: "/animes", label: "Anime" },
  { to: "/doramas", label: "Doramas" },
];
interface CommunityLink {
  id?: string;
  enabled?: boolean;
  url?: string;
  icon?: string;
  tooltip?: string;
}

const Footer = () => {
  const location = useLocation();
  const { data: config } = useWebConfig();
  const { content } = useContent();
  const { user } = useAuth();
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const picks = useMemo(
    () =>
      dailySelection(
        content.filter(
          (c) => c.media_type === "movie" && c.poster_path && (c.vote_average || 0) >= 7,
        ),
        43,
      ).slice(0, 4),
    [content],
  );
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  const text =
    (config?.footerText as string | undefined)?.trim() ||
    `© ${new Date().getFullYear()} StreamFusion. Todos los derechos reservados.`;
  const logoUrl = (config?.logoUrl as string | undefined) || DEFAULT_LOGO;
  const brand = config?.site_name || config?.siteName || "StreamFusion";
  const links: CommunityLink[] =
    Array.isArray(config?.floatingButtons) && config.floatingButtons.length
      ? config.floatingButtons
      : config?.floatingButton
        ? [config.floatingButton]
        : [];
  const community = links.filter((link) => link.enabled && link.url).slice(0, 5);
  const toTop = () =>
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });

  return (
    <footer className="sf-site-footer" aria-label="StreamFusion: sigue explorando">
      <div className="sf-footer-wrap">
        <section className="sf-footer-endcard" aria-labelledby="sf-footer-title">
          <div className="sf-footer-invitation">
            <span className="sf-eyebrow">
              <Clapperboard size={14} /> SIGUE LA FUNCIÓN
            </span>
            <h2 id="sf-footer-title">
              Tu próxima historia
              <br />
              <em>empieza con un play.</em>
            </h2>
            <p>
              De las que te hacen reír a las que no te dejan parpadear. Hay mucho más por descubrir.
            </p>
            <div className="sf-footer-actions">
              <Link to="/explore" className="sf-button-primary">
                <Play size={14} fill="currentColor" /> Encuentra qué ver
              </Link>
              <Link to="/" className="sf-footer-home">
                Volver a la cartelera <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="sf-footer-art" role="group" aria-label="Más películas para descubrir">
            <span className="sf-footer-orbit" aria-hidden="true" />
            {picks.map((item, index) => (
              <Link
                to={contentUrl(item)}
                key={item.docId || item.id}
                className="sf-footer-poster"
                aria-label={`Descubrir ${item.title}`}
                style={{ "--sf-footer-tilt": `${[-12, -4, 6, 14][index]}deg` } as CSSProperties}
              >
                <span className="sf-footer-poster-fallback" aria-hidden="true">
                  {item.title}
                </span>
                <img
                  src={getImageUrl(item.poster_path, "w300")}
                  alt=""
                  width={200}
                  height={300}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
                />
                <span className="sf-footer-poster-play" aria-hidden="true">
                  <Play size={16} fill="currentColor" />
                </span>
              </Link>
            ))}
            <span className="sf-footer-art-caption">CADA PLAY ABRE OTRO MUNDO</span>
          </div>
        </section>

        <div className="sf-footer-directory">
          <div className="sf-footer-brand">
            <Link to="/" className="sf-footer-brand-link">
              {failedLogo === logoUrl ? (
                <span className="sf-footer-logo-fallback" aria-hidden="true">
                  <Clapperboard size={22} />
                </span>
              ) : (
                <img
                  src={logoUrl}
                  alt=""
                  width={36}
                  height={36}
                  loading="lazy"
                  onError={() => setFailedLogo(logoUrl)}
                />
              )}
              <strong>{brand}</strong>
            </Link>
            <p>
              Películas, series, anime y doramas.
              <br />
              Un lugar para dejarte llevar.
            </p>
            <span className="sf-footer-brand-note">
              <span className="sf-status-dot" /> TU MOMENTO. TU HISTORIA.
            </span>
          </div>
          <nav aria-label="Catálogo del footer">
            <h3>Elige tu universo</h3>
            <ul>
              {sections.map((s) => (
                <li key={s.to}>
                  <Link to={s.to}>
                    {s.label}
                    <ArrowUpRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Descubrir y mi espacio">
            <h3>A tu manera</h3>
            <ul>
              <li>
                <Link to="/explore">
                  <span>
                    <Compass size={13} /> Explorar
                  </span>
                  <ArrowUpRight size={12} />
                </Link>
              </li>
              <li>
                <Link to="/search">
                  <span>
                    <Search size={13} /> Buscar una historia
                  </span>
                  <ArrowUpRight size={12} />
                </Link>
              </li>
              <li>
                <Link to={user ? "/profile" : "/login"}>
                  <span>
                    <UserRound size={13} /> Mi espacio
                  </span>
                  <ArrowUpRight size={12} />
                </Link>
              </li>
            </ul>
          </nav>
          {community.length > 0 && (
            <nav aria-label="Apps y comunidad">
              <h3>Más StreamFusion</h3>
              <ul>
                {community.map((link, index) => {
                  const entry = FLOATING_ICONS.find((icon) => icon.id === link.icon);
                  const Icon = entry?.icon;
                  const label =
                    link.tooltip ||
                    (link.icon === "android" || link.icon === "download"
                      ? "Descargar la app"
                      : entry?.label || "Visitar enlace");
                  return (
                    <li key={link.id || index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <span>
                          {Icon && <Icon size={13} />} {label}
                        </span>
                        <ArrowUpRight size={12} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
        <div className="sf-footer-bottom">
          <p>{text}</p>
          <button onClick={toTop}>
            Volver arriba <ArrowUp size={15} />
          </button>
        </div>
      </div>
      <span className="sf-footer-watermark" aria-hidden="true">
        STREAMFUSION
      </span>
    </footer>
  );
};
export default Footer;
