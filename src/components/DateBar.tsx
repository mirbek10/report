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
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
      {/* Quick filters (Yesterday / Today) */}
      <div className="flex gap-2 w-full sm:w-auto">
        <button 
          onClick={() => onDateChange(yest)}
          className={clsx(
            'flex-1 sm:flex-initial text-center px-4 py-2.5 sm:py-1.5 rounded-xl text-sm font-semibold transition-all border duration-200',
            selectedDate === yest 
              ? 'bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
              : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-200'
          )}
        >
          Вчера
        </button>
        <button 
          onClick={() => onDateChange(today)}
          className={clsx(
            'flex-1 sm:flex-initial text-center px-4 py-2.5 sm:py-1.5 rounded-xl text-sm font-semibold transition-all border duration-200',
            selectedDate === today 
              ? 'bg-indigo-650 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
              : 'bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-200'
          )}
        >
          Сегодня
        </button>
      </div>

      <div className="hidden sm:block w-px h-6 bg-slate-800 mx-1" />

      {/* Date Navigation & Calendar Picker */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Selector Panel */}
        <div className="flex-1 sm:flex-initial flex items-center justify-between bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <button 
            onClick={() => onDateChange(addDays(selectedDate, -1))}
            className="p-2.5 sm:p-2 text-slate-400 hover:text-slate-250 hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2 px-2 py-2 text-sm text-slate-200 font-semibold min-w-[125px] justify-center select-none">
            <CalendarDays size={14} className="text-slate-400 flex-shrink-0" />
            <span className="font-mono text-xs">{dateLabel(selectedDate)}</span>
          </div>

          <button 
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            disabled={isFuture}
            className="p-2.5 sm:p-2 text-slate-400 hover:text-slate-250 hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Native Date Picker Icon-input */}
        <div className="relative flex-shrink-0">
          <input 
            type="date"
            value={`20${selectedDate.slice(6)}-${selectedDate.slice(3, 5)}-${selectedDate.slice(0, 2)}`}
            max={`20${today.slice(6)}-${today.slice(3, 5)}-${today.slice(0, 2)}`}
            onChange={(e) => {
              if (!e.target.value) return;
              const [y, m, d] = e.target.value.split('-');
              onDateChange(`${d}.${m}.${String(y).slice(-2)}`);
            }}
            className="bg-slate-900 border border-slate-800 text-slate-350 hover:text-slate-200 rounded-xl px-3 py-2.5 sm:py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-650 [color-scheme:dark] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
