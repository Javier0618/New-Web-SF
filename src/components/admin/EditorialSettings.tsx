import { useState } from "react";
import { useContent } from "@/hooks/useContent";
import { moods } from "@/lib/discovery";

export interface EditorialConfig {
  mood?: string;
  headline?: string;
  description?: string;
  ids?: string[];
}
export default function EditorialSettings({
  value,
  onChange,
}: {
  value: EditorialConfig;
  onChange: (value: EditorialConfig) => void;
}) {
  const { content } = useContent();
  const [query, setQuery] = useState("");
  const input = "w-full px-3 py-2 bg-secondary rounded-md border border-border text-sm";
  const ids = value.ids || [];
  return (
    <section className="border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold">La selección de la noche</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Personaliza la portada editorial. Los campos vacíos usan el texto del ambiente elegido.
        </p>
      </div>
      <label className="block text-xs space-y-2">
        <span>Ambiente</span>
        <select
          className={input}
          value={value.mood || "mystery"}
          onChange={(e) => onChange({ ...value, mood: e.target.value })}
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
          value={value.headline || ""}
          maxLength={90}
          placeholder="Esta noche, sospecha de todos."
          onChange={(e) => onChange({ ...value, headline: e.target.value })}
        />
      </label>
      <label className="block text-xs space-y-2">
        <span>Introducción</span>
        <textarea
          className={input}
          value={value.description || ""}
          maxLength={180}
          rows={2}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </label>
      <div className="space-y-2">
        <p className="text-xs">
          Títulos fijados ({ids.length}/5). Sin selección, la portada se renueva cada día según el
          ambiente.
        </p>
        {ids.map((id) => (
          <button
            type="button"
            key={id}
            className="block text-xs text-primary"
            onClick={() => onChange({ ...value, ids: ids.filter((x) => x !== id) })}
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
                    onChange({ ...value, ids: [...ids, c.docId || String(c.id)] });
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
