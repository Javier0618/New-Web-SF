import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Content } from "@/types/content";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import {
  getWatchHistory,
  getProgress,
  progressRatio,
  isFinished,
  removeFromWatchHistory,
  formatMinutes,
} from "@/lib/watchHistory";

interface Props {
  content: Content[];
}

/** Fila "Seguir viendo": tarjetas horizontales con progreso real del reproductor. */
const ContinueWatchingRow = ({ content }: Props) => {
  const [version, setVersion] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const byDocId = new Map(content.map((c) => [c.docId, c]));
    return getWatchHistory()
      .map((e) => {
        const c = byDocId.get(e.docId);
        if (!c) return null;
        const pr = getProgress(e.url);
        // Película terminada: ya no tiene sentido "seguir viendo"
        if (c.media_type === "movie" && isFinished(pr)) return null;
        return { entry: e, content: c, pr };
      })
      .filter(Boolean)
      .slice(0, 20) as {
      entry: ReturnType<typeof getWatchHistory>[number];
      content: Content;
      pr: ReturnType<typeof getProgress>;
    }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, version]);

  if (items.length === 0) return null;

  const scroll = (dir: number) =>
    scrollRef.current?.scrollBy({ left: dir * 640, behavior: "smooth" });

  return (
    <section className="mb-10">
      <div className="flex items-baseline px-4 md:px-10 mb-3">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Seguir viendo</h2>
      </div>
      <div className="relative group/row">
        <button
          onClick={() => scroll(-1)}
          aria-label="Anterior"
          className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 pb-2 snap-x"
        >
          {items.map(({ entry, content: c, pr }) => {
            const ratio = isFinished(pr) ? 1 : progressRatio(pr);
            const remaining = pr && pr.d > 0 ? Math.max(0, pr.d - pr.p) : 0;
            const img = c.backdrop_path
              ? getImageUrl(c.backdrop_path, "w780")
              : getImageUrl(c.poster_path, "w500");
            return (
              <div
                key={c.docId}
                className="group/cw relative flex-shrink-0 w-[72vw] sm:w-[300px] md:w-[340px] snap-start"
              >
                <Link
                  to={`${contentUrl(c)}?autoplay=1`}
                  className="block relative aspect-video rounded-xl overflow-hidden border border-border/60 bg-muted transition-[border-color,transform] duration-200 group-hover/cw:border-primary group-hover/cw:-translate-y-1"
                >
                  <img
                    src={img}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cw:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-6 h-6 text-primary-foreground fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.label && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          {entry.label}
                        </span>
                      )}
                      {remaining > 0 && (
                        <span className="text-[11px] font-medium text-white/70">
                          Quedan {formatMinutes(remaining)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base font-bold text-white line-clamp-1">
                      {c.title}
                    </p>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.max(ratio, 0.03) * 100}%` }}
                    />
                  </div>
                </Link>
                <button
                  onClick={() => {
                    removeFromWatchHistory(c.docId!);
                    setVersion((v) => v + 1);
                  }}
                  aria-label={`Quitar ${c.title} de Seguir viendo`}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur flex items-center justify-center opacity-100 md:opacity-0 group-hover/cw:opacity-100 hover:bg-primary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label="Siguiente"
          className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 w-12 items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
    </section>
  );
};

export default ContinueWatchingRow;
