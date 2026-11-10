import type { DayPeriod } from "@/hooks/useLocalTime";
export interface EditorialSlot {
  mood?: string;
  headline?: string;
  description?: string;
  ids?: string[];
}
export interface EditorialConfig extends EditorialSlot {
  periods?: Partial<Record<DayPeriod, EditorialSlot>>;
}
export const heroPeriods = {
  morning: {
    label: "Mañana",
    mood: "laugh",
    headline: "Esta mañana, empieza con una sonrisa.",
    description: "Comedias, encuentros y buenas historias para empezar el día a tu manera.",
  },
  afternoon: {
    label: "Tarde",
    mood: "escape",
    headline: "Esta tarde, escápate a otro mundo.",
    description: "Aventuras, fantasía y universos donde lo cotidiano se queda fuera.",
  },
  night: {
    label: "Noche",
    mood: "mystery",
    headline: "Esta noche, sospecha de todos.",
    description: "Secretos, pistas y una historia que te pide mirar de nuevo.",
  },
};
export function resolveHeroSlot(config: EditorialConfig, period: DayPeriod) {
  const preset = heroPeriods[period];
  const value = config.periods?.[period] || (period === "night" ? config : {});
  return {
    mood: value.mood || preset.mood,
    headline: value.headline?.trim() || preset.headline,
    description: value.description?.trim() || preset.description,
    ids: Array.isArray(value.ids) ? value.ids : [],
  };
}
