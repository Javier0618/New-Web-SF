import { useRef } from "react";
import { Link } from "@/lib/react-router-shim";
import { Star } from "lucide-react";
import type { Content } from "@/types/content";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { trackPosterClick } from "@/lib/firestore";
import { RowArrows } from "./ContentCarousel";

interface Top10CarouselProps {
  title?: string;
  items: Content[];
}

/**
 * Top 10 en forma de "cartelera de boletos": cada título es una entrada de cine
 * con su número en el talón perforado. La barra de calor refleja la nota
 * (`vote_average`), no métricas inventadas.
 */
const Top10Carousel = ({ title = "Lo más visto hoy", items }: Top10CarouselProps) => {
  const scrollRef = useRef<HTMLOListElement>(null);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-12 py-8 bg-card/50 border-y border-border/60">
      <div className="flex items-baseline gap-3 px-4 md:px-10 mb-1">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        <div className="ml-auto">
          <RowArrows onScroll={scroll} />
        </div>
      </div>
      <p className="px-4 md:px-10 text-xs text-muted-foreground mb-4">Según la valoración del público</p>

      <ol
        ref={scrollRef}
        className="flex gap-3 md:gap-4 px-4 md:px-10 pt-1 pb-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x scroll-px-4 md:scroll-px-10 [&>*]:snap-start"
      >
        {items.slice(0, 10).map((item, i) => {
          const rank = String(i + 1).padStart(2, "0");
          const rating = item.vote_average ?? 0;
          const heat = Math.max(0, Math.min(100, (rating / 10) * 100));
          const year = item.release_date?.split("-")[0];
          const isTop = i === 0;

          return (
            <li key={item.docId || item.id} className="flex-shrink-0">
              <Link
                to={contentUrl(item)}
                onClick={() => trackPosterClick(item.docId || String(item.id))}
                className="group/top block w-[138px] md:w-[180px] rounded-xl focus-visible:outline-offset-4"
                aria-label={`Puesto ${i + 1}: ${item.title}`}
              >
                <div className="flex rounded-xl overflow-hidden bg-card ring-1 ring-white/5 transition-all duration-300 group-hover/top:-translate-y-1.5 group-hover/top:ring-2 group-hover/top:ring-primary/60 group-hover/top:shadow-xl group-hover/top:shadow-black/50">
                  {/* Talón del boleto con el número */}
                  <span
                    aria-hidden
                    className={`flex items-center justify-center w-9 flex-shrink-0 border-r-2 border-dashed border-background ${
                      isTop ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                    }`}
                  >
                    <span
                      className="font-display font-extrabold text-xl [writing-mode:vertical-rl] rotate-180 select-none"
                      style={{ fontVariationSettings: '"wdth" 75' }}
                    >
                      {rank}
                    </span>
                  </span>

                  {/* Póster con rating y barra de calor */}
                  <div className="relative flex-1 aspect-[2/3]">
                    <img
                      src={getImageUrl(item.poster_path)}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/top:scale-[1.06]"
                    />
                    {rating > 0 && (
                      <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-primary">
                        <Star className="w-3 h-3 fill-current" />
                        {rating.toFixed(1)}
                      </span>
                    )}
                    {rating > 0 && (
                      <span
                        className="absolute inset-x-0 bottom-0 h-[5px] bg-black/45"
                        role="img"
                        aria-label={`Valoración ${rating.toFixed(1)} de 10`}
                      >
                        <i className="block h-full bg-primary" style={{ width: `${heat}%` }} />
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-2 font-sans text-sm font-semibold leading-snug line-clamp-1 group-hover/top:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {item.media_type === "movie" ? "Película" : "Serie"}
                  {year ? `, ${year}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default Top10Carousel;
