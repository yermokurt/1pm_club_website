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

const timeToMinutes = (value: string, assumeAfternoon = false): number | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toLowerCase();
  if (minute > 59 || hour > 23) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (period === "pm" ? 12 : 0);
  } else if (assumeAfternoon && hour > 0 && hour < 7) {
    // Older settings can contain "01:30" for the 1:30 PM lunch cutoff.
    hour += 12;
  }
  return hour * 60 + minute;
};

export const slotIsOpen = (
  slot: TimeSlot,
  settings: BusinessSettings,
  now = new Date(),
): boolean => {
  const p = manilaParts(now);
  const cutoff = slot === "morning" ? settings.morning_cutoff : settings.lunch_cutoff;
  const cutoffMinutes = timeToMinutes(cutoff, slot === "lunch");
  if (cutoffMinutes === null) return false;
  return Number(p.hour) * 60 + Number(p.minute) < cutoffMinutes;
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
  if (diff < 0 || target.getUTCDay() === 0 || target.getUTCDay() === 6) return false;
  if (diff === 0) return slotIsOpen("morning", settings, now) || slotIsOpen("lunch", settings, now);
  const leadDaysByWeekday: Record<number, number> = {
    1: settings.monday_booking_lead_days ?? 2,
    2: settings.tuesday_booking_lead_days ?? 1,
    3: settings.wednesday_booking_lead_days ?? 1,
    4: settings.thursday_booking_lead_days ?? 1,
    5: settings.friday_booking_lead_days ?? 1,
  };
  const firstBookableDate = new Date(target);
  firstBookableDate.setUTCDate(
    firstBookableDate.getUTCDate() -
      Math.max(0, Math.min(6, leadDaysByWeekday[target.getUTCDay()] ?? 0)),
  );
  return current >= firstBookableDate;
};
export const availableDates = (settings: BusinessSettings, now = new Date()): string[] =>
  Array.from({ length: 10 }, (_, i) => {
    const d = new Date(`${manilaDate(now)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  }).filter((date) => dateIsBookable(date, settings, now));
