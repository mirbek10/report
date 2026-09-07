import { useState } from 'react';
import { X, ExternalLink, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, RefreshCw, Sheet, Bug, Calendar } from 'lucide-react';
import { getSheetsUrl, saveSheetsUrl, clearSheetsUrl, pingSheetsScript, syncAllToSheets, syncDayToSheets } from '../utils/sheetsSync';
import type { Student } from '../types';

interface Props {
  students: Student[];
  selectedDate?: string;
  onClose: () => void;
}

type TestState = 'idle' | 'loading' | 'ok' | 'error';
type SyncState = 'idle' | 'loading' | 'ok' | 'error';

export function SheetsSetupModal({ students, selectedDate, onClose }: Props) {
  const [url, setUrl] = useState(getSheetsUrl);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMsg, setSyncMsg] = useState('');
  const [syncDayState, setSyncDayState] = useState<SyncState>('idle');
  const [syncDayMsg, setSyncDayMsg] = useState('');
  const [showGuide, setShowGuide] = useState(!getSheetsUrl());
  const [debugInfo, setDebugInfo] = useState('');

  const trimmed = url.trim();
  const isValid = trimmed.startsWith('https://script.google.com/');

  const handleSave = () => {
    saveSheetsUrl(trimmed);
  };

  const handleClear = () => {
    clearSheetsUrl();
    setUrl('');
    setTestState('idle');
    setSyncState('idle');
  };

  const handleTest = async () => {
    if (!isValid) return;
    handleSave();
    setTestState('loading');
    setTestMsg('');
    const result = await pingSheetsScript(trimmed);
    if (result.ok) {
      setTestState('ok');
      setTestMsg('Скрипт отвечает. Можно синхронизировать.');
    } else {
      setTestState('error');
      setTestMsg(result.error);
    }
  };

  const handleSyncAll = async () => {
    if (!isValid) return;
    handleSave();
    setSyncState('loading');
    setSyncMsg('');

    const totalEntries = students.reduce((s, st) => s + st.come.length, 0);
    setDebugInfo(`Студентов: ${students.length} | Записей: ${totalEntries} | ~${Math.round(JSON.stringify(students).length / 1024)} КБ → После синхронизации откройте GAS → View → Executions чтобы увидеть лог`);

    const result = await syncAllToSheets(students, trimmed);
    if (result.ok) {
      setSyncState('ok');
      setSyncMsg(result.message);
    } else {
      setSyncState('error');
      setSyncMsg(result.error);
    }
  };

  const handleSyncDay = async () => {
    if (!isValid || !selectedDate) return;
    handleSave();
    setSyncDayState('loading');
    setSyncDayMsg('');
    const result = await syncDayToSheets(students, selectedDate, trimmed);
    if (result.ok) {
      setSyncDayState('ok');
      setSyncDayMsg(result.message);
    } else {
      setSyncDayState('error');
      setSyncDayMsg(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/60 border border-emerald-800/40 rounded-xl">
              <Sheet size={16} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold text-base">Синхронизация с Google Sheets</h2>
              <p className="text-xs text-slate-500 mt-0.5">Данные отправляются напрямую в ваши таблицы</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">

          {/* URL field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              URL веб-приложения (Apps Script)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestState('idle'); setSyncState('idle'); }}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/50 focus:border-emerald-700 placeholder-slate-600"
              autoFocus
            />
            {trimmed && !isValid && (
              <p className="text-xs text-amber-400 mt-1.5 pl-1">
                URL должен начинаться с https://script.google.com/
              </p>
            )}
          </div>

          {/* Test result */}
          {testState === 'ok' && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              {testMsg}
            </div>
          )}
          {testState === 'error' && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-3.5 py-2.5 text-sm text-red-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {testMsg}
            </div>
          )}

          {/* Sync result */}
          {syncState === 'ok' && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              {syncMsg}
            </div>
          )}
          {syncState === 'error' && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-3.5 py-2.5 text-sm text-red-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {syncMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={!isValid || testState === 'loading'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {testState === 'loading'
                ? <Loader2 size={14} className="animate-spin" />
                : <CheckCircle2 size={14} className="text-slate-400" />}
              Проверить
            </button>
            <button
              onClick={handleSyncAll}
              disabled={!isValid || syncState === 'loading'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-950/40"
            >
              {syncState === 'loading'
                ? <Loader2 size={14} className="animate-spin" />
                : <RefreshCw size={14} />}
              {syncState === 'loading' ? 'Синхронизация...' : `Синхронизировать всё (${students.length} студ.)`}
            </button>
          </div>

          {/* Sync day button */}
          {selectedDate && (
            <button
              onClick={handleSyncDay}
              disabled={!isValid || syncDayState === 'loading'}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {syncDayState === 'loading'
                ? <Loader2 size={14} className="animate-spin" />
                : <Calendar size={14} className="text-slate-400" />}
              {syncDayState === 'loading' ? 'Отправка...' : `Только ${selectedDate}`}
            </button>
          )}

          {/* Sync day result */}
          {syncDayState === 'ok' && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3.5 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 size={15} className="flex-shrink-0" />{syncDayMsg}
            </div>
          )}
          {syncDayState === 'error' && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-3.5 py-2.5 text-sm text-red-300">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{syncDayMsg}
            </div>
          )}

          {/* Debug info */}
          {debugInfo && (
            <div className="flex items-start gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 font-mono">
              <Bug size={13} className="flex-shrink-0 mt-0.5 text-slate-500" />
              <div className="space-y-1">
                <p>{debugInfo}</p>
                <p className="text-slate-600">После синхронизации откройте GAS → View → Executions чтобы увидеть лог</p>
              </div>
            </div>
          )}

          {/* What gets synced */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Что записывается в таблицу</p>
            <Row label="Лист «Журнал»" value="Записи по дням: дата, имя, группа, приход, уход, тип, тема" />
            <Row label="Лист «Мета»"   value="Дата синхронизации, кол-во студентов и записей" />
          </div>

          {/* Setup guide */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-1 font-medium"
          >
            <span>Как настроить Apps Script?</span>
            {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showGuide && (
            <div className="space-y-3 text-sm border-t border-slate-800 pt-4">
              <Step n={1} title="Откройте Google Sheets и создайте новую таблицу" />
              <Step n={2} title='Откройте Extensions → Apps Script'>
                <p className="text-slate-500 text-xs mt-0.5">Откроется редактор скрипта.</p>
              </Step>
              <Step n={3} title="Вставьте код из файла gas-webhook.js">
                <a
                  href="/gas-webhook.js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                >
                  <ExternalLink size={12} />
                  Открыть gas-webhook.js
                </a>
                <p className="text-slate-500 text-xs mt-0.5">Скопируйте весь код и вставьте вместо содержимого редактора.</p>
              </Step>
              <Step n={4} title='Нажмите Deploy → New deployment'>
                <p className="text-slate-500 text-xs mt-0.5">
                  Type: <span className="text-slate-300 font-mono">Web app</span><br />
                  Execute as: <span className="text-slate-300 font-mono">Me</span><br />
                  Who has access: <span className="text-slate-300 font-mono">Anyone</span>
                </p>
              </Step>
              <Step n={5} title="Скопируйте Web app URL и вставьте выше">
                <p className="text-slate-500 text-xs mt-0.5">
                  Формат: <span className="font-mono text-slate-400 text-xs">https://script.google.com/macros/s/.../exec</span>
                </p>
              </Step>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60">
          {getSheetsUrl() && (
            <button
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              Отключить Sheets
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors font-semibold"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-slate-300 font-semibold w-36 flex-shrink-0">{label}</span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-5 h-5 rounded-lg bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 text-xs flex items-center justify-center flex-shrink-0 font-bold">
        {n}
      </div>
      <div>
        <p className="text-slate-200 text-xs font-semibold">{title}</p>
        {children}
      </div>
    </div>
  );
}
