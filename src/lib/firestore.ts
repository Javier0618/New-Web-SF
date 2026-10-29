import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  setDoc,
  startAfter,
  getCountFromServer,
  increment,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { syncCatalogEntry } from "./catalog";
import type { Content, Message, HomeSection } from "@/types/content";

// ---- Users ----
export const fetchUsersPaginated = async (pageSize: number, lastDoc?: QueryDocumentSnapshot) => {
  let q = query(collection(db, "users"), limit(pageSize));
  if (lastDoc) {
    q = query(collection(db, "users"), startAfter(lastDoc), limit(pageSize));
  }
  const snap = await getDocs(q);
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
  const lastVisible = snap.docs[snap.docs.length - 1];
  return { users, lastVisible };
};

export const fetchAllUsers = async () => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
};

export const updateUser = async (userId: string, data: any) => {
  return updateDoc(doc(db, "users", userId), data);
};

export const deleteUser = async (userId: string) => {
  return deleteDoc(doc(db, "users", userId));
};

// ---- Splash config ----
export const fetchSplashConfig = async () => {
  const snap = await getDoc(doc(db, "web_config", "splash"));
  return snap.exists() ? snap.data() : null;
};

export const updateSplashConfig = async (data: Record<string, any>) => {
  return setDoc(doc(db, "web_config", "splash"), data, { merge: true });
};

// ---- Import content from TMDB (using setDoc so ID = TMDB id) ----
/** Mantiene el índice del catálogo al día. Si falla, no bloquea la acción del admin. */
const syncIndex = async (docId: string) => {
  try {
    await syncCatalogEntry(docId);
  } catch (e) {
    console.warn("[catalog] No se pudo actualizar el índice:", e);
  }
};

export const importContent = async (data: Omit<Content, "docId">, tmdbId: number) => {
  await setDoc(doc(db, "content", String(tmdbId)), data);
  await syncIndex(String(tmdbId));
};

// ---- Content ----
export const getContentCollection = () => collection(db, "content");

