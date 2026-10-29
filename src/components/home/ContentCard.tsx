import { Link } from "@/lib/react-router-shim";
import { Star, Play } from "lucide-react";
import type { Content } from "@/types/content";
import { trackPosterClick } from "@/lib/firestore";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";

interface ContentCardProps {
  content: Content;
  /** Posición en la lista (se conserva por compatibilidad con los llamadores). */
  index?: number;
  grid?: boolean;
  /** Heading level for the card title — defaults to h3 */
  titleAs?: "h2" | "h3" | "h4";
}

const ContentCard = ({ content, grid = false, titleAs = "h3" }: ContentCardProps) => {
  const TitleTag = titleAs;
  const year = content.release_date?.split("-")[0];
  const rating = content.vote_average ?? 0;

  return (
    <Link
      to={contentUrl(content)}
      onClick={() => trackPosterClick(content.docId || String(content.id))}
      className={`group/card block rounded-xl focus-visible:outline-offset-4 ${
        grid ? "" : "flex-shrink-0 w-[calc((100vw-2rem-1.5rem)/3)] sm:w-[160px] md:w-[176px]"
      }`}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-muted ring-1 ring-white/5 transition-all duration-300 group-hover/card:-translate-y-1.5 group-hover/card:ring-2 group-hover/card:ring-primary/70 group-hover/card:shadow-xl group-hover/card:shadow-black/50">
        <img
          src={getImageUrl(content.poster_path)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.06]"
          loading="lazy"
        />

        {/* Scrim + botón de reproducción que aparecen al pasar el cursor */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300">
          <span className="w-12 h-12 rounded-full bg-primary/95 text-primary-foreground flex items-center justify-center shadow-lg shadow-black/40">
            <Play className="w-5 h-5 fill-current translate-x-[1px]" />
          </span>
        </div>

        {rating > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-primary">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>

      <TitleTag className="mt-2 font-sans text-sm font-semibold leading-snug line-clamp-1 group-hover/card:text-primary transition-colors">
        {content.title}
      </TitleTag>
      <p className="text-xs text-muted-foreground">
        {content.media_type === "movie" ? "Película" : "Serie"}
        {year ? `, ${year}` : ""}
      </p>
    </Link>
  );
};

export default ContentCard;
