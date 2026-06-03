import { clamp, parseDate } from "./shared";

export type CalendarFeedEvent = {
  uid?: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
};

export function parseCalendarFeed(text: string) {
  const unfolded = unfoldIcsLines(text);
  const events: CalendarFeedEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current) {
        const startsAt = parseIcsDate(current.DTSTART);
        const endsAt = parseIcsDate(current.DTEND);
        if (startsAt) {
          events.push({
            uid: current.UID,
            title: decodeIcsText(current.SUMMARY || "Calendar event"),
            description: decodeIcsText(current.DESCRIPTION || ""),
            location: decodeIcsText(current.LOCATION || ""),
            startsAt,
            endsAt,
            allDay: isIcsAllDay(current.DTSTART),
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const rawKey = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const key = rawKey.split(";")[0];
    if (key) current[key] = value;
  }
  return events
    .filter((event) => event.startsAt >= addDays(new Date(), -1) && event.startsAt <= addDays(new Date(), 45))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function estimateCalendarMinutes(startsAt: Date, endsAt: Date | null) {
  if (!endsAt) return 45;
  const minutes = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60));
  return clamp(minutes, 15, 180);
}

function unfoldIcsLines(text: string) {
  const lines: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    if (/^[ \t]/.test(rawLine) && lines.length) {
      lines[lines.length - 1] += rawLine.slice(1);
    } else {
      lines.push(rawLine.trimEnd());
    }
  }
  return lines;
}

function parseIcsDate(value?: string) {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return parseDate(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`);
  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dateTime) return parseDate(value);
  const [, year, month, day, hour, minute, second, zulu] = dateTime;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${zulu ? "Z" : ""}`;
  return parseDate(iso);
}

function isIcsAllDay(value?: string) {
  return Boolean(value && /^\d{8}$/.test(value));
}

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
