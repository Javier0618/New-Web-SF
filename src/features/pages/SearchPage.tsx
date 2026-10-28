import { useMemo, useState, useEffect, useDeferredValue } from "react";
import { useSearchParams } from "@/lib/react-router-shim";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ContentCard from "@/components/home/ContentCard";
import { useContent } from "@/hooks/useContent";
import type { Content } from "@/types/content";

/** Strip diacritics and lowercase — makes search accent-insensitive */
const normalize = (str: unknown): string =>
  String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const SearchPage = () => {
  const { content, loading } = useContent();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");

  // Sync query from URL param when navigating from Navbar
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  // Mantiene el input fluido en móviles con catálogos grandes
  const deferredQuery = useDeferredValue(query);

  const results = useMemo<Content[]>(() => {
    const q = normalize(deferredQuery);
    if (!q) return [];

    return content.filter((c) => {
      // Type filter
      if (typeFilter !== "all" && c.media_type !== typeFilter) return false;

      // Search in: title (ES), original_title (EN), overview, genres
      const fields = [c.title, c.original_title ?? "", c.overview ?? "", ...(c.genres ?? [])].map(
        normalize,
      );

      return fields.some((f) => f.includes(q));
    });
  }, [content, deferredQuery, typeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search header */}
      <div className="pt-24 pb-6 px-4 md:px-10">
        <h1 className="font-display font-condensed text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
          Buscar
        </h1>

        {/* Search input */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título, actor o género, en español o inglés"
            className="w-full pl-12 pr-12 py-4 rounded-2xl bg-card border border-border text-foreground placeholder:text-muted-foreground text-base focus:outline-none focus:border-primary transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-2 mt-4">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          {(["all", "movie", "tv"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary hover:text-foreground"
              }`}
            >
              {t === "all" ? "Todo" : t === "movie" ? "Películas" : "Series"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 md:px-10 pb-16">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : query === "" ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
            <Search className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">Escribe un título para empezar</p>
            <p className="text-sm opacity-70">Da igual si usas tildes o el título en inglés</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
            <X className="w-12 h-12 opacity-30" />
            <p className="text-lg font-medium">Sin resultados para "{query}"</p>
            <p className="text-sm opacity-70">Prueba con el título original o con menos palabras</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={query + typeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm text-muted-foreground mb-4">
                {results.length} resultado{results.length !== 1 ? "s" : ""} para "{query}"
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-5 md:gap-x-4 md:gap-y-6">
                {results.map((item, i) => (
                  <ContentCard key={item.docId || item.id} content={item} index={i} grid />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
