import { useState, useMemo, useEffect } from 'react';
import { BarChart2, Copy, FileText, Download, Check, ChevronDown, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { computePeriodStats, copyToClipboard, generateDailyReport, dateRange } from '../utils/analytics';
import { fmtDMY, parseDMY, todayDMY } from '../utils/dates';
import { DateBar } from './DateBar';
import { getDefaultGroup } from './GroupPicker';
import type { Student } from '../types';

type Period = 'day' | 'week' | 'month' | 'custom';
type StudentFilter = 'all' | 'visited' | 'absent';
type StudentSort = 'visits' | 'name' | 'lastVisit';

const ALL_GROUPS = '__all__';

interface Props {
  students: Student[];
  mentorName?: string;
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function getWeekOptions() {
  const opts = [];
  const today = new Date();
  for (let i = 0; i < 8; i++) {
    const ref = new Date(today);
    ref.setDate(today.getDate() - i * 7);
    const mon = getMondayOfWeek(ref);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const label = i === 0 ? 'Текущая неделя' : i === 1 ? 'Прошлая неделя' : `${i} недели назад`;
    opts.push({ label, from: mon, to: sun });
  }
  return opts;
}

function getMonthOptions() {
  const opts = [];
  const today = new Date();
  const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  for (let i = 0; i < 6; i++) {
    const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    opts.push({ label: `${RU_MONTHS[ref.getMonth()]} ${ref.getFullYear()}`, from, to });
  }
  return opts;
}

function generatePeriodReport(students: Student[], dates: string[], label: string): string {
  const dateSet = new Set(dates);
  const visited = students
    .map((s) => ({ student: s, entries: s.come.filter((e) => dateSet.has(e.date)) }))
    .filter((x) => x.entries.length > 0)
    .sort((a, b) => b.entries.length - a.entries.length);
  const total = students.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date)).length, 0);
  const online = students.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date) && e.lesson_type === 'online').length, 0);
  const offline = total - online;
  return [
    `Мезгил: ${label}`,
    `Жалпы студент: ${students.length}`,
    `Жалпы келген: ${visited.length} уникалдуу студент`,
    `Жалпы сабак: ${total} (📍 ${offline} оффлайн, 🌐 ${online} онлайн)`,
    ``,
    `Активдүү студенттер:`,
    ...visited.map(({ student, entries }, i) => {
      const on = entries.filter((e) => e.lesson_type === 'online').length;
      const off = entries.length - on;
      const detail = [off > 0 && `📍${off}`, on > 0 && `🌐${on}`].filter(Boolean).join(' ');
      return `${i + 1}. ${student.name} — ${entries.length} жолу (${detail})`;
    }),
  ].join('\n');
}

/** Monthly full report — all groups summary + per-group breakdown */
function generateMonthlyAllGroupsReport(students: Student[], dates: string[], label: string): string {
  const dateSet = new Set(dates);

  // gather unique groups
  const groupNames = [...new Set(students.map((s) => s.groupName || 'Без группы'))].sort();

  const totalVisits = students.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date)).length, 0);
  const onlineVisits = students.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date) && e.lesson_type === 'online').length, 0);
  const offlineVisits = totalVisits - onlineVisits;
  const uniqueVisited = students.filter((s) => s.come.some((e) => dateSet.has(e.date))).length;

  const lines: string[] = [
    `📅 Айлык отчёт: ${label}`,
    ``,
    `Жалпы студент: ${students.length}`,
    `Жалпы сабак: ${totalVisits} (📍 ${offlineVisits} оффлайн, 🌐 ${onlineVisits} онлайн)`,
    `Уникалдуу келгендер: ${uniqueVisited} / ${students.length}`,
    ``,
    `── Группалар боюнча ──────────────────`,
  ];

  for (const group of groupNames) {
    const gs = students.filter((s) => (s.groupName || 'Без группы') === group);
    const gVisits = gs.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date)).length, 0);
    const gVisited = gs.filter((s) => s.come.some((e) => dateSet.has(e.date))).length;
    const gOnline = gs.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date) && e.lesson_type === 'online').length, 0);
    const gOffline = gVisits - gOnline;
    lines.push(``, `📌 ${group} (${gs.length} студент)`);
    lines.push(`   Келди: ${gVisited} / ${gs.length}  |  Сабак: ${gVisits} (📍${gOffline} 🌐${gOnline})`);

    const active = gs
      .map((s) => ({ s, cnt: s.come.filter((e) => dateSet.has(e.date)).length }))
      .filter((x) => x.cnt > 0)
      .sort((a, b) => b.cnt - a.cnt);
    active.forEach(({ s, cnt }, i) => {
      const on = s.come.filter((e) => dateSet.has(e.date) && e.lesson_type === 'online').length;
      const off = cnt - on;
      const detail = [off > 0 && `📍${off}`, on > 0 && `🌐${on}`].filter(Boolean).join(' ');
      lines.push(`   ${i + 1}. ${s.name} — ${cnt} жолу (${detail})`);
    });
    const absent = gs.filter((s) => !s.come.some((e) => dateSet.has(e.date)));
    if (absent.length > 0) {
      lines.push(`   ❌ Келбегендер: ${absent.map((s) => s.name).join(', ')}`);
    }
  }

  return lines.join('\n');
}

