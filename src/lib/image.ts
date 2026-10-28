const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/";

export const getImageUrl = (
  path: string | undefined,
  size: "w200" | "w300" | "w500" | "w780" | "w1280" | "original" = "w500",
): string => {
  if (!path) return "/placeholder.svg";
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}${size}/${path.replace(/^\//, "")}`;
};

/**
 * Fondo grande. Antes usaba "original" (varios MB por imagen); w1280 se ve
 * igual en pantalla y pesa una fracción. Si no hay backdrop, usa el póster.
 */
export const getBackdropUrl = (backdrop: string | undefined, poster?: string): string => {
  if (backdrop) return getImageUrl(backdrop, "w1280");
  return getImageUrl(poster, "w780");
};
