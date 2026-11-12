/** Anonymous product events; no account identifiers or search text. */
export function trackExperience(name: string, values: Record<string, string | number> = {}) {
  window.gtag?.("event", name, values);
}
