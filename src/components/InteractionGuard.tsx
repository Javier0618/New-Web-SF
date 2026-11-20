import { useEffect } from "react";

function editing(event: Event) {
  return event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLElement &&
        (node.isContentEditable || !!node.closest("input, textarea, select, [role='textbox']")),
    );
}

/** Best-effort interaction restrictions; browser source is still public. */
export default function InteractionGuard() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sf-interaction-guard");
    const preventOutsideEditor = (event: Event) => {
      if (!editing(event)) event.preventDefault();
    };
    const keyboard = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;
      const tools =
        key === "f12" ||
        key === "contextmenu" ||
        (event.shiftKey && key === "f10") ||
        (command && ["u", "i", "s", "p"].includes(key)) ||
        (command && (event.shiftKey || event.altKey) && ["i", "j", "c", "k"].includes(key));
      const selection = command && ["a", "c", "x"].includes(key) && !editing(event);
      if (tools || selection) event.preventDefault();
    };
    const events = ["contextmenu", "selectstart", "copy", "cut", "dragstart"];
    events.forEach((name) => document.addEventListener(name, preventOutsideEditor, true));
    document.addEventListener("keydown", keyboard, true);
    return () => {
      root.classList.remove("sf-interaction-guard");
      events.forEach((name) => document.removeEventListener(name, preventOutsideEditor, true));
      document.removeEventListener("keydown", keyboard, true);
    };
  }, []);
  return null;
}
