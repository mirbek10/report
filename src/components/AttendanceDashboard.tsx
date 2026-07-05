import { useState, useMemo, useCallback } from 'react';
import {
  Search, CheckCheck, Loader2, AlertTriangle, RefreshCw,
  ClipboardList, Users, Wifi, WifiOff, Settings,
  Check, X, BarChart2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStudents } from '../hooks/useStudents';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useMentorName } from '../hooks/useMentorName';
import { todayDMY, nowHHMM, addMinutes } from '../utils/dates';
import { DateBar } from './DateBar';
import { StudentRow } from './StudentRow';
import { StatsBar } from './StatsBar';
import { StudentsEditor } from './StudentsEditor';
import { CopyButtons } from './CopyButtons';
import { ReportsContent } from './ReportsContent';
import type { ComeEntry, LessonType } from '../types';

interface Props { onChangeApi: () => void; }
type MainTab = 'journal' | 'students' | 'reports';
type FilterTab = 'all' | 'absent' | 'present';

export function AttendanceDashboard({ onChangeApi }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('journal');
  const [filterTab, setFilterTab] = useState<FilterTab>('absent');
  const [selectedDate, setSelectedDate] = useState(todayDMY);
  const [search, setSearch] = useState('');
  const isOnline = useOnlineStatus();
  const [mentorName, setMentorName] = useMentorName();

  const { data: students = [], isLoading, isError, refetch, editStudent, markCome, unmarkCome, updateComeTime } = useStudents();

  const { presentList, absentList, allList } = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;
    return {
      presentList: base.filter((s) => s.come.some((e) => e.date === selectedDate)),
      absentList: base.filter((s) => !s.come.some((e) => e.date === selectedDate)),
      allList: base,
    };
  }, [students, search, selectedDate]);

  const visibleStudents = useMemo(() => {
    if (filterTab === 'present') return presentList;
    if (filterTab === 'absent') return absentList;
    return [...absentList, ...presentList];
  }, [filterTab, presentList, absentList]);

  const handleArrive = useCallback((studentId: string, time_start: string, time_finish: string, lesson_type: LessonType) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const entry: ComeEntry = { date: selectedDate, time_start, time_finish, lesson_type };
    markCome.mutate({ student, date: selectedDate, entry });
  }, [students, selectedDate, markCome]);

  const handleUnmark = useCallback((studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    unmarkCome.mutate({ student, date: selectedDate });
  }, [students, selectedDate, unmarkCome]);

  const handleTimeEdit = useCallback((studentId: string, field: 'time_start' | 'time_finish', value: string) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    updateComeTime.mutate({ student, date: selectedDate, patch: { [field]: value } });
  }, [students, selectedDate, updateComeTime]);

  const handleTopicChange = useCallback((studentId: string, topic: string) => {
    editStudent.mutate({ id: studentId, updates: { currentTopic: topic } });
  }, [editStudent]);

  const handleLessonTypeChange = useCallback((studentId: string, lesson_type: LessonType) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    updateComeTime.mutate({ student, date: selectedDate, patch: { lesson_type } });
  }, [students, selectedDate, updateComeTime]);

  const handleMarkAllPresent = useCallback(async () => {
    if (absentList.length === 0) return;
    const now = nowHHMM();
    const finish = addMinutes(now, 30);
    for (let i = 0; i < absentList.length; i += 5) {
      await Promise.all(absentList.slice(i, i + 5).map((s) =>
        markCome.mutateAsync({ student: s, date: selectedDate, entry: { date: selectedDate, time_start: now, time_finish: finish, lesson_type: 'offline' } })
      ));
      if (i + 5 < absentList.length) await new Promise((r) => setTimeout(r, 300));
    }
  }, [absentList, selectedDate, markCome]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-auto min-w-0">
            <img src="/favicon.svg" alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
            <span className="font-bold text-slate-100 text-sm hidden sm:inline">Ончёт</span>
            {/* Mentor name input — inline, saves to localStorage */}
            <input
              type="text"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
              placeholder="Имя ментора..."
              className="bg-transparent border-b border-slate-700 focus:border-indigo-500 text-slate-200 text-sm placeholder-slate-600 focus:outline-none px-1 py-0.5 w-32 sm:w-44 transition-colors"
            />
          </div>
          {!isOnline
            ? <div className="flex items-center gap-1.5 text-amber-400 text-xs bg-amber-950/50 border border-amber-800/50 px-2.5 py-1 rounded-full"><WifiOff size={12} /><span className="hidden sm:inline">Офлайн</span></div>
            : <Wifi size={13} className="text-emerald-500" />}
          <button onClick={onChangeApi} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors" title="Изменить API">
            <Settings size={15} />
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 flex gap-1 border-b border-slate-800/60">
          <MainTabBtn active={mainTab === 'journal'} onClick={() => setMainTab('journal')} icon={<ClipboardList size={14} />}>Журнал</MainTabBtn>
          <MainTabBtn active={mainTab === 'students'} onClick={() => setMainTab('students')} icon={<Users size={14} />}>
            Студенты
            {students.length > 0 && <span className="ml-1.5 text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">{students.length}</span>}
          </MainTabBtn>
          <MainTabBtn active={mainTab === 'reports'} onClick={() => setMainTab('reports')} icon={<BarChart2 size={14} />}>Отчёты</MainTabBtn>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 flex flex-col gap-4">

        {/* JOURNAL */}
        {mainTab === 'journal' && (
          <>
            <DateBar selectedDate={selectedDate} onDateChange={(d) => { setSelectedDate(d); setSearch(''); }} />
            {students.length > 0 && <StatsBar students={students} date={selectedDate} />}

            <div className="flex flex-col md:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input type="text" placeholder="Поиск по имени..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-650 placeholder-slate-500" />
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button onClick={handleMarkAllPresent}
                  disabled={absentList.length === 0 || markCome.isPending}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-705 hover:bg-emerald-600 disabled:bg-slate-900/60 disabled:border-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white transition-all whitespace-nowrap border border-transparent">
                  {markCome.isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                  <span>{markCome.isPending ? 'Отмечаем...' : `Все пришли (${absentList.length})`}</span>
                </button>
                <button onClick={() => refetch()}
                  title="Обновить"
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors">
                  <RefreshCw size={15} />
                </button>
                <CopyButtons students={students} date={selectedDate} mentorName={mentorName || 'Ментор'} />
              </div>
            </div>

            {/* Filter tabs */}
            {students.length > 0 && (
              <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                <FilterTabBtn active={filterTab === 'absent'} onClick={() => setFilterTab('absent')} color="red" icon={<X size={13} />} label="Не пришли" count={absentList.length} />
                <FilterTabBtn active={filterTab === 'present'} onClick={() => setFilterTab('present')} color="green" icon={<Check size={13} />} label="Пришли" count={presentList.length} />
                <FilterTabBtn active={filterTab === 'all'} onClick={() => setFilterTab('all')} color="gray" icon={<Users size={13} />} label="Все" count={allList.length} />
              </div>
            )}

            {isError && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle size={15} /><span>Ошибка загрузки. Попробуйте обновить.</span>
              </div>
            )}
            {isLoading && students.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={28} className="animate-spin text-indigo-400" />
                <p className="text-slate-400 text-sm">Загрузка студентов...</p>
              </div>
            )}
            {!isLoading && students.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><Users size={20} className="text-slate-500" /></div>
                <p className="text-slate-300 font-medium">Нет студентов</p>
                <p className="text-slate-500 text-sm">
                  Перейдите на вкладку <button onClick={() => setMainTab('students')} className="text-indigo-400 hover:text-indigo-300 underline">Студенты</button> и добавьте группу
                </p>
              </div>
            )}

            {visibleStudents.length > 0 && (
              <div className="flex flex-col gap-1.5 pb-8">
                {visibleStudents.map((student, idx) => (
                  <StudentRow key={student.id} student={student} index={idx}
                    come={student.come.find((e) => e.date === selectedDate)}
                    onArrive={handleArrive} onUnmark={handleUnmark}
                    onTopicChange={handleTopicChange} onTimeEdit={handleTimeEdit}
                    onLessonTypeChange={handleLessonTypeChange} />
                ))}
              </div>
            )}

            {visibleStudents.length === 0 && students.length > 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                {filterTab === 'absent' && (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-900/50 flex items-center justify-center">
                      <CheckCheck size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-emerald-400 font-medium text-sm">Все студенты отмечены!</p>
                    <p className="text-slate-500 text-xs">На {selectedDate} нет непроверенных</p>
                  </>
                )}
                {filterTab === 'present' && <p className="text-slate-400 text-sm">Никто ещё не отмечен на {selectedDate}</p>}
                {filterTab === 'all' && search && <p className="text-slate-500 text-sm">По запросу «{search}» ничего не найдено</p>}
              </div>
            )}
          </>
        )}

        {mainTab === 'students' && <StudentsEditor />}
        {mainTab === 'reports' && <ReportsContent students={students} mentorName={mentorName || 'Ментор'} />}
      </main>
    </div>
  );
}

function MainTabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={clsx('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300')}>
      {icon}{children}
    </button>
  );
}

type FilterColor = 'red' | 'green' | 'gray';
function FilterTabBtn({ active, onClick, color, icon, label, count }: { active: boolean; onClick: () => void; color: FilterColor; icon: React.ReactNode; label: string; count: number }) {
  const colors: Record<FilterColor, { active: string; inactive: string; badge: string }> = {
    red:   { active: 'bg-red-950/60 border border-red-900/60 text-red-300',     inactive: 'text-slate-500 hover:text-slate-300', badge: active ? 'bg-red-900/60 text-red-400'     : 'bg-slate-800 text-slate-500' },
    green: { active: 'bg-emerald-950/60 border border-emerald-900/60 text-emerald-300', inactive: 'text-slate-500 hover:text-slate-300', badge: active ? 'bg-emerald-900/60 text-emerald-400' : 'bg-slate-800 text-slate-500' },
    gray:  { active: 'bg-slate-800 border border-slate-700 text-slate-200',      inactive: 'text-slate-500 hover:text-slate-300', badge: active ? 'bg-slate-700 text-slate-300'   : 'bg-slate-800 text-slate-500' },
  };
  const c = colors[color];
  return (
    <button onClick={onClick}
      className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all', active ? c.active : c.inactive)}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-mono', c.badge)}>{count}</span>
    </button>
  );
}
