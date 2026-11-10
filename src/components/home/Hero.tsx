import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUpRight, Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { Content } from "@/types/content";
import { getBackdropUrl, getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { editorialSelection, contentReason } from "@/lib/discovery";
import { useWebConfig } from "@/hooks/useWebConfig";

interface HeroProps {
  content: Content | null;
  allContent?: Content[];
  heroConfig?: { posters?: number; random?: number };
}

const Hero = ({ content, allContent = [] }: HeroProps) => {
  const { data: config } = useWebConfig();
  const editorial = config?.editorial || {};
  const selection = useMemo(
    () =>
      editorialSelection(
        allContent.length ? allContent : content ? [content] : [],
        editorial.mood,
        editorial.ids,
      ),
    [allContent, content, editorial.mood, editorial.ids],
  );
  const [active, setActive] = useState(0);
  const item = selection.items[active] || selection.items[0];
  if (!item) return null;
  return (
    <section
      className="sf-editorial-hero"
      aria-label="La selección de StreamFusion"
      style={{ "--sf-story-accent": selection.mood.color } as CSSProperties}
    >
      <div className="sf-hero-intro">
        <span className="sf-eyebrow">
          <span className="sf-status-dot" /> TU PRÓXIMA BUENA HISTORIA
        </span>
        <div className="sf-hero-heading-row">
          <h1>{editorial.headline || selection.mood.headline}</h1>
          <p>{editorial.description || selection.mood.description}</p>
        </div>
      </div>
      <div className="sf-hero-layout">
        <article className="sf-feature" key={item.docId || item.id}>
          <img
            src={getBackdropUrl(item.backdrop_path, item.poster_path)}
            alt=""
            fetchPriority="high"
            className="sf-feature-image"
          />
          <div className="sf-feature-shade" />
          <div className="sf-feature-top">
            <span>LA FUNCIÓN DE HOY</span>
            <span>
              0{active + 1} / 0{selection.items.length}
            </span>
          </div>
          <div className="sf-feature-copy">
            <span className="sf-eyebrow">
              {item.media_type === "movie" ? "PELÍCULA" : "SERIE"} <span aria-hidden> / </span>{" "}
              {item.release_date?.slice(0, 4)}
            </span>
            <h2>{item.title}</h2>
            <p className="sf-feature-synopsis">{item.overview}</p>
            <div className="sf-feature-actions">
              <Link to={`${contentUrl(item)}?autoplay=1`} className="sf-button-primary">
                <Play size={16} fill="currentColor" /> Ver ahora
              </Link>
              <Link to={contentUrl(item)} className="sf-button-secondary">
                <Plus size={17} /> Descubrir la historia
              </Link>
            </div>
          </div>
        </article>
        <aside className="sf-hero-aside">
          <div className="sf-aside-heading">
            <span>OTRAS FORMAS DE PASAR LA NOCHE</span>
            <ArrowUpRight size={18} />
          </div>
          {selection.items.map((s, i) => (
            <button
              key={s.docId || s.id}
              className={`sf-program-card ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
            >
              <img
                src={getImageUrl(s.backdrop_path || s.poster_path, "w500")}
                alt=""
                loading="lazy"
              />
              <span className="sf-program-shade" />
              <span className="sf-program-copy">
                <span className="sf-program-number">0{i + 1}</span>
                <strong>{s.title}</strong>
                <small>{contentReason(s)}</small>
              </span>
              <ArrowUpRight className="sf-program-arrow" size={18} />
            </button>
          ))}
        </aside>
      </div>
      <a href="#elige-tu-noche" className="sf-hero-footnote">
        <span>Una noche. Muchas posibilidades.</span>
        <span>
          Encuentra la tuya <ArrowDown size={14} />
        </span>
      </a>
    </section>
  );
};
export default Hero;