function exportCSV(students: Student[], dates: string[], filename: string) {
  const dateSet = new Set(dates);
  const rows = [['Имя', 'Тема', 'Всего визитов', 'Оффлайн', 'Онлайн', 'Первый визит', 'Последний визит', 'Ср. длит. (мин)']];
  for (const s of students) {
    const entries = s.come.filter((e) => dateSet.has(e.date));
    const sorted = [...entries].sort((a, b) => parseDMY(a.date).getTime() - parseDMY(b.date).getTime());
    const durations = entries.map((e) => {
      const [sh, sm] = e.time_start.split(':').map(Number);
      const [fh, fm] = e.time_finish.split(':').map(Number);
      const d = (fh * 60 + fm) - (sh * 60 + sm);
      return d > 0 ? d : null;
    }).filter((d): d is number => d !== null);
    const avgDur = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : '';
    const offline = entries.filter((e) => e.lesson_type === 'offline').length;
    const online = entries.filter((e) => e.lesson_type === 'online').length;
    rows.push([
      s.name, s.currentTopic,
      String(entries.length), String(offline), String(online),
      sorted[0]?.date ?? '', sorted.at(-1)?.date ?? '', String(avgDur),
    ]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ReportsContent({ students, mentorName = 'Ментор' }: Props) {
  const [period, setPeriod] = useState<Period>('day');
  const [dayDate, setDayDate] = useState(todayDMY);
  const [weekIdx, setWeekIdx] = useState(0);
  const [monthIdx, setMonthIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return fmtDMY(d); });
  const [customTo, setCustomTo] = useState(todayDMY);
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
  const [studentSort, setStudentSort] = useState<StudentSort>('visits');
  const [selectedGroup, setSelectedGroup] = useState<string>(ALL_GROUPS);
  const [copiedList, setCopiedList] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const weekOptions = useMemo(() => getWeekOptions(), []);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  // All unique groups from students
  const groupOptions = useMemo(() => {
    const gs = [...new Set(students.map((s) => s.groupName || 'Без группы'))].sort();
    return gs;
  }, [students]);

  // Auto-select default group once groupOptions are known
  const [defaultApplied, setDefaultApplied] = useState(false);
  useEffect(() => {
    if (!defaultApplied && groupOptions.length > 0) {
      const def = getDefaultGroup();
      if (def && groupOptions.includes(def)) {
        setSelectedGroup(def);
      }
      setDefaultApplied(true);
    }
  }, [groupOptions, defaultApplied]);

  // For month — always show all; for others — filter by selected group
  const activeStudents = useMemo(() => {
    if (period === 'month' || selectedGroup === ALL_GROUPS) return students;
    return students.filter((s) => (s.groupName || 'Без группы') === selectedGroup);
  }, [students, period, selectedGroup]);

  const { dates, periodLabel } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (period === 'day') return { dates: [dayDate], periodLabel: dayDate };
    if (period === 'week') {
      const opt = weekOptions[weekIdx];
      const to = opt.to > today ? today : opt.to;
      return { dates: dateRange(opt.from, to), periodLabel: `${fmtDMY(opt.from)} – ${fmtDMY(to)}` };
    }
    if (period === 'month') {
      const opt = monthOptions[monthIdx];
      const to = opt.to > today ? today : opt.to;
      return { dates: dateRange(opt.from, to), periodLabel: opt.label };
    }
    try {
      const f = parseDMY(customFrom), t = parseDMY(customTo);
      if (f <= t) { const to = t > today ? today : t; return { dates: dateRange(f, to), periodLabel: `${customFrom} – ${customTo}` }; }
    } catch { /* ignore */ }
    return { dates: [], periodLabel: 'Период' };
  }, [period, dayDate, weekIdx, monthIdx, customFrom, customTo, weekOptions, monthOptions]);

  const stats = useMemo(() => computePeriodStats(activeStudents, dates), [activeStudents, dates]);

  // Group summary for month tab
  const groupSummary = useMemo(() => {
    if (period !== 'month') return null;
    const dateSet = new Set(dates);
    return groupOptions.map((g) => {
      const gs = students.filter((s) => (s.groupName || 'Без группы') === g);
      const visited = gs.filter((s) => s.come.some((e) => dateSet.has(e.date))).length;
      const total = gs.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date)).length, 0);
      return { group: g, count: gs.length, visited, total };
    });
  }, [period, dates, students, groupOptions]);

  const filteredStudents = useMemo(() => {
    let list = stats.studentStats;
    if (studentFilter === 'visited') list = list.filter((s) => s.visitCount > 0);
    if (studentFilter === 'absent') list = list.filter((s) => s.visitCount === 0);
    return [...list].sort((a, b) => {
      if (studentSort === 'name') return a.student.name.localeCompare(b.student.name, 'ru');
      if (studentSort === 'lastVisit') {
        if (!a.lastVisit && !b.lastVisit) return 0;
        if (!a.lastVisit) return 1; if (!b.lastVisit) return -1;
        return parseDMY(b.lastVisit).getTime() - parseDMY(a.lastVisit).getTime();
      }
      return b.visitCount - a.visitCount;
    });
  }, [stats, studentFilter, studentSort]);

  const maxVisits = useMemo(() => Math.max(1, ...stats.studentStats.map((s) => s.visitCount)), [stats]);

  const handleCopyList = async () => {
    if (period === 'day') {
      const present = activeStudents
        .map((s) => ({ s, e: s.come.find((e) => e.date === dayDate) }))
        .filter((x): x is { s: Student; e: NonNullable<typeof x.e> } => !!x.e)
        .sort((a, b) => a.e.time_start.localeCompare(b.e.time_start));
      const groupLabel = selectedGroup !== ALL_GROUPS ? ` (${selectedGroup})` : '';
      const lines = present.length === 0
        ? [`${dayDate}${groupLabel} — никого не отмечено`]
        : [`Дата: ${dayDate}${groupLabel}`, `Присутствовали (${present.length}/${activeStudents.length}):`,
           ...present.map(({ s, e }, i) => `${i + 1}. ${s.name} — ${e.time_start}–${e.time_finish} (${s.currentTopic})`)];
      await copyToClipboard(lines.join('\n'));
    } else if (period === 'month') {
      // Month: full group-by-group summary
      const dateSet = new Set(dates);
      const lines = [
        `Период: ${periodLabel}`,
        `Жалпы студент: ${students.length}`,
        '',
        ...groupOptions.map((g) => {
          const gs = students.filter((s) => (s.groupName || 'Без группы') === g);
          const visited = gs.filter((s) => s.come.some((e) => dateSet.has(e.date))).length;
          const total = gs.reduce((s, st) => s + st.come.filter((e) => dateSet.has(e.date)).length, 0);
          return `${g}: ${visited}/${gs.length} студент (${total} сабак)`;
        }),
      ];
      await copyToClipboard(lines.join('\n'));
    } else {
      const visited = stats.studentStats.filter((s) => s.visitCount > 0).sort((a, b) => b.visitCount - a.visitCount);
      const groupLabel = selectedGroup !== ALL_GROUPS ? ` · ${selectedGroup}` : '';
      await copyToClipboard([`Период: ${periodLabel}${groupLabel}`, `Посещений: ${stats.totalVisits}`,
        `Студентов: ${visited.length}/${activeStudents.length}`, '',
        ...visited.map((s, i) => `${i + 1}. ${s.student.name} — ${s.visitCount} раз`)].join('\n'));
    }
    setCopiedList(true); setTimeout(() => setCopiedList(false), 2000);
  };

  const handleCopyReport = async () => {
    let text: string;
    if (period === 'month') {
      text = generateMonthlyAllGroupsReport(students, dates, periodLabel);
    } else if (period === 'day') {
      text = generateDailyReport(activeStudents, dayDate, mentorName);
    } else {
      text = generatePeriodReport(activeStudents, dates, periodLabel);
    }
    await copyToClipboard(text);
    setCopiedReport(true); setTimeout(() => setCopiedReport(false), 2000);
  };

  function dmyToInput(dmy: string) { try { const [d, m, y] = dmy.split('.'); return `20${y}-${m}-${d}`; } catch { return ''; } }
  function inputToDmy(v: string) { try { const [y, m, d] = v.split('-'); return `${d}.${m}.${String(y).slice(-2)}`; } catch { return ''; } }

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* Period selector */}
      <div className="sm:sticky sm:top-[96px] z-10 bg-slate-950/95 backdrop-blur-sm pt-2 pb-3 border-b border-slate-800/60">
        <div className="flex gap-1 mb-3 flex-wrap">
          {(['day','week','month','custom'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('flex-1 sm:flex-initial text-center px-4 py-2.5 sm:py-2 rounded-xl text-sm font-semibold transition-all border duration-200',
                period === p 
                  ? 'bg-indigo-655 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800')}
            >
              {p === 'day' ? 'День' : p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Период'}
            </button>
          ))}
        </div>
        {period === 'day' && (
          <div className="flex flex-col gap-2">
            <DateBar selectedDate={dayDate} onDateChange={setDayDate} />
            {groupOptions.length > 1 && (
              <div className="relative w-full sm:w-auto">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full sm:w-64 appearance-none bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-8 pr-10 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer">
                  <option value={ALL_GROUPS}>Все группы</option>
                  {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}
        {period === 'week' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:flex-initial">
              <select value={weekIdx} onChange={(e) => setWeekIdx(Number(e.target.value))}
                className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-4 pr-10 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer">
                {weekOptions.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {groupOptions.length > 1 && (
              <div className="relative flex-1 sm:flex-initial">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-8 pr-10 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer">
                  <option value={ALL_GROUPS}>Все группы</option>
                  {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}
        {period === 'month' && (
          <div className="relative inline-block w-full sm:w-auto">
            <select value={monthIdx} onChange={(e) => setMonthIdx(Number(e.target.value))}
              className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-4 pr-10 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer">
              {monthOptions.map((m, i) => <option key={i} value={i}>{m.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}
        {period === 'custom' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap w-full">
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <span className="text-slate-500 text-xs font-semibold uppercase w-4 text-center">С</span>
                <input type="date" value={dmyToInput(customFrom)}
                  onChange={(e) => { if (e.target.value) setCustomFrom(inputToDmy(e.target.value)); }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-350 rounded-xl px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer" />
              </div>
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <span className="text-slate-500 text-xs font-semibold uppercase w-4 text-center">по</span>
                <input type="date" value={dmyToInput(customTo)}
                  onChange={(e) => { if (e.target.value) setCustomTo(inputToDmy(e.target.value)); }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-350 rounded-xl px-3 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer" />
              </div>
            </div>
            {groupOptions.length > 1 && (
              <div className="relative w-full sm:w-auto">
                <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full sm:w-64 appearance-none bg-slate-900 border border-slate-800 text-slate-200 rounded-xl pl-8 pr-10 py-2.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark] font-semibold cursor-pointer">
                  <option value={ALL_GROUPS}>Все группы</option>
                  {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Студентов" value={stats.totalStudents} accent="text-slate-100" />
        <StatCard label="Визитов" value={stats.totalVisits} accent="text-indigo-400" />
        <StatCard label="Уникальных" value={stats.studentStats.filter(s => s.visitCount > 0).length} accent="text-emerald-400" />
        <StatCard label="Визит/студент" value={stats.avgVisitsPerStudent} accent="text-amber-400" />
        <StatCard label="Оффлайн" value={stats.offlineVisits} accent="text-emerald-500" icon="📍" />
        <StatCard label="Онлайн" value={stats.onlineVisits} accent="text-sky-400" icon="🌐" />
      </div>

      {/* Month: groups summary */}
      {period === 'month' && groupSummary && groupSummary.length > 1 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Users size={15} className="text-indigo-400" />По группам
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {groupSummary.map(({ group, count, visited, total }) => {
              const pct = count > 0 ? Math.round(visited / count * 100) : 0;
              return (
                <div key={group} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-200 text-sm font-semibold truncate">{group}</span>
                    <span className="text-xs text-slate-500 font-mono flex-shrink-0">{count} студ.</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right font-mono">{pct}%</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span><span className="text-emerald-400 font-medium">{visited}</span> / {count} пришли</span>
                    <span className="text-slate-700">·</span>
                    <span><span className="text-indigo-400 font-medium">{total}</span> сабак</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Copy / Export */}
      <div className="flex gap-2 flex-wrap">
        <ActionBtn onClick={handleCopyList} copied={copiedList} icon={<Copy size={13} />} label="Скопировать список" color="slate" />
        <ActionBtn onClick={handleCopyReport} copied={copiedReport} icon={<FileText size={13} />} label="Скопировать отчёт" color="indigo" />
        <button onClick={() => exportCSV(activeStudents, dates, `report-${periodLabel.replace(/[\s–]+/g, '-')}.csv`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors">
          <Download size={13} />Скачать CSV
        </button>
      </div>

      {/* Per-day table */}
      {stats.byDay.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-400" />По дням
          </h3>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">Дата</th>
                  <th className="text-right px-4 py-2.5 font-medium">Присутствовало</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Офлайн</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Онлайн</th>
                  <th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">%</th>
                  <th className="text-right px-4 py-2.5 font-medium hidden md:table-cell">Пиковый час</th>
                </tr>
              </thead>
              <tbody>
                {stats.byDay.map((day) => {
                  const pct = stats.totalStudents > 0 ? Math.round(day.presentCount / stats.totalStudents * 100) : 0;
                  return (
                    <tr key={day.date} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 text-slate-200 font-mono text-xs">{day.date}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="text-indigo-300 font-medium">{day.presentCount}</span>
                        <span className="text-slate-600 text-xs"> /{day.totalCount}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-emerald-500 text-xs font-medium">{day.offlineCount > 0 ? `📍 ${day.offlineCount}` : '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-sky-400 text-xs font-medium">{day.onlineCount > 0 ? `🌐 ${day.onlineCount}` : '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-400 text-xs w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-400 text-xs hidden md:table-cell">{day.peakHour ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Student attendance table */}
      <section>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h3 className="text-sm font-semibold text-slate-300">Посещаемость студентов</h3>
          <div className="flex gap-2 flex-wrap">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg overflow-hidden text-xs">
              {(['all','visited','absent'] as StudentFilter[]).map((f) => (
                <button key={f} onClick={() => setStudentFilter(f)}
                  className={clsx('px-3 py-1.5 font-medium transition-colors',
                    studentFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
                  {f === 'all' ? 'Все' : f === 'visited' ? 'Были' : 'Не были'}
                </button>
              ))}
            </div>
            <div className="relative">
              <select value={studentSort} onChange={(e) => setStudentSort(e.target.value as StudentSort)}
                className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs focus:outline-none [color-scheme:dark]">
                <option value="visits">По визитам</option>
                <option value="name">По имени</option>
                <option value="lastVisit">По дате</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs">
                <th className="text-left px-4 py-2.5 font-medium">Студент</th>
                <th className="text-right px-3 py-2.5 font-medium">Всего</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">📍 Офлайн</th>
                <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">🌐 Онлайн</th>
                <th className="text-right px-3 py-2.5 font-medium hidden md:table-cell">Первый</th>
                <th className="text-right px-3 py-2.5 font-medium hidden md:table-cell">Последний</th>
                <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">Ср. мин</th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell w-28">График</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((ss) => {
                const barPct = Math.round(ss.visitCount / maxVisits * 100);
                return (
                  <tr key={ss.student.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-slate-200 text-sm font-medium leading-tight">{ss.student.name}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[160px]">{ss.student.currentTopic}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {ss.visitCount > 0
                        ? <span className="text-indigo-300 font-semibold">{ss.visitCount}</span>
                        : <span className="text-slate-600">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs hidden sm:table-cell">
                      {ss.offlineCount > 0 ? <span className="text-emerald-500 font-medium">{ss.offlineCount}</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs hidden sm:table-cell">
                      {ss.onlineCount > 0 ? <span className="text-sky-400 font-medium">{ss.onlineCount}</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400 text-xs font-mono hidden md:table-cell">{ss.firstVisit ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 text-xs font-mono hidden md:table-cell">{ss.lastVisit ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 text-xs hidden lg:table-cell">{ss.avgDuration !== null ? ss.avgDuration : '—'}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full', ss.visitCount > 0 ? 'bg-indigo-500' : '')} style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: number; accent: string; icon?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
      <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
        {icon && <span>{icon}</span>}{label}
      </div>
      <div className={clsx('text-2xl font-bold', accent)}>{value}</div>
    </div>
  );
}

function ActionBtn({ onClick, copied, icon, label, color }: {
  onClick: () => void; copied: boolean; icon: React.ReactNode; label: string; color: 'slate' | 'indigo';
}) {
  return (
    <button onClick={onClick}
      className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
        copied
          ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
          : color === 'indigo'
            ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/40'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700')}>
      {copied ? <Check size={13} /> : icon}
      {copied ? 'Скопировано!' : label}
    </button>
  );
}
