import type { Student, ComeEntry } from '../types';
import { parseDMY, fmtDMY } from './dates';

export interface DayStats {
  date: string;
  presentCount: number;
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
  entries: Array<{ student: Student; entry: ComeEntry }>;
  peakHour: string | null;
}

export interface StudentStats {
  student: Student;
  visitCount: number;
  onlineCount: number;
  offlineCount: number;
  lastVisit: string | null;
  firstVisit: string | null;
  avgDuration: number | null; // minutes
  allEntries: ComeEntry[];
}

export interface PeriodStats {
  totalStudents: number;
  totalVisits: number;
  onlineVisits: number;
  offlineVisits: number;
  avgVisitsPerStudent: number;
  daysWithData: number;
  topStudents: StudentStats[];
  absentStudents: StudentStats[];
  peakDay: DayStats | null;
  peakHour: string | null;
  byDay: DayStats[];
  studentStats: StudentStats[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function durationMinutes(entry: ComeEntry): number | null {
  try {
    const [sh, sm] = entry.time_start.split(':').map(Number);
    const [fh, fm] = entry.time_finish.split(':').map(Number);
    const diff = fh * 60 + fm - (sh * 60 + sm);
    return diff > 0 ? diff : null;
  } catch { return null; }
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/** All dates in range as DD.MM.YY strings, ascending */
export function dateRange(from: Date, to: Date): string[] {
  const result: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    result.push(fmtDMY(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function entriesInDates(students: Student[], dates: Set<string>) {
  const result: Array<{ student: Student; entry: ComeEntry }> = [];
  for (const student of students) {
    for (const entry of student.come) {
      if (dates.has(entry.date)) result.push({ student, entry });
    }
  }
  return result;
}

// ── Main stats computation ────────────────────────────────────────────────────

export function computePeriodStats(students: Student[], dates: string[]): PeriodStats {
  const dateSet = new Set(dates);
  const allEntries = entriesInDates(students, dateSet);

  // per-day map
  const byDayMap = new Map<string, Array<{ student: Student; entry: ComeEntry }>>();
  for (const d of dates) byDayMap.set(d, []);
  for (const e of allEntries) byDayMap.get(e.entry.date)?.push(e);

  const byDay: DayStats[] = dates
    .map((date) => {
      const de = byDayMap.get(date) ?? [];
      const hourCount = new Map<string, number>();
      for (const { entry } of de) {
        const h = entry.time_start.split(':')[0] + ':00';
        hourCount.set(h, (hourCount.get(h) ?? 0) + 1);
      }
      return {
        date,
        presentCount: new Set(de.map((e) => e.student.id)).size,
        onlineCount: de.filter((e) => e.entry.lesson_type === 'online').length,
        offlineCount: de.filter((e) => e.entry.lesson_type === 'offline').length,
        totalCount: students.length,
        entries: de,
        peakHour: [...hourCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      };
    })
    .filter((d) => d.presentCount > 0);

  const studentStats: StudentStats[] = students.map((student) => {
    const entries = student.come.filter((e) => dateSet.has(e.date));
    const durations = entries.map(durationMinutes).filter((d): d is number => d !== null);
    const sorted = [...entries].sort((a, b) => parseDMY(a.date).getTime() - parseDMY(b.date).getTime());
    return {
      student,
      visitCount: entries.length,
      onlineCount: entries.filter((e) => e.lesson_type === 'online').length,
      offlineCount: entries.filter((e) => e.lesson_type === 'offline').length,
      lastVisit: sorted.at(-1)?.date ?? null,
      firstVisit: sorted[0]?.date ?? null,
      avgDuration: avg(durations),
      allEntries: entries,
    };
  });

  const peakDay = [...byDay].sort((a, b) => b.presentCount - a.presentCount)[0] ?? null;

  const hourCount = new Map<string, number>();
  for (const { entry } of allEntries) {
    const h = entry.time_start.split(':')[0] + ':00';
    hourCount.set(h, (hourCount.get(h) ?? 0) + 1);
  }
  const peakHour = [...hourCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const visited = studentStats.filter((s) => s.visitCount > 0);
  const avgVisits = visited.length > 0
    ? Math.round((visited.reduce((s, x) => s + x.visitCount, 0) / visited.length) * 10) / 10
    : 0;

  const onlineVisits = allEntries.filter((e) => e.entry.lesson_type === 'online').length;
  const offlineVisits = allEntries.filter((e) => e.entry.lesson_type === 'offline').length;

  return {
    totalStudents: students.length,
    totalVisits: allEntries.length,
    onlineVisits,
    offlineVisits,
    avgVisitsPerStudent: avgVisits,
    daysWithData: byDay.length,
    topStudents: [...studentStats].sort((a, b) => b.visitCount - a.visitCount).slice(0, 10),
    absentStudents: studentStats.filter((s) => s.visitCount === 0),
    peakDay,
    peakHour,
    byDay,
    studentStats,
  };
}

// ── Report generation ─────────────────────────────────────────────────────────

export function generateDailyReport(
  students: Student[],
  date: string,
  mentorName = 'Ментор'
): string {
  const dateObj = parseDMY(date);
  const months = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const kyrgyzDate = `${dateObj.getDate()}-${months[dateObj.getMonth()]}, ${dateObj.getFullYear()}-жыл`;

  const present = students
    .map((s) => ({ student: s, entry: s.come.find((e) => e.date === date) }))
    .filter((x): x is { student: Student; entry: ComeEntry } => !!x.entry)
    .sort((a, b) => a.entry.time_start.localeCompare(b.entry.time_start));

  const onlineCount = present.filter((x) => x.entry.lesson_type === 'online').length;
  const offlineCount = present.filter((x) => x.entry.lesson_type === 'offline').length;

  const lines: string[] = [
    `Ментор: ${mentorName}`,
    `Күнү: ${kyrgyzDate}`,
    ``,
    `1. Жалпы студенттердин саны: ${students.length}`,
    ``,
    `2. Бүгүнкү байланыш: Студенттердин суроолоруна жооп берип, өз убагында тиешелүү көмөк көрсөтүлдү.`,
    ``,
    `Өткөрүлгөн сабактар жана жекече иштөө убактысы:`,
  ];

  present.forEach(({ student, entry }, i) => {
    const typeLabel = entry.lesson_type === 'online' ? 'онлайн' : 'оффлайн';
    lines.push(`${i + 1}. ${student.name} (${entry.time_start} – ${entry.time_finish}) – ${student.currentTopic} [${typeLabel}]`);
  });

  lines.push(``);

  const parts: string[] = [];
  if (offlineCount > 0) parts.push(`${offlineCount} гибрид`);
  if (onlineCount > 0) parts.push(`${onlineCount} онлайн`);
  lines.push(`3. Өткөрүлгөн сабактар: Бүгүн жалпы ${present.length} сабак өткөрүлдү (${parts.join(', ') || present.length + ' жалпы'}).`);

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}
