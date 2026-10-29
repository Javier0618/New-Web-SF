import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Laugh, Swords, Heart, Ghost, Rocket, Users, Sparkles, Drama, X } from "lucide-react";
import type { Content } from "@/types/content";
import { getGenreName } from "@/lib/genres";
import ContentCarousel from "./ContentCarousel";

/**
 * Barra de intención: en vez de obligar a cazar entre filas de pósters, el
 * visitante dice QUÉ le apetece y el catálogo responde al instante.
 *
 * Es el diferenciador de la portada. Todo el filtrado es local (sobre el
 * catálogo ya cargado), así que no añade lecturas de Firestore.
 */

type Matcher = (c: Content) => boolean;

/** Normaliza un texto: minúsculas y sin acentos, para comparar géneros ES/EN. */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** ¿Alguno de los géneros del título cae en estas palabras clave? */
const byGenre =
  (...keywords: string[]): Matcher =>
  (c) =>
    (c.genres || []).some((g) => {
      const name = norm(getGenreName(String(g)));
      return keywords.some((k) => name.includes(k));
    });

/** ¿Está en una sección principal concreta (animes, doramas…)? */
const bySection =
  (section: string): Matcher =>
  (c) =>
    c.display_options?.main_sections?.includes(section) ?? false;

interface Mood {
  id: string;
  label: string;
  Icon: typeof Laugh;
  match: Matcher;
}

const MOODS: Mood[] = [
  { id: "reir", label: "Para reír", Icon: Laugh, match: byGenre("comedia", "comedy") },
  {
    id: "accion",
    label: "Acción",
    Icon: Swords,
    match: byGenre("accion", "action", "aventura", "adventure"),
  },
  {
    id: "romance",
    label: "Romance",
    Icon: Heart,
    match: byGenre("romance", "romantica", "telenovela"),
  },
  {
    id: "suspenso",
    label: "Suspenso",
    Icon: Ghost,
    match: byGenre("suspenso", "thriller", "misterio", "mystery", "crimen", "crime", "terror", "horror"),
  },
  {
    id: "scifi",
    label: "Ciencia ficción",
    Icon: Rocket,
    match: byGenre("ciencia ficcion", "sci-fi", "science", "fantasia", "fantasy"),
  },
  {
    id: "familia",
    label: "En familia",
    Icon: Users,
    match: byGenre("familia", "family", "infantil", "kids", "animacion", "animation"),
  },
  { id: "anime", label: "Anime", Icon: Sparkles, match: bySection("animes") },
  { id: "doramas", label: "Doramas", Icon: Drama, match: bySection("doramas") },
];

interface IntentBarProps {
  content: Content[];
}

const IntentBar = ({ content }: IntentBarProps) => {
  const [active, setActive] = useState<string | null>(null);

  const activeMood = MOODS.find((m) => m.id === active) || null;

  const results = useMemo(() => {
    if (!activeMood) return [];
    return content.filter(activeMood.match).slice(0, 24);
  }, [activeMood, content]);

  const toggle = (id: string) => setActive((prev) => (prev === id ? null : id));

  return (
    <section aria-label="¿Qué te apetece ver?" className="px-4 md:px-10 pt-6 pb-2">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">
          ¿Qué te apetece esta noche?
        </h2>
        <AnimatePresence>
          {active && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap pb-1">
        {MOODS.map(({ id, label, Icon }) => {
          const on = id === active;
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={`inline-flex items-center gap-2 flex-shrink-0 h-10 pl-3.5 pr-4 rounded-full border text-sm font-semibold transition-colors ${
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/40 text-foreground/80 border-border hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeMood && (
          <motion.div
            key={activeMood.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-6 -mx-4 md:-mx-10"
          >
            {results.length > 0 ? (
              <ContentCarousel title={`${activeMood.label} · ${results.length}`} items={results} />
            ) : (
              <p className="px-4 md:px-10 text-muted-foreground">
                Aún no hay nada en «{activeMood.label}». Prueba otro estado de ánimo.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default IntentBar;
