import {
  hexToHsl,
  hslToHex,
  normalizeThemeColor,
  buildGradientCss,
  type ThemeColor,
} from "@/lib/color";

interface ColorTokenPickerProps {
  label: string;
  fallback: string; // default HSL string
  value: unknown; // raw stored value (string | object | undefined)
  onChange: (next: ThemeColor) => void;
  /** When false, hides the gradient toggle (e.g. for foreground/border tokens). */
  allowGradient?: boolean;
}

const inputCls =
  "w-full px-2 py-1 bg-secondary border border-border rounded text-foreground text-xs";

const ColorTokenPicker = ({
  label,
  fallback,
  value,
  onChange,
  allowGradient = true,
}: ColorTokenPickerProps) => {
  const color = normalizeThemeColor(value, fallback);
  const isGradient = color.type === "gradient";

  const previewStyle =
    color.type === "solid"
      ? { background: `hsl(${color.value || fallback})` }
      : { background: buildGradientCss(color) };

  return (
    <div className="rounded-md border border-border bg-card/40 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span
          className="inline-block w-8 h-5 rounded border border-border shrink-0"
          style={previewStyle}
        />
      </div>

      {allowGradient && (
        <div className="flex gap-1 text-[10px]">
          <button
            type="button"
            onClick={() =>
              onChange({
                type: "solid",
                value:
                  color.type === "solid" ? color.value : color.from || fallback,
              })
            }
            className={`flex-1 px-2 py-1 rounded border transition ${
              !isGradient
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
            }`}
          >
            Sólido
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                type: "gradient",
                from:
                  color.type === "gradient"
                    ? color.from
                    : color.value || fallback,
                to:
                  color.type === "gradient"
                    ? color.to
                    : color.value || fallback,
                angle: color.type === "gradient" ? color.angle : 135,
              })
            }
            className={`flex-1 px-2 py-1 rounded border transition ${
              isGradient
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-secondary-foreground border-border hover:bg-accent"
            }`}
          >
            Degradado
          </button>
        </div>
      )}

      {color.type === "solid" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hslToHex(color.value || fallback)}
            onChange={(e) =>
              onChange({ type: "solid", value: hexToHsl(e.target.value) })
            }
            className="w-9 h-8 rounded border border-border bg-transparent cursor-pointer p-0"
          />
          <input
            type="text"
            value={color.value}
            onChange={(e) =>
              onChange({ type: "solid", value: e.target.value })
            }
            placeholder={fallback}
            className={inputCls + " font-mono"}
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">Inicio</span>
            <input
              type="color"
              value={hslToHex(color.from || fallback)}
              onChange={(e) =>
                onChange({ ...color, from: hexToHsl(e.target.value) })
              }
              className="w-9 h-7 rounded border border-border bg-transparent cursor-pointer p-0"
            />
            <input
              type="text"
              value={color.from}
              onChange={(e) => onChange({ ...color, from: e.target.value })}
              className={inputCls + " font-mono"}
              placeholder={fallback}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">Fin</span>
            <input
              type="color"
              value={hslToHex(color.to || fallback)}
              onChange={(e) =>
                onChange({ ...color, to: hexToHsl(e.target.value) })
              }
              className="w-9 h-7 rounded border border-border bg-transparent cursor-pointer p-0"
            />
            <input
              type="text"
              value={color.to}
              onChange={(e) => onChange({ ...color, to: e.target.value })}
              className={inputCls + " font-mono"}
              placeholder={fallback}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-10">Ángulo</span>
            <input
              type="range"
              min={0}
              max={360}
              value={color.angle}
              onChange={(e) =>
                onChange({ ...color, angle: Number(e.target.value) })
              }
              className="flex-1 accent-primary"
            />
            <span className="text-[10px] font-mono w-10 text-right text-muted-foreground">
              {color.angle}°
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorTokenPicker;
