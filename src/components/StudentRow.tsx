import { useState } from 'react';
import { Check, LogIn, LogOut, X, RotateCcw, Wifi, MapPin } from 'lucide-react';
import { clsx } from 'clsx';
import { addMinutes } from '../utils/dates';
import { TopicPicker } from './TopicPicker';
import type { Student, ComeEntry, LessonType } from '../types';

const DEFAULT_DURATION = 30;

interface StudentRowProps {
  student: Student;
  index: number;
  come: ComeEntry | undefined;
  onArrive: (studentId: string, time_start: string, time_finish: string, lesson_type: LessonType) => void;
  onUnmark: (studentId: string) => void;
  onTopicChange: (studentId: string, topic: string) => void;
  onTimeEdit: (studentId: string, field: 'time_start' | 'time_finish', value: string) => void;
  onLessonTypeChange: (studentId: string, lesson_type: LessonType) => void;
}

export function StudentRow({
  student, index, come,
  onArrive, onUnmark, onTopicChange, onTimeEdit, onLessonTypeChange,
}: StudentRowProps) {
  const isPresent = !!come;

  return (
    <div className={clsx(
      'group flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200',
      isPresent
        ? come.lesson_type === 'online'
          ? 'bg-sky-950/20 border-sky-900/40'
          : 'bg-emerald-950/20 border-emerald-900/40'
        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
    )}>
      {/* Index */}
      <span className={clsx(
        'text-xs w-5 text-right flex-shrink-0 font-mono select-none',
        isPresent
          ? come.lesson_type === 'online' ? 'text-sky-800' : 'text-emerald-800'
          : 'text-slate-600'
      )}>
        {index + 1}
      </span>

      {/* Name + lesson type badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={clsx(
            'text-sm font-medium truncate',
            isPresent
              ? come.lesson_type === 'online' ? 'text-sky-300' : 'text-emerald-300'
              : 'text-slate-100'
          )}>
            {student.name}
          </p>
          {/* Lesson type badge — shown when marked */}
          {come && (
            <LessonTypeBadge
              type={come.lesson_type}
              onClick={() => onLessonTypeChange(
                student.id,
                come.lesson_type === 'online' ? 'offline' : 'online'
              )}
            />
          )}
        </div>
        <p className="text-xs text-slate-500 truncate sm:hidden mt-0.5">
          {student.currentTopic}
        </p>
      </div>

      {/* Time inputs when present */}
      {come && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className={clsx(
            'flex items-center gap-1 rounded-lg px-2 py-1 border',
            come.lesson_type === 'online'
              ? 'bg-sky-950/60 border-sky-800/50'
              : 'bg-emerald-950/60 border-emerald-800/50'
          )}>
            <LogIn size={10} className={come.lesson_type === 'online' ? 'text-sky-500' : 'text-emerald-500'} />
            <input
              type="time"
              value={come.time_start}
              onChange={(e) => onTimeEdit(student.id, 'time_start', e.target.value)}
              className={clsx(
                'bg-transparent text-xs w-12 focus:outline-none [color-scheme:dark] cursor-pointer',
                come.lesson_type === 'online' ? 'text-sky-400' : 'text-emerald-400'
              )}
            />
          </div>
          <span className="text-slate-700 text-xs">–</span>
          <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-2 py-1">
            <LogOut size={10} className="text-slate-500 flex-shrink-0" />
            <input
              type="time"
              value={come.time_finish}
              onChange={(e) => onTimeEdit(student.id, 'time_finish', e.target.value)}
              className="bg-transparent text-slate-400 text-xs w-12 focus:outline-none [color-scheme:dark] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Topic picker — desktop */}
      <div className="hidden sm:block flex-shrink-0 w-[130px]">
        <TopicPicker
          value={student.currentTopic}
          onChange={(t) => onTopicChange(student.id, t)}
          compact
        />
      </div>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        {!isPresent ? (
          <ArriveButton onArrive={(ts, tf, lt) => onArrive(student.id, ts, tf, lt)} />
        ) : (
          <button
            onClick={() => onUnmark(student.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent text-slate-700 hover:text-red-400 hover:border-red-900 opacity-0 group-hover:opacity-100 transition-all"
            title="Отменить"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Lesson type badge — click to toggle ───────────────────────────────────────
function LessonTypeBadge({ type, onClick }: { type: LessonType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Нажмите чтобы изменить тип занятия"
      className={clsx(
        'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-colors flex-shrink-0',
        type === 'online'
          ? 'bg-sky-900/50 text-sky-400 hover:bg-sky-800/60'
          : 'bg-emerald-900/50 text-emerald-500 hover:bg-emerald-800/60'
      )}
    >
      {type === 'online'
        ? <><Wifi size={9} />онлайн</>
        : <><MapPin size={9} />оффлайн</>}
    </button>
  );
}

// ── ArriveButton ───────────────────────────────────────────────────────────────
function ArriveButton({ onArrive }: {
  onArrive: (ts: string, tf: string, lt: LessonType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ts, setTs] = useState('');
  const [tf, setTf] = useState('');
  const [lt, setLt] = useState<LessonType>('offline');

  const handleOpen = () => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setTs(hhmm);
    setTf(addMinutes(hhmm, DEFAULT_DURATION));
    setOpen(true);
  };

  const handleTsChange = (val: string) => {
    setTs(val);
    if (val) setTf(addMinutes(val, DEFAULT_DURATION));
  };

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 h-8 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
      >
        <Check size={13} strokeWidth={2.5} />
        Пришёл
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Online / Offline toggle */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700 flex-shrink-0">
        <button
          onClick={() => setLt('offline')}
          className={clsx(
            'flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors',
            lt === 'offline'
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
          )}
        >
          <MapPin size={10} />офлайн
        </button>
        <button
          onClick={() => setLt('online')}
          className={clsx(
            'flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors',
            lt === 'online'
              ? 'bg-sky-700 text-white'
              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
          )}
        >
          <Wifi size={10} />онлайн
        </button>
      </div>

      {/* Start time */}
      <div className="flex items-center gap-1 bg-slate-800 border border-emerald-700/60 rounded-lg px-2 py-1">
        <LogIn size={11} className="text-emerald-400 flex-shrink-0" />
        <input
          type="time" value={ts}
          onChange={(e) => handleTsChange(e.target.value)}
          autoFocus
          className="bg-transparent text-slate-200 text-xs w-14 focus:outline-none [color-scheme:dark]"
        />
      </div>

      {/* Finish time */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
        <LogOut size={11} className="text-slate-400 flex-shrink-0" />
        <input
          type="time" value={tf}
          onChange={(e) => setTf(e.target.value)}
          className="bg-transparent text-slate-200 text-xs w-14 focus:outline-none [color-scheme:dark]"
        />
      </div>

      {/* Confirm */}
      <button
        onClick={() => { onArrive(ts, tf, lt); setOpen(false); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
      >
        <Check size={13} strokeWidth={2.5} />
      </button>

      {/* Cancel */}
      <button
        onClick={() => setOpen(false)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
}
