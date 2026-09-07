import { useState, useEffect } from 'react';
import { Radio, Gamepad2, X, Users, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { getDayEvents, setDayEvent, removeDayEvent } from '../utils/dayEvents';
import type { EventType, DayEvent } from '../utils/dayEvents';

interface Props {
  date: string; // "DD.MM.YY"
}

interface EventFormState {
  time: string;
  participants: string;
}

const EMPTY_FORM: EventFormState = { time: '', participants: '' };

export function DayEventsBar({ date }: Props) {
  const [events, setEvents] = useState(() => getDayEvents(date));
  const [editing, setEditing] = useState<EventType | null>(null);
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);

  // При смене дня — перечитываем куки
  useEffect(() => {
    setEvents(getDayEvents(date));
    setEditing(null);
    setForm(EMPTY_FORM);
  }, [date]);

  const reload = () => setEvents(getDayEvents(date));

  const openForm = (type: EventType) => {
    const existing = events[type];
    setForm({
      time: existing?.time ?? '',
      participants: existing ? String(existing.participants) : '',
    });
    setEditing(type);
  };

  const handleSave = () => {
    if (!editing) return;
    const participants = parseInt(form.participants, 10);
    if (!form.time || isNaN(participants) || participants < 0) return;
    const event: DayEvent = { type: editing, time: form.time, participants };
    setDayEvent(date, event);
    reload();
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleRemove = (type: EventType) => {
    removeDayEvent(date, type);
    reload();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setEditing(null); setForm(EMPTY_FORM); }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <EventButton
          type="live"
          label="Прямой эфир"
          icon={<Radio size={13} />}
          event={events.live}
          active={editing === 'live'}
          onAdd={() => openForm('live')}
          onRemove={() => handleRemove('live')}
        />
        <EventButton
          type="kahoot"
          label="Кахут"
          icon={<Gamepad2 size={13} />}
          event={events.kahoot}
          active={editing === 'kahoot'}
          onAdd={() => openForm('kahoot')}
          onRemove={() => handleRemove('kahoot')}
        />
      </div>

      {/* Inline form */}
      {editing && (
        <div
          onKeyDown={handleKeyDown}
          className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 animate-in fade-in duration-150"
        >
          <span className="text-xs font-semibold text-slate-400 mr-1">
            {editing === 'live' ? 'Прямой эфир' : 'Кахут'}:
          </span>

          {/* Time */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Clock size={11} className="text-slate-500" />
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              className="bg-transparent text-slate-200 text-xs w-16 focus:outline-none [color-scheme:dark]"
              autoFocus
            />
          </div>

          {/* Participants */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Users size={11} className="text-slate-500" />
            <input
              type="number"
              min={0}
              value={form.participants}
              onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
              placeholder="кол-во"
              className="bg-transparent text-slate-200 text-xs w-16 focus:outline-none placeholder-slate-600"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!form.time || !form.participants}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-650 hover:bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Сохранить
          </button>
          <button
            onClick={() => { setEditing(null); setForm(EMPTY_FORM); }}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── EventButton ───────────────────────────────────────────────
function EventButton({
  label, icon, event, active, onAdd, onRemove,
}: {
  type: EventType;
  label: string;
  icon: React.ReactNode;
  event?: DayEvent;
  active: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const hasEvent = !!event;

  if (hasEvent) {
    return (
      <div className={clsx(
        'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border text-xs font-semibold',
        'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
      )}>
        {icon}
        <span>{label}</span>
        <span className="text-indigo-400 font-mono">{event.time}</span>
        <span className="flex items-center gap-0.5 text-indigo-300">
          <Users size={10} />
          {event.participants}
        </span>
        <button
          onClick={onAdd}
          title="Изменить"
          className="ml-0.5 px-1.5 py-0.5 rounded-md text-indigo-400 hover:text-indigo-200 hover:bg-indigo-900/40 transition-colors text-[10px]"
        >
          изм.
        </button>
        <button
          onClick={onRemove}
          title="Удалить"
          className="p-0.5 rounded-md text-indigo-600 hover:text-red-400 hover:bg-red-950/20 transition-colors"
        >
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onAdd}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
        active
          ? 'bg-indigo-950/40 border-indigo-700/50 text-indigo-300'
          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
      )}
    >
      {icon}
      + {label}
    </button>
  );
}
