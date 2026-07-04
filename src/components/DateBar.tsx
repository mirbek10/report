import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { todayDMY, fmtDMY, parseDMY, dateLabel } from '../utils/dates';

interface DateBarProps {
  selectedDate: string; // "DD.MM.YY"
  onDateChange: (date: string) => void;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return fmtDMY(d);
}

function addDays(dmy: string, n: number): string {
  const d = parseDMY(dmy);
  d.setDate(d.getDate() + n);
  return fmtDMY(d);
}

export function DateBar({ selectedDate, onDateChange }: DateBarProps) {
  const today = todayDMY();
  const yest = yesterday();
  const isFuture = parseDMY(selectedDate) > parseDMY(today);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onDateChange(yest)}
        className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          selectedDate === yest ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
        Вчера
      </button>
      <button onClick={() => onDateChange(today)}
        className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          selectedDate === today ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
        Сегодня
      </button>

      <div className="w-px h-5 bg-slate-700" />

      <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700">
        <button onClick={() => onDateChange(addDays(selectedDate, -1))}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-l-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-slate-200 min-w-[130px] justify-center">
          <CalendarDays size={14} className="text-slate-400 flex-shrink-0" />
          <span className="font-medium">{dateLabel(selectedDate)}</span>
        </div>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))}
          disabled={isFuture}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-r-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Native date picker for arbitrary dates */}
      <input type="date"
        value={`20${selectedDate.slice(6)}-${selectedDate.slice(3, 5)}-${selectedDate.slice(0, 2)}`}
        max={`20${today.slice(6)}-${today.slice(3, 5)}-${today.slice(0, 2)}`}
        onChange={(e) => {
          if (!e.target.value) return;
          const [y, m, d] = e.target.value.split('-');
          onDateChange(`${d}.${m}.${String(y).slice(-2)}`);
        }}
        className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
      />
    </div>
  );
}
