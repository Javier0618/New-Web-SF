import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Play,
  Plus,
  Pause,
  ChevronLeft,
  ChevronRight,
  Star,
  Clapperboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Content } from "@/types/content";
import { getBackdropUrl, getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { editorialSelection, contentReason } from "@/lib/discovery";
import { useWebConfig } from "@/hooks/useWebConfig";
import TitleLogo, { prefetchTitleLogo } from "@/components/content/TitleLogo";
import { canonicalGenre } from "@/lib/genres";

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
  const [autoPlay, setAutoPlay] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduceMotion(media.matches);
      if (media.matches) setAutoPlay(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const stripRef = useRef<HTMLElement>(null);
  const rotating = autoPlay && !focused && visible;
  const move = (direction: number) =>
    setActive((current) => (current + direction + selection.items.length) % selection.items.length);
  useEffect(() => {
    if (!rotating || selection.items.length < 2) return;
    const timer = setTimeout(
      () => setActive((current) => (current + 1) % selection.items.length),
      8000,
    );
    return () => clearTimeout(timer);
  }, [active, rotating, selection.items.length]);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    selection.items.forEach((s) => {
      void prefetchTitleLogo(s.id, s.media_type);
    });
  }, [selection.items]);
  useEffect(() => {
    const strip = stripRef.current;
    const selected = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !selected || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.clientWidth) / 2,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [active, reduceMotion]);
  const item = selection.items[active] || selection.items[0];
  if (!item) return null;
  return (
    <section
      className="sf-editorial-hero"
      aria-label="La selección de StreamFusion"
      style={{ "--sf-story-accent": selection.mood.color } as CSSProperties}
      onFocusCapture={(event) =>
        setFocused((event.target as HTMLElement).matches(":focus-visible"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="sf-hero-ambience" aria-hidden="true">
        <img src={getBackdropUrl(item.backdrop_path, item.poster_path)} alt="" />
        <span />
      </div>
      <div className="sf-hero-intro">
        <span className="sf-eyebrow">
          <Clapperboard size={13} /> DALE PLAY A TU NOCHE
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
            <span>
              <span className="sf-status-dot" /> EN CARTELERA
            </span>
            <span>
              0{active + 1} / 0{selection.items.length}
            </span>
          </div>
          <div className="sf-feature-copy">
            <span className="sf-eyebrow">
              {item.media_type === "movie" ? "PELÍCULA" : "SERIE"} <span aria-hidden> / </span>{" "}
              {item.release_date?.slice(0, 4)}
            </span>
            <div className="sf-feature-title">
              <TitleLogo
                tmdbId={item.id}
                mediaType={item.media_type}
                title={item.title}
                as="h2"
                textClassName="sf-feature-text-title"
                imgClassName="sf-feature-title-logo"
              />
            </div>
            <div className="sf-feature-tags">
              {(item.vote_average || 0) > 0 && (
                <span className="sf-feature-rating">
                  <Star size={13} fill="currentColor" /> {item.vote_average!.toFixed(1)}
                </span>
              )}
              {[...new Set((item.genres || []).map(canonicalGenre))].slice(0, 2).map((genre) => (
                <span key={genre}>{genre}</span>
              ))}
            </div>
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
        <aside className="sf-hero-aside" ref={stripRef} aria-label="Cinco títulos de la cartelera">
          <div className="sf-aside-heading">
            <span>TU CARTELERA · {selection.items.length} HISTORIAS</span>
            <ArrowUpRight size={18} />
          </div>
          {selection.items.map((s, i) => (
            <button
              key={s.docId || s.id}
              className={`sf-program-card ${active === i ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              aria-label={`Mostrar ${s.title}`}
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
              <span className="sf-program-play" aria-hidden="true">
                <Play size={13} fill="currentColor" />
              </span>
              {active === i && (
                <span
                  key={`${active}:${rotating}`}
                  className={`sf-program-progress ${rotating ? "is-running" : ""}`}
                />
              )}
            </button>
          ))}
        </aside>
      </div>
      <div className="sf-hero-playback-controls" aria-label="Controles de la cartelera">
        <span className="sf-cartelera-caption">
          <span className="sf-status-dot" /> Películas, series y nuevas obsesiones
        </span>
        <div>
          <span className="sf-cartelera-index">
            {String(active + 1).padStart(2, "0")}{" "}
            <span>/ {String(selection.items.length).padStart(2, "0")}</span>
          </span>
          <button onClick={() => move(-1)} aria-label="Título anterior">
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => {
              setAutoPlay((value) => !value);
              setFocused(false);
            }}
            aria-label={autoPlay ? "Pausar cartelera automática" : "Reanudar cartelera automática"}
          >
            {autoPlay ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={() => move(1)} aria-label="Título siguiente">
            <ChevronRight size={17} />
          </button>
        </div>
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
