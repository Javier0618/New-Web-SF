import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchAllContent,
  fetchContentById,
  fetchContentPaginated,
  fetchContentByTypePaginated,
} from "@/lib/firestore";
import {
  readCatalogIndex,
  readLocalCatalog,
  writeLocalCatalog,
  toCatalogItem,
} from "@/lib/catalog";
import { fetchTmdbDetails } from "@/lib/tmdb";
import type { Content } from "@/types/content";

/**
 * Carga el catálogo: primero caché del navegador, luego el índice ligero
 * (1-3 lecturas). Solo si el índice todavía no existe se recurre a leer la
 * colección completa, como hacía la versión anterior.
 */
const loadCatalog = async (): Promise<Content[]> => {
  let items: Content[] | null = null;
  try {
    items = await readCatalogIndex();
  } catch (e) {
    console.warn("[catalog] Índice no disponible, usando colección completa:", e);
  }
  // Sin índice: se lee la colección completa, pero solo se conserva el resumen
  // (los documentos completos con temporadas no caben en la caché del navegador).
  if (!items) items = (await fetchAllContent()).map((c) => toCatalogItem(c) as Content);
  writeLocalCatalog(items);
  return items;
};

export const useContent = (type?: "movie" | "tv") => {
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["catalog"],
    queryFn: loadCatalog,
    initialData: () => readLocalCatalog()?.items,
    initialDataUpdatedAt: () => readLocalCatalog()?.t,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const all = data ?? [];
  const content = type ? all.filter((c) => c.media_type === type) : all;
  return { content, loading, refetch };
};

export const useInfiniteContent = (type?: "movie" | "tv", pageSize = 20) => {
  return useInfiniteQuery<any>({
    queryKey: ["content-infinite", type ?? "all"],
    queryFn: ({ pageParam }) =>
      type
        ? fetchContentByTypePaginated(type, pageSize, pageParam as any)
        : fetchContentPaginated(pageSize, pageParam as any),
    initialPageParam: null,
    getNextPageParam: (lastPage: any) => lastPage.lastVisible,
    staleTime: 5 * 60 * 1000,
  });
};

export const useContentDetail = (docId: string | undefined) => {
  const { data: content = null, isLoading: loading } = useQuery({
    queryKey: ["content-detail", docId],
    queryFn: async () => {
      const firestoreContent = await fetchContentById(docId!);
      if (!firestoreContent) return null;

      try {
        // Créditos de TMDB en tiempo real
        const tmdbData = await fetchTmdbDetails(firestoreContent.id, firestoreContent.media_type);
        return {
          ...firestoreContent,
          credits: tmdbData.credits,
        };
      } catch (error) {
        console.error("Error fetching TMDB credits:", error);
        return firestoreContent;
      }
    },
    enabled: !!docId,
    staleTime: 5 * 60 * 1000,
  });

  return { content, loading };
};