export const fetchContentByTypePaginated = async (
  type: "movie" | "tv",
  pageSize: number,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ content: Content[]; lastVisible: QueryDocumentSnapshot | null }> => {
  let q = query(
    getContentCollection(),
    where("media_type", "==", type),
    orderBy("imported_at", "desc"),
    limit(pageSize)
  );
  if (lastDoc && typeof lastDoc.exists === 'function' && lastDoc.exists()) {
    q = query(
      getContentCollection(),
      where("media_type", "==", type),
      orderBy("imported_at", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }
  const snap = await getDocs(q);
  const content = snap.docs.map((d) => ({ ...d.data(), docId: d.id } as Content));
  const lastVisible = snap.docs[snap.docs.length - 1] || null;
  return { content, lastVisible };
};

export const fetchContentPaginated = async (pageSize: number, lastDoc?: QueryDocumentSnapshot): Promise<{ content: Content[], lastVisible: QueryDocumentSnapshot | null }> => {
  let q = query(getContentCollection(), orderBy("imported_at", "desc"), limit(pageSize));
  if (lastDoc && typeof lastDoc.exists === 'function' && lastDoc.exists()) {
    q = query(getContentCollection(), orderBy("imported_at", "desc"), startAfter(lastDoc), limit(pageSize));
  }
  const snap = await getDocs(q);
  const content = snap.docs.map((d) => ({ ...d.data(), docId: d.id } as Content));
  const lastVisible = snap.docs[snap.docs.length - 1] || null;
  return { content, lastVisible };
};

export const fetchAllContent = async (): Promise<Content[]> => {
  const q = query(getContentCollection(), orderBy("imported_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), docId: d.id } as Content));
};

export const fetchContentByType = async (type: "movie" | "tv"): Promise<Content[]> => {
  const q = query(
    getContentCollection(),
    where("media_type", "==", type),
    orderBy("imported_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), docId: d.id } as Content));
};

export const fetchContentById = async (docId: string): Promise<Content | null> => {
  const snap = await getDoc(doc(db, "content", docId));
  if (!snap.exists()) return null;
  return { ...snap.data(), docId: snap.id } as Content;
};

export const fetchContentCount = async (): Promise<number> => {
  const snap = await getCountFromServer(getContentCollection());
  return snap.data().count;
};

export const createContent = async (data: Omit<Content, "docId">) => {
  const ref = await addDoc(getContentCollection(), data);
  await syncIndex(ref.id);
  return ref;
};

export const updateContent = async (docId: string, data: Partial<Content>) => {
  await updateDoc(doc(db, "content", docId), data);
  await syncIndex(docId);
};

export const deleteContent = async (docId: string) => {
  await deleteDoc(doc(db, "content", docId));
  await syncIndex(docId);
};

// ---- Home Sections ----
export const fetchHomeSections = async (): Promise<HomeSection[]> => {
  const snap = await getDocs(collection(db, "home_sections"));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as HomeSection));
};

// ---- Messages ----
export const fetchMessages = async (userId: string): Promise<Message[]> => {
  const q = query(
    collection(db, "messages"),
    where("to", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Message));
};

export const fetchSentMessages = async (userId: string): Promise<Message[]> => {
  const q = query(
    collection(db, "messages"),
    where("from", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Message));
};

export const fetchAllMessages = async (): Promise<Message[]> => {
  const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Message));
};

export const sendMessage = async (from: string, to: string, message: string) => {
  return addDoc(collection(db, "messages"), {
    from,
    to,
    message,
    createdAt: serverTimestamp(),
    read: false,
  });
};

export const markMessageRead = async (messageId: string) => {
  return updateDoc(doc(db, "messages", messageId), { read: true });
};

export const deleteMessage = async (messageId: string) => {
  return deleteDoc(doc(db, "messages", messageId));
};

// ---- Web Config ----
export const fetchWebConfig = async () => {
  const snap = await getDoc(doc(db, "web_config", "settings"));
  return snap.exists() ? snap.data() : null;
};

export const updateWebConfig = async (data: Record<string, any>) => {
  // Reemplazo completo (sin merge): el panel carga el documento entero y lo
  // edita, así que guardarlo tal cual permite que apagar opciones, vaciar mapas
  // (p. ej. "restablecer colores") o quitar elementos se apliquen de verdad.
  // Con merge:true Firestore nunca borraba claves dentro de mapas anidados.
  return setDoc(doc(db, "web_config", "settings"), data);
};

// ---- Modal Sections ----
export const fetchModalSections = async () => {
  const snap = await getDocs(collection(db, "modal_sections"));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
};

// ---- Poster Clicks ----
// Una sola escritura atómica (antes: 1 lectura + 1 escritura por clic).
export const trackPosterClick = async (posterId: string) => {
  try {
    await setDoc(doc(db, "posterClicks", posterId), { clicks: increment(1) }, { merge: true });
  } catch {
    /* estadística no crítica */
  }
};

export const fetchPosterClicks = async () => {
  const snap = await getDocs(collection(db, "posterClicks"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ---- User MyList ----
export const fetchUserProfile = async (userId: string) => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addToMyList = async (userId: string, item: {
  id: number;
  media_type: string;
  title: string;
  poster_path: string;
  release_date?: string;
}) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return;
  
  const data = userDoc.data();
  const myList = data.myList || [];
  
  // Check if already in list
  if (myList.some((x: any) => x.id === item.id)) return false;
  
  myList.push({
    ...item,
    lastVisited: new Date().toISOString(),
  });
  
  await updateDoc(userRef, { myList });
  return true;
};

export const removeFromMyList = async (userId: string, contentId: number) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return;
  
  const data = userDoc.data();
  const myList = (data.myList || []).filter((x: any) => x.id !== contentId);
  await updateDoc(userRef, { myList });
};

export const fetchMyList = async (userId: string) => {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) return [];
  const data = userDoc.data();
  return data.myList || [];
};
