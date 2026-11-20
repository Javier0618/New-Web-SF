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
  type LocalCache,
} from "@/lib/catalog";
import { readPublicCatalog } from "@/lib/publicCatalog";
import { fetchTmdbDetails } from "@/lib/tmdb";
import type { Content } from "@/types/content";

/**
 * Usa instantáneas ligeras publicadas por el sincronizador del VPS. Conserva
 * compatibilidad con el índice Firestore si no existe todavía ese servicio.
 */
const loadCatalog = async ({ signal }: { signal?: AbortSignal } = {}): Promise<LocalCache> => {
  const snapshot = await readPublicCatalog(signal);
  if (snapshot) {
    writeLocalCatalog(snapshot.items, snapshot.revision);
    return snapshot;
  }
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
  return { items, t: Date.now() };
};

export const useContent = (type?: "movie" | "tv") => {
  const {
    data,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ["catalog"],
    queryFn: loadCatalog,
    initialData: () => readLocalCatalog() ?? undefined,
    initialDataUpdatedAt: () => readLocalCatalog()?.t,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const all = data?.items ?? [];
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
          runtime: tmdbData.runtime,
          episode_run_time: tmdbData.episode_run_time,
          status: tmdbData.status,
          original_language: tmdbData.original_language,
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
