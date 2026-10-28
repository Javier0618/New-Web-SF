import type { Content } from "@/types/content";

/** Convierte un título en slug URL-friendly sin tildes */
export const slugify = (title: string): string =>
  String(title ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, "-");           // espacios → guiones

/** Genera la URL de detalle: /pelicula/nombre-slug-docId  o  /serie/nombre-slug-docId */
export const contentUrl = (content: Content): string => {
  const type = content.media_type === "movie" ? "pelicula" : "serie";
  const slug = slugify(content.title);
  return `/${type}/${slug}-${content.docId}`;
};

/** Extrae el docId (última parte tras el último guión) del slug de la URL */
export const extractDocId = (slug: string): string => {
  const parts = slug.split("-");
  return parts[parts.length - 1];
};
