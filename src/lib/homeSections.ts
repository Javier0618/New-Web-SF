/**
 * Modelo de las secciones (filas) de la portada.
 *
 * El orden y la activación los controla el admin desde el panel (pestaña
 * "Secciones") y se guardan en `web_config.homeOrder`. La portada (Index)
 * resuelve ese orden contra esta lista canónica, de modo que si se agrega una
 * sección nueva en el código, aparece al final y activada por defecto.
 */

export interface HomeSectionDef {
  id: string;
  label: string;
}

export const HOME_SECTIONS: HomeSectionDef[] = [
  { id: "intent", label: "¿Qué te apetece? (barra de intención)" },
  { id: "platforms", label: "Filtro de plataformas" },
  { id: "continue", label: "Seguir viendo" },
  { id: "enEstreno", label: "En Estreno / Emisión" },
  { id: "recienAgregado", label: "Recién Agregado" },
  { id: "peliculas", label: "Películas Populares" },
  { id: "top10", label: "Top 10 / Lo más visto" },
  { id: "series", label: "Series Populares" },
  { id: "genres", label: "Categorías y géneros" },
];

export interface HomeSectionState {
  id: string;
  enabled: boolean;
}

/**
 * Combina el orden guardado con la lista canónica: respeta el orden del usuario,
 * descarta ids desconocidos, y añade al final (activadas) las secciones nuevas
 * que aún no estén en la configuración.
 */
export function resolveHomeOrder(saved?: HomeSectionState[] | null): HomeSectionState[] {
  const known = new Map(HOME_SECTIONS.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const result: HomeSectionState[] = [];

  (saved || []).forEach((s) => {
    if (s && known.has(s.id) && !seen.has(s.id)) {
      result.push({ id: s.id, enabled: s.enabled !== false });
      seen.add(s.id);
    }
  });
  HOME_SECTIONS.forEach((s) => {
    if (!seen.has(s.id)) result.push({ id: s.id, enabled: true });
  });
  return result;
}

export const labelForSection = (id: string): string =>
  HOME_SECTIONS.find((s) => s.id === id)?.label || id;
