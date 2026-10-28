/**
 * Índice del catálogo.
 *
 * Problema que resuelve: antes cada visitante descargaba la colección
 * `content` completa (1 lectura de Firestore por título). Con el plan gratuito
 * (50.000 lecturas/día) bastaban unas decenas de visitas para agotar la cuota.
 *
 * Ahora guardamos un resumen ligero de todos los títulos (sin temporadas ni
 * URLs de video) repartido en unos pocos documentos `web_config/catalog_N`.
 * Un visitante hace 1-3 lecturas en total, y además se cachea en el navegador.
 *
 * El admin mantiene el índice actualizado automáticamente al importar, editar
 * o borrar contenido (ver firestore.ts), y puede reconstruirlo desde el panel.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Content } from "@/types/content";

const CHUNK_COLLECTION = "web_config";
const CHUNK_PREFIX = "catalog_";
// Límite de Firestore: 1 MiB por documento. Dejamos margen.
const MAX_CHUNK_BYTES = 700_000;
const OVERVIEW_MAX = 300;

const LOCAL_KEY = "sf_catalog_v1";
const LOCAL_TTL_MS = 10 * 60 * 1000;

type CatalogItem = Omit<Content, "seasons" | "video_url" | "credits" | "imported_by">;

const chunkRef = (i: number) => doc(db, CHUNK_COLLECTION, `${CHUNK_PREFIX}${i}`);

/** Firestore rechaza `undefined`: lo eliminamos. */
const stripUndefined = <T extends Record<string, unknown>>(obj: T): T =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;

export const toCatalogItem = (c: Content): CatalogItem =>
  stripUndefined({
    docId: c.docId,
    id: c.id,
    media_type: c.media_type,
    title: c.title,
    original_title: c.original_title,
    overview: (c.overview || "").slice(0, OVERVIEW_MAX),
    poster_path: c.poster_path,
    backdrop_path: c.backdrop_path,
    release_date: c.release_date,
    vote_average: c.vote_average,
    genres: c.genres || [],
    display_options: c.display_options,
    imported_at: c.imported_at,
  });

const sortByImported = (items: CatalogItem[]) =>
  [...items].sort((a, b) => (b.imported_at?.seconds || 0) - (a.imported_at?.seconds || 0));

// ---------- Lectura (visitantes) ----------

/** Devuelve el catálogo desde el índice, o `null` si el índice aún no existe. */
export const readCatalogIndex = async (): Promise<Content[] | null> => {
  const first = await getDoc(chunkRef(0));
  if (!first.exists()) return null;
  const parts = Number(first.data().parts) || 1;
  const rest = await Promise.all(
    Array.from({ length: parts - 1 }, (_, i) => getDoc(chunkRef(i + 1))),
  );
  const items = [first, ...rest].flatMap((s) => (s.exists() ? s.data().items || [] : []));
  return items as Content[];
};

interface LocalCache {
  t: number;
  items: Content[];
}

export const readLocalCatalog = (): LocalCache | null => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCache;
    if (!parsed?.items || Date.now() - parsed.t > LOCAL_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeLocalCatalog = (items: Content[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ t: Date.now(), items }));
  } catch {
    /* cuota del navegador llena o modo privado: ignoramos */
  }
};

export const clearLocalCatalog = () => {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
};

// ---------- Escritura (solo admin) ----------

const splitInChunks = (items: CatalogItem[]): CatalogItem[][] => {
  const chunks: CatalogItem[][] = [[]];
  let size = 0;
  for (const item of items) {
    const itemSize = JSON.stringify(item).length + 50;
    if (size + itemSize > MAX_CHUNK_BYTES && chunks[chunks.length - 1].length > 0) {
      chunks.push([]);
      size = 0;
    }
    chunks[chunks.length - 1].push(item);
    size += itemSize;
  }
  return chunks;
};

const writeCatalogIndex = async (items: CatalogItem[]) => {
  const previous = await getDoc(chunkRef(0));
  const previousParts = previous.exists() ? Number(previous.data().parts) || 1 : 0;

  const chunks = splitInChunks(sortByImported(items));
  const batch = writeBatch(db);
  chunks.forEach((chunk, i) => {
    batch.set(chunkRef(i), {
      items: chunk,
      part: i,
      parts: chunks.length,
      count: items.length,
      updatedAt: serverTimestamp(),
    });
  });
  for (let i = chunks.length; i < previousParts; i++) batch.delete(chunkRef(i));
  await batch.commit();
  clearLocalCatalog();
};

/** Lee toda la colección `content` y regenera el índice. */
export const rebuildCatalogIndex = async (): Promise<number> => {
  const snap = await getDocs(query(collection(db, "content"), orderBy("imported_at", "desc")));
  const items = snap.docs.map((d) => toCatalogItem({ ...(d.data() as Content), docId: d.id }));
  await writeCatalogIndex(items);
  return items.length;
};

/**
 * Sincroniza una entrada del índice con el documento real de `content`.
 * Si el índice todavía no existe, no hace nada (se crea con "Reconstruir").
 */
export const syncCatalogEntry = async (docId: string) => {
  const current = await readCatalogIndex();
  if (!current) return;
  const snap = await getDoc(doc(db, "content", docId));
  const others = (current as CatalogItem[]).filter((c) => c.docId !== docId);
  if (snap.exists()) {
    const data = snap.data() as Content;
    others.push(
      toCatalogItem({
        ...data,
        docId,
        // serverTimestamp() aún pendiente en una importación recién hecha
        imported_at: data.imported_at || Timestamp.now(),
      }),
    );
  }
  await writeCatalogIndex(others);
};
