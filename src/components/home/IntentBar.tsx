import { useMemo, useState } from "react";
import { ArrowUpRight, RotateCw, Sparkles, Clock3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Content } from "@/types/content";
import { moods, hasGenre, dailySelection, contentReason } from "@/lib/discovery";
import { getImageUrl } from "@/lib/image";
import { contentUrl } from "@/lib/slug";
import { useQuery } from "@tanstack/react-query";
import { fetchMovieRuntime } from "@/lib/tmdb";
import { trackExperience } from "@/lib/experienceAnalytics";

const IntentBar = ({ content }: { content: Content[] }) => {
  const [mood, setMood] = useState("all");
  const [time, setTime] = useState("any");
  const [company, setCompany] = useState("solo");
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const shortCandidates = useMemo(
    () =>
      dailySelection(
        content.filter(
          (c) =>
            c.media_type === "movie" &&
            (!moods.find((m) => m.id === mood) ||
              hasGenre(c, moods.find((m) => m.id === mood)!.genres)) &&
            (company === "solo" ||
              hasGenre(
                c,
                company === "family"
                  ? ["Familia", "Animación"]
                  : company === "couple"
                    ? ["Romance", "Comedia", "Drama"]
                    : ["Acción", "Comedia", "Suspenso", "Terror", "Aventura"],
              )),
        ),
        27,
      ).slice(0, 18),
    [content, mood, company],
  );
  const { data: runtimeData = {}, isFetching: loadingTimes } = useQuery({
    queryKey: ["night-runtime", shortCandidates.map((c) => c.id).join(",")],
    enabled: time === "short" && started && shortCandidates.length > 0,
    staleTime: 7 * 86400_000,
    retry: false,
    queryFn: async () => {
      const pairs: Array<[number, number]> = [];
      for (let i = 0; i < shortCandidates.length; i += 3)
        pairs.push(
          ...(await Promise.all(
            shortCandidates
              .slice(i, i + 3)
              .map(
                async (c): Promise<[number, number]> => [
                  c.id,
                  c.runtime || (await fetchMovieRuntime(c.id).catch(() => 0)),
                ],
              ),
          )),
        );
      return Object.fromEntries(pairs) as Record<string, number>;
    },
  });
  const pool = useMemo(
    () =>
      content
        .filter((c) => {
          const selected = moods.find((m) => m.id === mood);
          if (selected && !hasGenre(c, selected.genres)) return false;
          if (time === "episode" && c.media_type !== "tv") return false;
          const runtime = c.runtime || runtimeData[String(c.id)];
          if (time === "short" && (c.media_type !== "movie" || !runtime || runtime > 100))
            return false;
          if (time === "marathon" && c.media_type !== "tv") return false;
          if (company === "family" && !hasGenre(c, ["Familia", "Animación"])) return false;
          if (company === "couple" && !hasGenre(c, ["Romance", "Comedia", "Drama"])) return false;
          if (
            company === "friends" &&
            !hasGenre(c, ["Acción", "Comedia", "Suspenso", "Terror", "Aventura"])
          )
            return false;
          return true;
        })
        .map((c) =>
          time === "short" ? { ...c, runtime: c.runtime || runtimeData[String(c.id)] } : c,
        ),
    [content, mood, time, company, runtimeData],
  );
  const results = useMemo(() => {
    const sorted = dailySelection(pool, 17);
    if (!sorted.length) return [];
    return Array.from(
      { length: Math.min(3, sorted.length) },
      (_, i) => sorted[(round * 3 + i) % sorted.length],
    );
  }, [pool, round]);
  const update = (fn: () => void) => {
    fn();
    setRound(0);
  };
  return (
    <section
      id="elige-tu-noche"
      className="sf-night-section sf-section"
      aria-labelledby="night-title"
    >
      <div className="sf-section-heading">
        <div>
          <span className="sf-eyebrow">MENOS BUSCAR. MÁS DISFRUTAR.</span>
          <h2 id="night-title">
            Elige tu noche<span className="sf-accent">.</span>
          </h2>
        </div>
        <p>
          Tú pones las ganas.
          <br />
          Nosotros, las historias.
        </p>
      </div>
      <div className="sf-night-controls">
        <label>
          <span>
            <Sparkles size={15} /> ¿Qué te apetece?
          </span>
          <select value={mood} onChange={(e) => update(() => setMood(e.target.value))}>
            <option value="all">Estoy abierto a todo</option>
            {moods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>
            <Clock3 size={15} /> ¿De cuánto tiempo dispones?
          </span>
          <select value={time} onChange={(e) => update(() => setTime(e.target.value))}>
            <option value="any">Sin mirar el reloj</option>
            <option value="episode">Me apetece un episodio</option>
            <option value="short">Una película de hasta 100 min</option>
            <option value="marathon">Hoy toca maratón</option>
          </select>
        </label>
        <label>
          <span>
            <Users size={15} /> ¿Con quién lo vas a ver?
          </span>
          <select value={company} onChange={(e) => update(() => setCompany(e.target.value))}>
            <option value="solo">Un rato para mí</option>
            <option value="couple">En pareja</option>
            <option value="friends">Con amigos</option>
            <option value="family">Animación y familia</option>
          </select>
        </label>
        <button
          className="sf-button-primary"
          onClick={() => {
            trackExperience("night_discovery", {
              mood,
              time,
              company,
              action: started ? "refresh" : "start",
            });
            setStarted(true);
            if (started) setRound((r) => r + 1);
          }}
        >
          {started ? <RotateCw size={16} /> : <ArrowUpRight size={18} />}
          {started ? "Dame otras tres" : "Encuentra mi historia"}
        </button>
      </div>
      {started && (
        <div className="sf-night-results" aria-live="polite">
          {results.map((item, i) => (
            <Link key={item.docId || item.id} to={contentUrl(item)} className="sf-night-result">
              <img
                src={getImageUrl(item.backdrop_path || item.poster_path, "w500")}
                alt=""
                loading="lazy"
              />
              <div>
                <span className="sf-eyebrow">TU OPCIÓN 0{i + 1}</span>
                <h3>{item.title}</h3>
                <p>{contentReason(item)}</p>
                <span className="sf-result-link">
                  Descubrir <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
          {results.length === 0 && (
            <p className="sf-empty" role="status">
              {loadingTimes
                ? "Buscando historias que encajen en tu tiempo…"
                : "No hay títulos con esta combinación. Prueba otra emoción o amplía el tiempo disponible."}
            </p>
          )}
        </div>
      )}
      {time === "short" && (
        <p className="sf-control-note">
          Solo mostramos películas con duración confirmada en el catálogo.
        </p>
      )}
      {company === "family" && (
        <p className="sf-control-note">
          Selección por género. Consulta la clasificación por edades de cada título.
        </p>
      )}
    </section>
  );
};
export default IntentBar;
