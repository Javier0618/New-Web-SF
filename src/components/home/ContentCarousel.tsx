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

export const RowArrows = ({ onScroll }: { onScroll: (dir: number) => void }) => (
  <div className="hidden md:flex gap-1">
    <button
      onClick={() => onScroll(-1)}
      aria-label="Anterior"
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
    >
      <ChevronLeft className="w-4 h-4" />
    </button>
    <button
      onClick={() => onScroll(1)}
      aria-label="Siguiente"
      className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors"
    >
      <ChevronRight className="w-4 h-4" />
    </button>
  </div>
);

const ContentCarousel = ({ title, items, viewAllLink }: ContentCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-10 md:mb-12">
      <div className="flex items-baseline gap-4 px-4 md:px-10 mb-3">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-sm font-semibold text-primary hover:underline underline-offset-4"
          >
            Ver todo
          </Link>
        )}
        <div className="ml-auto">
          <RowArrows onScroll={scroll} />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 px-4 md:px-10 pt-1 pb-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x scroll-px-4 md:scroll-px-10 [&>*]:snap-start"
      >
        {items.map((item, i) => (
          <ContentCard key={item.docId || item.id} content={item} index={i} />
        ))}
      </div>
    </section>
  );
};

export default ContentCarousel;
