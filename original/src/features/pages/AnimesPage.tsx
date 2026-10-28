import { useMemo } from "react";
import { useNavigate } from "@/lib/react-router-shim";
import Navbar from "@/components/layout/Navbar";
import ContentCard from "@/components/home/ContentCard";
import { useContent } from "@/hooks/useContent";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { Loader2, ArrowLeft } from "lucide-react";
import AdBanner from "@/components/ads/AdBanner";

const AnimesPage = () => {
  const { content, loading } = useContent();
  const navigate = useNavigate();

  const filtered = useMemo(
    () => content.filter((c) => c.display_options?.main_sections?.includes("animes")),
    [content]
  );

  const { displayed, hasMore, sentinelRef } = useInfiniteScroll(filtered);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4 md:px-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold">Animes</h1>
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Inicio
          </button>
        </div>
        <AdBanner slot="animes_top" className="my-4" />
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No se encontró contenido de animes.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
              {displayed.map((item, i) => (
                <ContentCard key={item.docId || item.id} content={item} index={i % 30} grid />
              ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-8">
              {hasMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            </div>
          </>
        )}
        <AdBanner slot="animes_bottom" className="my-4" />
      </div>
    </div>
  );
};

export default AnimesPage;
