import { useState } from 'react';
import { X, Check, MapPin, Wifi, Clock, BookOpen, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { TopicPicker } from './TopicPicker';
import { nowHHMM, addMinutes } from '../utils/dates';
import type { Student, ComeEntry, LessonType } from '../types';

interface StudentSessionModalProps {
  student: Student;
  come: ComeEntry | undefined;
  onClose: () => void;
  onSave: (entry: ComeEntry | null) => void; // null means mark absent / delete entry
  onTopicChange: (topic: string) => void;
}

const DEFAULT_DURATION = 30;

export function StudentSessionModal({
  student,
  come,
  onClose,
  onSave,
  onTopicChange,
}: StudentSessionModalProps) {
  const isPresent = !!come;
  
  // Local state for form fields
  const [markedPresent, setMarkedPresent] = useState(isPresent);
  const [lessonType, setLessonType] = useState<LessonType>(come?.lesson_type || 'offline');
  const [timeStart, setTimeStart] = useState(() => come?.time_start || nowHHMM());
  const [timeFinish, setTimeFinish] = useState(() => come?.time_finish || addMinutes(come?.time_start || nowHHMM(), DEFAULT_DURATION));
  const [topic, setTopic] = useState(student.currentTopic || 'HTML & CSS');

  const handleTimeStartChange = (val: string) => {
    setTimeStart(val);
    if (val) {
      setTimeFinish(addMinutes(val, DEFAULT_DURATION));
    }
  };

  const handleSave = () => {
    if (!markedPresent) {
      onSave(null); // Mark as absent
    } else {
      onSave({
        date: come?.date || '', // date will be set by the parent component/mutation
        time_start: timeStart,
        time_finish: timeFinish,
        lesson_type: lessonType,
      });
    }
    // Update student topic if changed
    if (topic !== student.currentTopic) {
      onTopicChange(topic);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-visible transform transition-all scale-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-bold text-base truncate max-w-[280px]">
              {student.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {student.groupName || 'Без группы'} · Настройка посещаемости
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-visible">
          
          {/* Status Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Статус присутствия
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMarkedPresent(true)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  markedPresent 
                    ? 'bg-emerald-600/25 text-emerald-400 border border-emerald-500/30' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                )}
              >
                <Check size={16} />
                Пришёл
              </button>
              <button
                type="button"
                onClick={() => setMarkedPresent(false)}
                className={clsx(
                  'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  !markedPresent 
                    ? 'bg-red-950/40 text-red-400 border border-red-900/40' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                )}
              >
                <X size={16} />
                Не пришёл
              </button>
            </div>
          </div>

          {/* Conditional Attendance Fields */}
          {markedPresent && (
            <div className="space-y-4 animate-slide-down">
              
              {/* Lesson Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Формат занятия
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonType('offline')}
                    className={clsx(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all duration-200',
                      lessonType === 'offline'
                        ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400'
                        : 'bg-slate-800/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    )}
                  >
                    <MapPin size={16} className={lessonType === 'offline' ? 'text-emerald-400' : 'text-slate-500'} />
                    Офлайн
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonType('online')}
                    className={clsx(
                      'flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all duration-200',
                      lessonType === 'online'
                        ? 'bg-sky-950/40 border-sky-700/60 text-sky-400'
                        : 'bg-slate-800/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    )}
                  >
                    <Wifi size={16} className={lessonType === 'online' ? 'text-sky-400' : 'text-slate-500'} />
                    Онлайн
                  </button>
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Время нахождения
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium pl-1">Время прихода</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                      <Clock size={14} className="text-slate-500 flex-shrink-0" />
                      <input
                        type="time"
                        value={timeStart}
                        onChange={(e) => handleTimeStartChange(e.target.value)}
                        className="bg-transparent text-slate-200 text-sm w-full focus:outline-none [color-scheme:dark] cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-medium pl-1">Время ухода</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                      <Clock size={14} className="text-slate-500 flex-shrink-0" />
                      <input
                        type="time"
                        value={timeFinish}
                        onChange={(e) => setTimeFinish(e.target.value)}
                        className="bg-transparent text-slate-200 text-sm w-full focus:outline-none [color-scheme:dark] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Topic Picker */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Текущая тема обучения
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <BookOpen size={14} className="text-slate-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <TopicPicker
                  value={topic}
                  onChange={setTopic}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center gap-3 bg-slate-900/60 rounded-b-2xl">
          {isPresent && !markedPresent && (
            <button
              onClick={() => {
                onSave(null);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-colors mr-auto"
              title="Удалить запись о посещении"
            >
              <Trash2 size={13} />
              Сбросить
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/10"
            >
              Сохранить
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
