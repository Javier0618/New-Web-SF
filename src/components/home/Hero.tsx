import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, Star } from "lucide-react";
import { useNavigate } from "@/lib/react-router-shim";
import type { Content } from "@/types/content";
import { getBackdropUrl, getImageUrl } from "@/lib/image";
import { getGenreName } from "@/lib/genres";
import { contentUrl } from "@/lib/slug";
import TitleLogo, { prefetchTitleLogo } from "@/components/content/TitleLogo";

interface HeroProps {
  content: Content | null;
  allContent?: Content[];
  heroConfig?: { posters?: number; random?: number };
}

const SLIDE_MS = 7000;

/**
 * Portada en forma de cartelera: la función destacada ocupa la pantalla y el
 * resto del programa queda listado al lado (abajo en móvil) para saltar a él.
 */
const Hero = ({ content, allContent = [], heroConfig }: HeroProps) => {
  const navigate = useNavigate();

  const totalPosters = heroConfig?.posters || 8;
  const randomCount = heroConfig?.random || 4;
  const recentCount = Math.max(0, totalPosters - randomCount);

  const slides = useMemo(() => {
    const withBackdrop = allContent.filter((c) => c.backdrop_path);
    if (withBackdrop.length === 0) {
      return content ? [content] : [];
    }
    const mostRecent = withBackdrop.slice(0, recentCount);
    const others = withBackdrop.slice(recentCount);
    const randomItems =
      others.length > 0 ? [...others].sort(() => 0.5 - Math.random()).slice(0, randomCount) : [];
    return [...mostRecent, ...randomItems].sort(() => 0.5 - Math.random()).slice(0, totalPosters);
  }, [allContent, content, totalPosters, randomCount, recentCount]);

  const [current, setCurrent] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  // Mantiene visible la función activa dentro de la lista sin mover la página
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !active) return;
    const top = active.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + active.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - 48, behavior: "smooth" });
    }
  }, [current]);

  const goNext = useCallback(() => {
    setCurrent((p) => (p + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    // Se reinicia en cada cambio (también manual) para que coincida con la barra de tiempo
    const timer = setTimeout(goNext, SLIDE_MS);
    return () => clearTimeout(timer);
  }, [goNext, slides.length, current]);

  useEffect(() => {
    slides.forEach((s) => {
      prefetchTitleLogo(s.id, s.media_type);
    });
  }, [slides]);

  if (slides.length === 0) {
    return <div className="relative h-[78vh] md:h-[88vh] bg-muted animate-pulse" />;
  }

  const item = slides[current];
  const bgImage = getBackdropUrl(item.backdrop_path, item.poster_path);
  const year = item.release_date?.split("-")[0];

  const progressBar = (active: boolean) =>
    active && slides.length > 1 ? (
      <span className="absolute inset-x-0 bottom-0 h-[3px] bg-foreground/10">
        <span
          key={current}
          className="block h-full bg-primary animate-[sf-fill_7s_linear_forwards]"
        />
      </span>
    ) : null;

  return (
    <section
      aria-label="Destacados"
      className="relative h-[82vh] md:h-[88vh] min-h-[580px] overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      </AnimatePresence>

      {/* Mezcla cinematográfica: base sólida abajo que se desvanece hacia la
          imagen, vignette lateral para el texto y oscurecido superior para la
          navbar. El radial añade profundidad tipo "billboard". */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/45 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/80 to-transparent" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(130% 85% at 18% 88%, transparent 42%, hsl(var(--background) / 0.55) 100%)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col lg:flex-row lg:items-end gap-6 lg:gap-12 px-4 md:px-10 pt-20 lg:pt-24 pb-6 md:pb-10">
        {/* Función destacada */}
        <div className="flex-1 min-w-0 flex flex-col justify-end max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45 }}
            >
              <div className="flex flex-wrap items-center gap-2.5 mb-4 text-sm font-semibold">
                <span className="px-2.5 py-1 rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                  {item.media_type === "movie" ? "Película" : "Serie"}
                </span>
                {item.vote_average != null && item.vote_average > 0 && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Star className="w-4 h-4 fill-current" />
                    {item.vote_average.toFixed(1)}
                  </span>
                )}
                {year && <span className="text-foreground/70">{year}</span>}
                {item.genres?.slice(0, 2).map((g) => (
                  <span key={String(g)} className="hidden sm:inline text-foreground/60">
                    {getGenreName(g)}
                  </span>
                ))}
              </div>

              <TitleLogo
                tmdbId={item.id}
                mediaType={item.media_type}
                title={item.title}
                as="h2"
                textClassName="font-display font-condensed text-5xl md:text-7xl font-extrabold leading-[0.95] tracking-tight text-shadow mb-4"
                imgClassName="max-w-[240px] md:max-w-[380px] max-h-[90px] md:max-h-[140px] object-contain object-left mb-5 drop-shadow-2xl"
              />

              <p className="text-[15px] md:text-base text-foreground/75 line-clamp-3 mb-6 max-w-[56ch] leading-relaxed">
                {item.overview}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`${contentUrl(item)}?autoplay=1`)}
                  className="inline-flex items-center gap-2.5 h-12 px-7 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Ver ahora
                </button>
                <button
                  onClick={() => navigate(contentUrl(item))}
                  className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl bg-foreground/10 border border-foreground/15 font-bold backdrop-blur-md hover:bg-foreground/20 transition"
                >
                  <Info className="w-5 h-5" />
                  Detalles
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Programa: el resto de destacados */}
        {slides.length > 1 && (
          <>
            <ol
              ref={listRef}
              className="hidden lg:flex flex-col lg:ml-auto w-[320px] xl:w-[360px] flex-shrink-0 max-h-full overflow-y-auto scrollbar-hide rounded-2xl bg-background/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/40 p-2 [mask-image:linear-gradient(to_bottom,#000_90%,transparent)]"
            >
              <li
                className="sticky -top-2 z-10 -mx-2 -mt-2 px-5 pt-4 pb-3 font-display text-lg font-bold bg-background/70 backdrop-blur-2xl rounded-t-2xl flex items-center gap-2"
                aria-hidden
              >
                <span className="w-1 h-4 rounded-full bg-primary" />
                Destacados
              </li>
              {slides.map((s, i) => {
                const active = i === current;
                return (
                  <li key={s.docId || s.id}>
                    <button
                      onClick={() => setCurrent(i)}
                      aria-current={active ? "true" : undefined}
                      className={`relative w-full flex items-center gap-3 p-1.5 rounded-xl text-left overflow-hidden transition-colors ${
                        active ? "bg-primary/15 ring-1 ring-primary/25" : "hover:bg-secondary/60"
                      }`}
                    >
                      <img
                        src={getImageUrl(s.backdrop_path, "w300")}
                        alt=""
                        loading="lazy"
                        className="w-20 aspect-video rounded-md object-cover flex-shrink-0"
                      />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-semibold line-clamp-1 ${active ? "text-foreground" : "text-foreground/75"}`}
                        >
                          {s.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {s.media_type === "movie" ? "Película" : "Serie"}
                          {s.release_date ? `, ${s.release_date.split("-")[0]}` : ""}
                        </span>
                      </span>
                      {progressBar(active)}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="lg:hidden flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {slides.map((s, i) => (
                <button
                  key={s.docId || s.id}
                  onClick={() => setCurrent(i)}
                  aria-label={`Ver ${s.title}`}
                  aria-current={i === current ? "true" : undefined}
                  className={`relative flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                    i === current ? "border-primary" : "border-transparent opacity-70"
                  }`}
                >
                  <img
                    src={getImageUrl(s.backdrop_path, "w300")}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {progressBar(i === current)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Hero;
