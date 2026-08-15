import type { BusinessSettings, TimeSlot } from "@/types/domain";

const manilaParts = (now: Date): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
export const manilaDate = (now = new Date()): string => {
  const p = manilaParts(now);
  return `${p.year}-${p.month}-${p.day}`;
};
export const slotIsOpen = (
  slot: TimeSlot,
  settings: BusinessSettings,
  now = new Date(),
): boolean => {
  const p = manilaParts(now);
  const cutoff = slot === "morning" ? settings.morning_cutoff : settings.lunch_cutoff;
  return `${p.hour}:${p.minute}` < cutoff;
};
export const dateIsBookable = (
  date: string,
  settings: BusinessSettings,
  now = new Date(),
): boolean => {
  const today = manilaDate(now);
  const target = new Date(`${date}T12:00:00Z`);
  const current = new Date(`${today}T12:00:00Z`);
  const diff = Math.round((target.getTime() - current.getTime()) / 86400000);
  if (diff < 0 || diff > 7 || ![1, 2, 3].includes(target.getUTCDay())) return false;
  if (diff === 0) return slotIsOpen("morning", settings, now) || slotIsOpen("lunch", settings, now);
  const weekday = target.getUTCDay();
  return (
    (weekday === 1 && diff <= 3) || (weekday === 2 && diff <= 1) || (weekday === 3 && diff <= 1)
  );
};
export const availableDates = (settings: BusinessSettings, now = new Date()): string[] =>
  Array.from({ length: 8 }, (_, i) => {
    const d = new Date(`${manilaDate(now)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  }).filter((date) => dateIsBookable(date, settings, now));
