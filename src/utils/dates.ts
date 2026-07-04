/** Today as "DD.MM.YY" */
export function todayDMY(): string {
  const d = new Date();
  return fmtDMY(d);
}

/** Format a Date → "DD.MM.YY" */
export function fmtDMY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

/** "DD.MM.YY" → Date (midnight local) */
export function parseDMY(s: string): Date {
  const [dd, mm, yy] = s.split('.');
  return new Date(2000 + Number(yy), Number(mm) - 1, Number(dd));
}

/** Current time as "HH:MM" */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Add minutes to "HH:MM", returns "HH:MM" */
export function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Remove come[] entries older than 2 months */
export function pruneOldEntries(come: import('../types').ComeEntry[]): import('../types').ComeEntry[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  return come.filter((e) => parseDMY(e.date) >= cutoff);
}

/** Display label for a date string "DD.MM.YY" */
export function dateLabel(dmy: string): string {
  const today = todayDMY();
  const yest = fmtDMY((() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })());
  if (dmy === today) return 'Сегодня';
  if (dmy === yest) return 'Вчера';
  const d = parseDMY(dmy);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}
