import type { Student } from '../types';

const STORAGE_KEY = 'onchet_sheets_url';

export function getSheetsUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function saveSheetsUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.trim());
}

export function clearSheetsUrl() {
  localStorage.removeItem(STORAGE_KEY);
}

export type SyncResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Один POST запрос в GAS.
 * mode: no-cors + Content-Type: text/plain — не вызывает preflight.
 * Браузер следует 302 редиректу, тело доходит до doPost.
 * Ответ недоступен (opaque), но данные записываются в Sheets.
 */
async function postToGAS(url: string, payload: object): Promise<void> {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}

/** Проверка через GET — единственный способ получить читаемый ответ */
export async function pingSheetsScript(url: string): Promise<SyncResult> {
  if (!url) return { ok: false, error: 'URL не указан' };
  try {
    const res = await fetch(`${url}?type=ping`, { method: 'GET' });
    const text = await res.text();
    try { return JSON.parse(text) as SyncResult; }
    catch { return { ok: true, message: 'Скрипт отвечает' }; }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Синхронизирует ВЕСЬ список студентов одним запросом.
 * GAS записывает данные в листы по месяцам.
 */
export async function syncAllToSheets(
  students: Student[],
  url: string = getSheetsUrl(),
): Promise<SyncResult> {
  if (!url) return { ok: false, error: 'URL скрипта не указан' };
  try {
    await postToGAS(url, { type: 'sync_all', students });
    const total = students.reduce((s, st) => s + st.come.length, 0);
    return {
      ok: true,
      message: `Отправлено ${students.length} студентов (${total} записей). Данные появятся через несколько секунд.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Синхронизирует посещаемость только за один день */
export async function syncDayToSheets(
  students: Student[],
  date: string,
  url: string = getSheetsUrl(),
): Promise<SyncResult> {
  if (!url) return { ok: false, error: 'URL скрипта не указан' };
  const records = students
    .flatMap((s) =>
      s.come
        .filter((e) => e.date === date)
        .map((e) => ({
          name: s.name,
          groupName: s.groupName,
          currentTopic: s.currentTopic,
          time_start: e.time_start,
          time_finish: e.time_finish,
          lesson_type: e.lesson_type,
        })),
    )
    .sort((a, b) => a.time_start.localeCompare(b.time_start));
  try {
    await postToGAS(url, { type: 'sync_day', date, records });
    return { ok: true, message: `День ${date}: ${records.length} записей отправлено.` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
