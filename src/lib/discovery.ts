import type { Content } from "@/types/content";
import { canonicalGenre } from "./genres";

export const moods = [
  {
    id: "mystery",
    label: "Sentir la tensión",
    genres: ["Suspenso", "Misterio", "Crimen", "Terror"],
    headline: "Esta noche, sospecha de todos.",
    description: "Secretos, pistas y una historia que te pide mirar de nuevo.",
    color: "#b7cbb6",
  },
  {
    id: "escape",
    label: "Perderme en otro mundo",
    genres: ["Ciencia ficción", "Fantasía", "Aventura"],
    headline: "Hay mundos que merecen una noche.",
    description: "Deja lo de siempre en pausa. El siguiente viaje empieza aquí.",
    color: "#b8b0e4",
  },
  {
    id: "laugh",
    label: "Desconectar y reír",
    genres: ["Comedia"],
    headline: "Hoy, que el mundo espere.",
    description: "Una buena historia. Una sonrisa inesperada. Un rato para ti.",
    color: "#efc986",
  },
  {
    id: "feel",
    label: "Sentirlo todo",
    genres: ["Drama", "Romance"],
    headline: "Algunas historias se quedan contigo.",
    description: "Encuentros, decisiones y personajes a los que cuesta decir adiós.",
    color: "#e4adab",
  },
] as const;

export const hasGenre = (item: Content, names: readonly string[]) =>
  (item.genres || []).some((g) =>
    names.some((name) => canonicalGenre(g).toLowerCase() === name.toLowerCase()),
  );

export function dailySelection(content: Content[], offset = 0) {
  const day = Math.floor(Date.now() / 86_400_000);
  const hash = (c: Content) => {
    let h = (c.id ^ day ^ (offset * 69621)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return (h ^ (h >>> 16)) >>> 0;
  };
  return [...content].sort((a, b) => hash(a) - hash(b));
}

export function selectionForSlot(content: Content[], slot: string) {
  let seed = 2166136261;
  for (const letter of slot) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  const hash = (id: number) => {
    let value = Math.imul(id ^ seed, 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return (value ^ (value >>> 16)) >>> 0;
  };
  return [...content].sort((a, b) => hash(a.id) - hash(b.id));
}
export function editorialSelection(
  content: Content[],
  moodId = "mystery",
  ids: string[] = [],
  slot?: string,
) {
  const mood = moods.find((m) => m.id === moodId) || moods[0];
  const manual = ids
    .map((id) => content.find((c) => c.docId === id || String(c.id) === id))
    .filter(Boolean) as Content[];
  const eligible = content.filter((c) => c.backdrop_path && hasGenre(c, mood.genres));
  const pool = eligible.length ? eligible : content.filter((c) => c.backdrop_path);
  const seen = new Set(manual.map((c) => `${c.media_type}:${c.id}`));
  return {
    mood,
    items: [
      ...manual,
      ...(slot ? selectionForSlot(pool, slot) : dailySelection(pool)).filter(
        (c) => !seen.has(`${c.media_type}:${c.id}`),
      ),
    ].slice(0, 5),
  };
}

export function contentReason(item: Content) {
  const genres = [...new Set((item.genres || []).map(canonicalGenre))].slice(0, 2).join(" · ");
  const duration = item.runtime
    ? `${item.runtime} min`
    : item.media_type === "tv"
      ? "Una historia por episodios"
      : "Una película para disfrutar";
  return [genres, duration].filter(Boolean).join(" / ");
}

export const collections = [
  {
    id: "mystery",
    title: "Nadie dice toda la verdad",
    subtitle: "Sigue las pistas. Desconfía del final.",
    genres: ["Misterio", "Crimen", "Suspenso"],
    color: "#b7cbb6",
  },
  {
    id: "escape",
    title: "Lejos de lo cotidiano",
    subtitle: "Otros mundos. Otras reglas. Tu próxima obsesión.",
    genres: ["Ciencia ficción", "Fantasía", "Aventura"],
    color: "#b8b0e4",
  },
  {
    id: "feel",
    title: "Historias que dejan huella",
    subtitle: "Para cuando te apetece sentirlo todo.",
    genres: ["Drama", "Romance"],
    color: "#e4adab",
  },
] as const;
