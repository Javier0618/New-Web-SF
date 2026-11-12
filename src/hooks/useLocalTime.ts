import { useEffect, useState } from "react";
export type DayPeriod = "morning" | "afternoon" | "night";
export function localTimeSnapshot(now = new Date()) {
  const hour = now.getHours();
  const period: DayPeriod =
    hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 19 ? "afternoon" : "night";
  const word = { morning: "mañana", afternoon: "tarde", night: "noche" }[period];
  const slotDate = new Date(now);
  if (hour < 5) slotDate.setDate(slotDate.getDate() - 1);
  const day = `${slotDate.getFullYear()}-${slotDate.getMonth() + 1}-${slotDate.getDate()}`;
  return {
    period,
    word,
    slotKey: `${day}:${period}`,
    clock: new Intl.DateTimeFormat("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(now),
    iso: now.toISOString(),
  };
}
export function useLocalTime() {
  const [value, setValue] = useState(localTimeSnapshot);
  useEffect(() => {
    const update = () => setValue(localTimeSnapshot());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return value;
}
