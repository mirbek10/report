import { Users, Check, X, Wifi, MapPin } from 'lucide-react';
import type { Student } from '../types';

interface StatsBarProps {
  students: Student[];
  date: string; // "DD.MM.YY"
}

export function StatsBar({ students, date }: StatsBarProps) {
  const presentEntries = students.flatMap((s) => s.come.filter((e) => e.date === date));
  const present = new Set(students.filter((s) => s.come.some((e) => e.date === date)).map((s) => s.id)).size;
  const absent = students.length - present;
  const online = presentEntries.filter((e) => e.lesson_type === 'online').length;
  const offline = presentEntries.filter((e) => e.lesson_type === 'offline').length;
  const pct = students.length > 0 ? Math.round((present / students.length) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Progress bar */}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
        </div>
        <div className="w-px h-5 bg-slate-700 hidden sm:block" />
        {/* Counters */}
        <div className="flex gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Users size={13} />
            <span><span className="text-slate-200 font-medium">{students.length}</span> всего</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Check size={13} />
            <span><span className="font-medium">{present}</span> пришли</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <X size={13} />
            <span><span className="font-medium">{absent}</span> нет</span>
          </div>
          {present > 0 && (
            <>
              <div className="w-px h-4 bg-slate-700 self-center hidden sm:block" />
              {offline > 0 && (
                <div className="flex items-center gap-1 text-emerald-500">
                  <MapPin size={11} />
                  <span><span className="font-medium">{offline}</span> оффлайн</span>
                </div>
              )}
              {online > 0 && (
                <div className="flex items-center gap-1 text-sky-400">
                  <Wifi size={11} />
                  <span><span className="font-medium">{online}</span> онлайн</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
