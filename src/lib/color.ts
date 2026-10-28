// Color utilities for converting between hex and HSL channel string ("H S% L%")
// used by the design tokens, plus types for the theme system.

export type SolidColor = { type: "solid"; value: string }; // value = "H S% L%"
export type GradientColor = {
  type: "gradient";
  from: string; // "H S% L%"
  to: string; // "H S% L%"
  angle: number; // degrees
};
export type ThemeColor = SolidColor | GradientColor;

/** Normalize a stored value to a ThemeColor. Strings are treated as solid HSL. */
export function normalizeThemeColor(
  raw: unknown,
  fallback: string,
): ThemeColor {
  if (!raw) return { type: "solid", value: fallback };
  if (typeof raw === "string") {
    return { type: "solid", value: raw.trim() || fallback };
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (obj.type === "gradient") {
      return {
        type: "gradient",
        from: (obj.from as string) || fallback,
        to: (obj.to as string) || fallback,
        angle: typeof obj.angle === "number" ? obj.angle : 135,
      };
    }
    if (obj.type === "solid") {
      return { type: "solid", value: (obj.value as string) || fallback };
    }
  }
  return { type: "solid", value: fallback };
}

/** Hex (#rrggbb) → "H S% L%" */
export function hexToHsl(hex: string): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "0 0% 0%";
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hh = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hh = (b - r) / d + 2; break;
      case b: hh = (r - g) / d + 4; break;
    }
    hh /= 6;
  }
  return `${Math.round(hh * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** "H S% L%" → "#rrggbb" */
export function hslToHex(hsl: string): string {
  const m = hsl.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Build a CSS gradient string from a GradientColor. */
export function buildGradientCss(g: GradientColor): string {
  return `linear-gradient(${g.angle}deg, hsl(${g.from}), hsl(${g.to}))`;
}
