// Хранение событий дня (прямой эфир / кахут) в куки на 2 месяца

export type EventType = 'live' | 'kahoot';

export interface DayEvent {
  type: EventType;
  time: string;       // "HH:MM"
  participants: number;
}

// Все события за один день
export interface DayEvents {
  live?: DayEvent;
  kahoot?: DayEvent;
}

const COOKIE_PREFIX = 'onchet_events_';
const EXPIRY_DAYS = 60; // 2 месяца

function cookieName(date: string): string {
  // "07.09.26" → "onchet_events_07_09_26"
  return COOKIE_PREFIX + date.replace(/\./g, '_');
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const prefix = name + '=';
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function getDayEvents(date: string): DayEvents {
  const raw = getCookie(cookieName(date));
  if (!raw) return {};
  try { return JSON.parse(raw) as DayEvents; }
  catch { return {}; }
}

export function setDayEvent(date: string, event: DayEvent) {
  const current = getDayEvents(date);
  current[event.type] = event;
  setCookie(cookieName(date), JSON.stringify(current), EXPIRY_DAYS);
}

export function removeDayEvent(date: string, type: EventType) {
  const current = getDayEvents(date);
  delete current[type];
  if (!current.live && !current.kahoot) {
    deleteCookie(cookieName(date));
  } else {
    setCookie(cookieName(date), JSON.stringify(current), EXPIRY_DAYS);
  }
}
