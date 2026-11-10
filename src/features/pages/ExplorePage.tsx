import { useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ContentCard from "@/components/home/ContentCard";
import IntentBar from "@/components/home/IntentBar";
import { useContent } from "@/hooks/useContent";
import { collections, hasGenre } from "@/lib/discovery";
import { canonicalGenre } from "@/lib/genres";

export default function ExplorePage() {
  const { content, loading } = useContent();
  const [params, setParams] = useSearchParams();
  const limit = Math.max(42, Math.min(content.length || 42, Number(params.get("count")) || 42));
  const type = params.get("type") || "all";
  const genre = params.get("genre") || "all";
  const collection = collections.find((c) => c.id === params.get("collection"));
  const genres = useMemo(
    () =>
      [...new Set(content.flatMap((c) => c.genres || []).map(canonicalGenre))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [content],
  );
  const items = useMemo(
    () =>
      content.filter((c) => {
        if (type === "movie" || type === "tv") {
          if (c.media_type !== type) return false;
        } else if (type !== "all" && !c.display_options?.main_sections?.includes(type))
          return false;
        return (
          (genre === "all" || hasGenre(c, [genre])) &&
          (!collection || hasGenre(c, collection.genres))
        );
      }),
    [content, type, genre, collection],
  );
  const filter = (key: string, value: string) => {
    setParams((previous) => {
      const p = new URLSearchParams(previous);
      if (value === "all") p.delete(key);
      else p.set(key, value);
      p.delete("count");
      return p;
    });
  };
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="sf-explore-main">
        <div className="sf-section sf-explore-heading">
          <span className="sf-eyebrow">EL UNIVERSO STREAMFUSION</span>
          <h1>{collection?.title || "Sigue tu curiosidad."}</h1>
          <p>
            {collection?.subtitle ||
              "Una película para hoy. Una serie para quedarte. Encuentra tu siguiente historia."}
          </p>
          <Link className="sf-text-link" to="/search">
            <Search size={16} /> ¿Ya tienes algo en mente? Búscalo <ArrowUpRight size={16} />
          </Link>
        </div>
        {!collection && <IntentBar content={content} />}
        <section className="sf-section">
          <div className="sf-explore-filters">
            <label>
              Qué quieres ver
              <select value={type} onChange={(e) => filter("type", e.target.value)}>
                <option value="all">Todo el catálogo</option>
                <option value="movie">Películas</option>
                <option value="tv">Series</option>
                <option value="animes">Anime</option>
                <option value="doramas">Doramas</option>
              </select>
            </label>
            <label>
              Tu género
              <select value={genre} onChange={(e) => filter("genre", e.target.value)}>
                <option value="all">Todos los géneros</option>
                {genres.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            {collection && (
              <button className="sf-text-link" onClick={() => filter("collection", "all")}>
                Quitar colección
              </button>
            )}
            <p aria-live="polite">
              {loading ? "Abriendo el catálogo…" : `${items.length} historias por descubrir`}
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-3 gap-y-6">
            {items.slice(0, limit).map((c) => (
              <ContentCard key={c.docId || c.id} content={c} grid />
            ))}
          </div>
          {!loading && !items.length && (
            <p className="sf-empty">No hay títulos con estos filtros. Prueba otro género.</p>
          )}
          {items.length > limit && (
            <button
              className="sf-button-secondary mx-auto mt-8"
              onClick={() =>
                setParams(
                  (previous) => {
                    const p = new URLSearchParams(previous);
                    p.set("count", String(limit + 42));
                    return p;
                  },
                  { replace: true },
                )
              }
            >
              Descubrir más historias
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
