import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ContentCard from "./ContentCard";
import type { Content } from "@/types/content";

interface ContentCarouselProps {
  title: string;
  items: Content[];
  viewAllLink?: string;
}

const ContentCarousel = ({ title, items, viewAllLink }: ContentCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 600;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between px-4 md:px-12 mb-4">
        <h2 className="text-lg md:text-2xl font-black tracking-tight flex items-center gap-3">
          <span
            className="w-1 h-6 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
            aria-hidden
          />
          {title}
        </h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="group/va inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-white/70 hover:text-white px-3 py-1.5 rounded-full ring-1 ring-white/10 hover:ring-primary/60 hover:bg-primary/10 transition"
          >
            Ver todo
            <ChevronRight className="w-4 h-4 transition-transform group-hover/va:translate-x-0.5" />
          </Link>
        )}
      </div>
      <div className="relative group">
        <button
          onClick={() => scroll("left")}
          aria-label="Anterior"
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-3 px-4 md:px-12 pt-2 pb-4 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {items.map((item, i) => (
            <ContentCard key={item.docId || item.id} content={item} index={i} />
          ))}
        </div>
        <button
          onClick={() => scroll("right")}
          aria-label="Siguiente"
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default ContentCarousel;
