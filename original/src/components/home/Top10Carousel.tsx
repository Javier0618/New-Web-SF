import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@/lib/react-router-shim";
import type { Content } from "@/types/content";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { trackPosterClick } from "@/lib/firestore";

interface Top10CarouselProps {
  title?: string;
  items: Content[];
}

const Top10Carousel = ({ title = "Top 10 Más Vistos", items }: Top10CarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 600;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const handleClick = (item: Content) => {
    trackPosterClick(item.docId || String(item.id));
    navigate(contentUrl(item));
  };

  return (
    <div className="mb-10">
      <div className="px-4 md:px-12 mb-4">
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
      </div>
      <div className="relative group">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-1 md:gap-2 px-4 md:px-12 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {items.slice(0, 10).map((item, i) => (
            <div
              key={item.docId || item.id}
              onClick={() => handleClick(item)}
              className="flex-shrink-0 relative cursor-pointer group/card"
              style={{ width: "clamp(200px, 22vw, 280px)" }}
            >
              <div className="flex items-end h-[220px] md:h-[280px]">
                {/* Large number */}
                <span
                  className="select-none font-black leading-none text-transparent flex-shrink-0"
                  style={{
                    fontSize: "clamp(160px, 18vw, 240px)",
                    WebkitTextStroke: "3px hsl(var(--foreground) / 0.3)",
                    marginRight: "-30px",
                    zIndex: 1,
                  }}
                >
                  {i + 1}
                </span>
                {/* Poster */}
                <div className="relative w-[120px] md:w-[150px] aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 z-[2] shadow-xl transition-transform duration-300 group-hover/card:scale-105">
                  <img
                    src={getImageUrl(item.poster_path)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Top10Carousel;
