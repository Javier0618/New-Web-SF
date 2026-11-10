import { useState } from "react";
import { useContent } from "@/hooks/useContent";
import { moods } from "@/lib/discovery";
import {
  heroPeriods,
  resolveHeroSlot,
  type EditorialConfig,
  type EditorialSlot,
} from "@/lib/heroSchedule";
import type { DayPeriod } from "@/hooks/useLocalTime";
export type { EditorialConfig } from "@/lib/heroSchedule";
export default function EditorialSettings({
  value,
  onChange,
}: {
  value: EditorialConfig;
  onChange: (value: EditorialConfig) => void;
}) {
  const { content } = useContent();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<DayPeriod>("night");
  const legacyNight: EditorialSlot = {
    mood: value.mood || "",
    headline: value.headline || "",
    description: value.description || "",
    ids: value.ids || [],
  };
  const slot = value.periods?.[period] || (period === "night" ? legacyNight : {});
  const resolved = resolveHeroSlot(value, period);
  const update = (patch: EditorialSlot) =>
    onChange({ ...value, periods: { ...value.periods, [period]: { ...slot, ...patch } } });
  const input = "w-full px-3 py-2 bg-secondary rounded-md border border-border text-sm";
  const ids = slot.ids || [];
  return (
    <section className="border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold">Cartelera según la hora del visitante</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Mañana: 05:00–11:59 · Tarde: 12:00–18:59 · Noche: 19:00–04:59. Los campos vacíos usan el
          texto de cada franja.
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Franja de la cartelera">
        {(Object.keys(heroPeriods) as DayPeriod[]).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={period === key}
            className={`px-4 py-2 rounded-md text-sm ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            onClick={() => {
              setPeriod(key);
              setQuery("");
            }}
          >
            {heroPeriods[key].label}
          </button>
        ))}
      </div>
      <label className="block text-xs space-y-2">
        <span>Ambiente</span>
        <select
          className={input}
          value={resolved.mood}
          onChange={(e) => update({ mood: e.target.value })}
        >
          {moods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs space-y-2">
        <span>Titular de portada</span>
        <input
          className={input}
          value={slot.headline || ""}
          maxLength={90}
          placeholder={heroPeriods[period].headline}
          onChange={(e) => update({ headline: e.target.value })}
        />
      </label>
      <label className="block text-xs space-y-2">
        <span>Introducción</span>
        <textarea
          className={input}
          value={slot.description || ""}
          placeholder={heroPeriods[period].description}
          maxLength={180}
          rows={2}
          onChange={(e) => update({ description: e.target.value })}
        />
      </label>
      <div className="space-y-2">
        <p className="text-xs">
          Títulos fijados para {heroPeriods[period].label.toLowerCase()} ({ids.length}/5). Los
          espacios libres se completan automáticamente según el ambiente y se renuevan en cada
          franja de cada día.
        </p>
        {ids.map((id) => (
          <button
            type="button"
            key={id}
            className="block text-xs text-primary"
            onClick={() => update({ ids: ids.filter((x) => x !== id) })}
          >
            {content.find((c) => c.docId === id || String(c.id) === id)?.title || id} · Quitar
          </button>
        ))}
        <input
          className={input}
          value={query}
          placeholder="Buscar un título para fijarlo…"
          aria-label="Buscar título de portada"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="max-h-44 overflow-auto">
            {content
              .filter(
                (c) =>
                  c.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
                  !ids.includes(c.docId || String(c.id)),
              )
              .slice(0, 12)
              .map((c) => (
                <button
                  type="button"
                  disabled={ids.length >= 5}
                  className="block text-left w-full p-2 text-xs hover:bg-secondary disabled:opacity-40"
                  key={c.docId || c.id}
                  onClick={() => {
                    update({ ids: [...ids, c.docId || String(c.id)] });
                    setQuery("");
                  }}
                >
                  {c.title} · {c.release_date?.slice(0, 4)}
                </button>
              ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Usa «Guardar Configuración» para publicar esta selección.
      </p>
    </section>
  );
}
