import { useRef } from "react";
import { Link } from "@/lib/react-router-shim";
import type { Content } from "@/types/content";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { trackPosterClick } from "@/lib/firestore";
import { RowArrows } from "./ContentCarousel";

interface Top10CarouselProps {
  title?: string;
  items: Content[];
}

const Top10Carousel = ({ title = "Top 10 Más Vistos", items }: Top10CarouselProps) => {
  const scrollRef = useRef<HTMLOListElement>(null);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-12 py-8 bg-card/50 border-y border-border/60">
      <div className="flex items-baseline px-4 md:px-10 mb-4">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        <div className="ml-auto">
          <RowArrows onScroll={scroll} />
        </div>
      </div>
      <ol
        ref={scrollRef}
        className="flex gap-2 md:gap-4 px-4 md:px-10 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        {items.slice(0, 10).map((item, i) => (
          <li key={item.docId || item.id} className="flex-shrink-0">
            <Link
              to={contentUrl(item)}
              onClick={() => trackPosterClick(item.docId || String(item.id))}
              className="group/top flex items-end rounded-xl"
              aria-label={`${i + 1}. ${item.title}`}
            >
              <span
                aria-hidden
                className="font-display font-extrabold leading-[0.8] select-none text-transparent -mr-5 md:-mr-7 relative z-0 transition-colors group-hover/top:text-primary/15"
                style={{
                  fontSize: "clamp(120px, 14vw, 200px)",
                  WebkitTextStroke: "2px hsl(var(--primary))",
                  fontVariationSettings: '"wdth" 75',
                }}
              >
                {i + 1}
              </span>
              <img
                src={getImageUrl(item.poster_path)}
                alt=""
                loading="lazy"
                className="relative z-10 w-[104px] md:w-[140px] aspect-[2/3] rounded-lg object-cover border border-border/60 transition-transform duration-200 group-hover/top:-translate-y-1"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default Top10Carousel;
