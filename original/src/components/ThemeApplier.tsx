import { useEffect } from "react";
import { useWebConfig } from "@/hooks/useWebConfig";
import { normalizeThemeColor, buildGradientCss } from "@/lib/color";

// Keys that map to a Tailwind `bg-*` utility we can safely override with a gradient.
const GRADIENT_BG_TARGETS: Record<string, string> = {
  background: ".bg-background",
  primary: ".bg-primary",
  secondary: ".bg-secondary",
  accent: ".bg-accent",
  card: ".bg-card",
  muted: ".bg-muted",
  destructive: ".bg-destructive",
};

const TOKEN_KEYS: Record<string, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  destructive: "--destructive",
  border: "--border",
  ring: "--ring",
};

const STYLE_TAG_ID = "admin-theme-gradients";

const ThemeApplier = () => {
  const { data: config } = useWebConfig();
  const theme = config?.theme as Record<string, unknown> | undefined;

  useEffect(() => {
    const root = document.documentElement;

    // Reset previously injected gradient overrides
    const existing = document.getElementById(STYLE_TAG_ID);
    if (existing) existing.remove();
    if (!theme) return;

    const gradientRules: string[] = [];

    for (const [key, cssVar] of Object.entries(TOKEN_KEYS)) {
      const raw = theme[key];
      if (raw === undefined || raw === null || raw === "") continue;
      const color = normalizeThemeColor(raw, "");
      if (color.type === "solid") {
        if (color.value && color.value.trim()) {
          root.style.setProperty(cssVar, color.value);
        }
      } else {
        // Set the channel to the "from" stop so text-color / single-color uses still work
        if (color.from) root.style.setProperty(cssVar, color.from);
        const selector = GRADIENT_BG_TARGETS[key];
        if (selector) {
          gradientRules.push(
            `${selector}{background-image:${buildGradientCss(color)} !important;background-color:transparent !important;}`,
          );
        }
      }
    }

    if (gradientRules.length) {
      const style = document.createElement("style");
      style.id = STYLE_TAG_ID;
      style.textContent = gradientRules.join("\n");
      document.head.appendChild(style);
    }
  }, [theme]);

  return null;
};

export default ThemeApplier;
