import { useNavigate } from "@/lib/react-router-shim";
import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import type { Content } from "@/types/content";
import { trackPosterClick } from "@/lib/firestore";
import { getImageUrl } from "@/lib/image";
import { getGenreName } from "@/lib/genres";
import { contentUrl } from "@/lib/slug";

interface ContentCardProps {
  content: Content;
  index?: number;
  grid?: boolean;
  /** Heading level for the card title — defaults to h3 */
  titleAs?: "h2" | "h3" | "h4";
}

const ContentCard = ({ content, index = 0, grid = false, titleAs = "h3" }: ContentCardProps) => {
  const TitleTag = titleAs;
  const navigate = useNavigate();

  const handleClick = () => {
    trackPosterClick(content.docId || String(content.id));
    navigate(contentUrl(content));
  };

  const year = content.release_date?.split("-")[0];
  const typeLabel = content.media_type === "movie" ? "Película" : "Serie";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.15) }}
      onClick={handleClick}
      className={
        grid
          ? "cursor-pointer"
          : "flex-shrink-0 w-[calc((100vw-2rem-1.5rem)/3)] md:w-[180px] cursor-pointer"
      }
    >
      <div className="group/card relative aspect-[2/3] rounded-xl overflow-hidden bg-muted shadow-md ring-1 ring-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:ring-2 hover:ring-primary/70 hover:shadow-[0_18px_40px_-12px_hsl(var(--primary)/0.45)]">
        <img
          src={getImageUrl(content.poster_path)}
          alt={content.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
          loading="lazy"
        />

        {/* Always-visible bottom gradient (más intenso al pasar el ratón) */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-all duration-300 group-hover/card:h-full group-hover/card:via-black/70" />

        {/* Play icon on hover - scoped to this card */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.7)] scale-75 group-hover/card:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>

        {/* Rating badge */}
        {content.vote_average != null && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm ring-1 ring-white/10">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span className="text-white">
              {content.vote_average > 0 ? content.vote_average.toFixed(1) : "Nuevo"}
            </span>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
              {typeLabel}
            </span>
            {year && <span className="text-[10px] font-semibold text-white/80">{year}</span>}
          </div>
          <TitleTag className="text-sm font-bold text-white leading-snug line-clamp-2 drop-shadow-md m-0">
            {content.title}
          </TitleTag>
          {content.genres?.length > 0 && (
            <p className="text-[10px] text-white/60 line-clamp-1 max-h-0 opacity-0 group-hover/card:max-h-6 group-hover/card:opacity-100 group-hover/card:mt-1 transition-all duration-300">
              {content.genres
                .slice(0, 2)
                .map((g) => getGenreName(g))
                .join(" · ")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ContentCard;
