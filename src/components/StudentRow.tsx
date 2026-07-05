import { useState } from 'react';
import { LogIn, LogOut, RotateCcw, Wifi, MapPin, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { StudentSessionModal } from './StudentSessionModal';
import { TopicPicker } from './TopicPicker';
import type { Student, ComeEntry, LessonType } from '../types';

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
  const [modalOpen, setModalOpen] = useState(false);

  const handleModalSave = (entry: ComeEntry | null) => {
    if (entry === null) {
      onUnmark(student.id);
    } else {
      if (!isPresent) {
        onArrive(student.id, entry.time_start, entry.time_finish, entry.lesson_type);
      } else {
        if (entry.time_start !== come.time_start) {
          onTimeEdit(student.id, 'time_start', entry.time_start);
        }
        if (entry.time_finish !== come.time_finish) {
          onTimeEdit(student.id, 'time_finish', entry.time_finish);
        }
        if (entry.lesson_type !== come.lesson_type) {
          onLessonTypeChange(student.id, entry.lesson_type);
        }
      }
    }
  };

  return (
    <>
      <div 
        onClick={() => {
          // On mobile, clicking anywhere on the row opens the modal
          if (window.innerWidth < 640) {
            setModalOpen(true);
          }
        }}
        className={clsx(
          'group flex items-center gap-2 sm:gap-3 px-3 py-3 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer sm:cursor-default select-none sm:select-text',
          isPresent
            ? come.lesson_type === 'online'
              ? 'bg-sky-950/15 border-sky-900/30 hover:border-sky-850'
              : 'bg-emerald-950/15 border-emerald-900/30 hover:border-emerald-850'
            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
        )}
      >
        {/* Index */}
        <span className={clsx(
          'text-xs w-5 text-right flex-shrink-0 font-mono select-none hidden xs:inline',
          isPresent
            ? come.lesson_type === 'online' ? 'text-sky-800' : 'text-emerald-800'
            : 'text-slate-600'
        )}>
          {index + 1}
        </span>

        {/* Name + Topic + status badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <p className={clsx(
              'text-sm font-semibold truncate',
              isPresent
                ? come.lesson_type === 'online' ? 'text-sky-300' : 'text-emerald-300'
                : 'text-slate-200'
            )}>
              {student.name}
            </p>
            {/* Lesson type badge — shown when marked */}
            {come && (
              <LessonTypeBadge
                type={come.lesson_type}
                onClick={(e) => {
                  e.stopPropagation();
                  onLessonTypeChange(
                    student.id,
                    come.lesson_type === 'online' ? 'offline' : 'online'
                  );
                }}
              />
            )}
          </div>
          {/* Subtitle with topic — visible on mobile */}
          <p className="text-xs text-slate-500 truncate sm:hidden mt-0.5">
            Тема: {student.currentTopic || 'Не выбрана'}
          </p>
        </div>

        {/* Time inputs when present (Desktop only) */}
        {come && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:flex items-center gap-1.5 flex-shrink-0"
          >
            <div className={clsx(
              'flex items-center gap-1 rounded-lg px-2 py-1 border',
              come.lesson_type === 'online'
                ? 'bg-sky-950/50 border-sky-800/40'
                : 'bg-emerald-950/50 border-emerald-800/40'
            )}>
              <LogIn size={11} className={come.lesson_type === 'online' ? 'text-sky-400' : 'text-emerald-400'} />
              <input
                type="time"
                value={come.time_start}
                onChange={(e) => onTimeEdit(student.id, 'time_start', e.target.value)}
                className={clsx(
                  'bg-transparent text-xs w-12 focus:outline-none [color-scheme:dark] cursor-pointer font-medium',
                  come.lesson_type === 'online' ? 'text-sky-300' : 'text-emerald-300'
                )}
              />
            </div>
            <span className="text-slate-700 text-xs">—</span>
            <div className="flex items-center gap-1 bg-slate-800 border border-slate-700/60 rounded-lg px-2 py-1">
              <LogOut size={11} className="text-slate-500 flex-shrink-0" />
              <input
                type="time"
                value={come.time_finish}
                onChange={(e) => onTimeEdit(student.id, 'time_finish', e.target.value)}
                className="bg-transparent text-slate-300 text-xs w-12 focus:outline-none [color-scheme:dark] cursor-pointer font-medium"
              />
            </div>
          </div>
        )}

        {/* Topic picker — desktop only */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="hidden sm:block flex-shrink-0 w-[140px]"
        >
          <TopicPicker
            value={student.currentTopic}
            onChange={(t) => onTopicChange(student.id, t)}
            compact
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isPresent ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalOpen(true);
              }}
              className="flex items-center justify-center h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md hover:shadow-emerald-600/10 transition-all whitespace-nowrap"
            >
              Пришёл
            </button>
          ) : (
            <div className="flex items-center gap-1">
              {/* Edit button (Modal trigger on desktop, visual indicator on mobile) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:border-slate-700 transition-all"
                title="Настроить посещаемость"
              >
                <Edit2 size={13} />
              </button>
              
              {/* Quick revert to absent (Desktop only, shown on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnmark(student.id);
                }}
                className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg border border-transparent text-slate-650 hover:text-red-400 hover:border-red-900/30 hover:bg-red-950/20 sm:opacity-0 group-hover:opacity-100 transition-all"
                title="Отметить как отсутствующего"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Session configuration modal */}
      {modalOpen && (
        <StudentSessionModal
          student={student}
          come={come}
          onClose={() => setModalOpen(false)}
          onSave={handleModalSave}
          onTopicChange={(topic) => onTopicChange(student.id, topic)}
        />
      )}
    </>
  );
}

// ── Lesson type badge ─────────────────────────────────────────────────────────
function LessonTypeBadge({ type, onClick }: { type: LessonType; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title="Нажмите чтобы изменить тип занятия"
      className={clsx(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all border shadow-sm flex-shrink-0',
        type === 'online'
          ? 'bg-sky-950/50 border-sky-800/40 text-sky-400 hover:bg-sky-900/60'
          : 'bg-emerald-950/50 border-emerald-800/40 text-emerald-450 hover:bg-emerald-900/60'
      )}
    >
      {type === 'online'
        ? <><Wifi size={10} />онлайн</>
        : <><MapPin size={10} />офлайн</>}
    </button>
  );
}
