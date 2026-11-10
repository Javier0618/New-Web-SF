import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { collections, hasGenre, dailySelection } from "@/lib/discovery";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import type { Content } from "@/types/content";

export default function EditorialCollections({ content }: { content: Content[] }) {
  return (
    <section className="sf-section sf-collections" aria-labelledby="collections-title">
      <div className="sf-section-heading">
        <div>
          <span className="sf-eyebrow">HISTORIAS QUE COMPARTEN ALGO</span>
          <h2 id="collections-title">Sigue tu curiosidad.</h2>
        </div>
        <Link to="/explore" className="sf-text-link">
          Todo el universo <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="sf-collection-grid">
        {collections.map((collection, i) => {
          const pool = dailySelection(
            content.filter((c) => hasGenre(c, collection.genres) && c.poster_path),
            i + 4,
          ).slice(0, 3);
          if (!pool.length) return null;
          return (
            <article
              key={collection.id}
              className="sf-collection-card"
              style={{ "--sf-collection-color": collection.color } as CSSProperties}
            >
              <Link to={`/explore?collection=${collection.id}`} className="sf-collection-title">
                <span className="sf-eyebrow">COLECCIÓN 0{i + 1}</span>
                <h3>{collection.title}</h3>
                <p>{collection.subtitle}</p>
                <span className="sf-collection-open" aria-label="Abrir colección">
                  <ArrowUpRight size={20} />
                </span>
              </Link>
              <div className="sf-collection-posters">
                {pool.map((c) => (
                  <Link key={c.docId || c.id} to={contentUrl(c)} aria-label={c.title}>
                    <img src={getImageUrl(c.poster_path, "w300")} alt="" loading="lazy" />
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
