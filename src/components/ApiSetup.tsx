import { useState } from 'react';
import { Link2, Loader2, CheckCircle2, AlertCircle, ExternalLink, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { setApiClient, getStoredApiUrl } from '../api/client';
import { fetchAllStudents } from '../api/students';

interface ApiSetupProps {
  onConfirm: (baseUrl: string) => void;
  onCancel?: () => void;
}

type TestState = 'idle' | 'loading' | 'ok' | 'error';

export function ApiSetup({ onConfirm, onCancel }: ApiSetupProps) {
  const [url, setUrl] = useState(() => getStoredApiUrl());
  const [testState, setTestState] = useState<TestState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const existingUrl = getStoredApiUrl();

  const normalise = (raw: string) =>
    raw.trim().replace(/\/+$/, '').replace(/\/(api|check)\/?$/, '');

  const handleTest = async () => {
    const trimmed = normalise(url);
    if (!trimmed) return;

    setTestState('loading');
    setErrorMsg('');

    try {
      setApiClient(trimmed);
      await fetchAllStudents();
      setTestState('ok');
    } catch (e: unknown) {
      setTestState('error');
      if (e && typeof e === 'object' && 'response' in e) {
        const resp = (e as { response?: { status?: number } }).response;
        if (resp?.status === 404) {
          setErrorMsg('Ресурс /students не найден. Создайте его в MockAPI (название: students).');
        } else if (resp?.status === 400) {
          setErrorMsg('Ошибка 400 — возможно URL содержит лишний суффикс (/api, /check). Используйте чистый Base URL.');
        } else {
          setErrorMsg(`Сервер вернул ошибку ${resp?.status ?? ''}. Проверьте URL.`);
        }
      } else {
        setErrorMsg('Не удалось подключиться. Проверьте URL и доступ в интернет.');
      }
    }
  };

  const handleConfirm = () => {
    const trimmed = normalise(url);
    setApiClient(trimmed);
    onConfirm(trimmed);
  };

  const isValidUrl = url.trim().startsWith('https://');
  const normalisedPreview = isValidUrl ? normalise(url) : '';
  const hasExtraSuffix = isValidUrl && normalisedPreview !== url.trim().replace(/\/+$/, '');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-xl shadow-indigo-950/60 ring-1 ring-slate-800" />
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Ончёт</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Журнал посещаемости студентов</p>
        </div>

        {/* Main card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-7 sm:p-8 shadow-2xl shadow-black/50">
          
          {/* Top Bar with Back Button */}
          {existingUrl && onCancel && (
            <div className="mb-5 pb-4 border-b border-slate-800/80">
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/40 px-3.5 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-950/30"
              >
                <ArrowLeft size={14} />
                <span>Назад к журналу</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-indigo-950/80 border border-indigo-800/50 rounded-xl text-indigo-400">
              <Link2 size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Подключение к MockAPI</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Вставьте Base URL вашего проекта на MockAPI. Данные будут храниться только в вашем аккаунте.
          </p>

          {/* URL input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Base URL проекта</label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setTestState('idle'); }}
                placeholder="https://xxxxxxxx.mockapi.io/api"
                className="w-full bg-slate-950/80 border border-slate-700/80 text-slate-100 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-600 font-mono transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Пример: <span className="text-slate-300 font-mono">https://abc123.mockapi.io</span>
            </p>
            {hasExtraSuffix && (
              <div className="flex items-start gap-2.5 mt-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90">
                  Обнаружен лишний суффикс. Будет использован:
                  <span className="font-mono font-semibold block mt-0.5 text-amber-300">{normalisedPreview}</span>
                </p>
              </div>
            )}
          </div>

          {/* Test result */}
          {testState === 'ok' && (
            <div className="flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl px-4 py-3.5 mb-4 animate-in fade-in duration-200">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-300 text-sm font-medium">Подключение успешно! Ресурс /students доступен.</span>
            </div>
          )}

          {testState === 'error' && (
            <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-800/40 rounded-2xl px-4 py-3.5 mb-4 animate-in fade-in duration-200">
              <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={handleTest}
              disabled={!isValidUrl || testState === 'loading'}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/80 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-200 font-semibold py-3.5 px-4 rounded-2xl transition-all text-sm border border-slate-700/50"
            >
              {testState === 'loading' ? (
                <Loader2 size={16} className="animate-spin text-indigo-400" />
              ) : (
                <CheckCircle2 size={16} className="text-slate-400" />
              )}
              {testState === 'loading' ? 'Проверяем...' : 'Проверить связь'}
            </button>

            <button
              onClick={handleConfirm}
              disabled={!isValidUrl || testState === 'loading'}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-2xl transition-all text-sm shadow-lg shadow-indigo-950/50"
            >
              {existingUrl ? 'Сохранить изменения' : 'Войти в систему →'}
            </button>
          </div>

          {/* Instructions toggle */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-200 transition-colors py-2 px-1 font-medium group"
          >
            <span className="group-hover:translate-x-0.5 transition-transform">Как настроить MockAPI?</span>
            <div className="p-1 rounded-lg bg-slate-800/50 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200 transition-colors">
              {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showGuide && (
            <div className="mt-4 space-y-4 text-sm border-t border-slate-800/80 pt-5 animate-in fade-in duration-200">
              <div>
                <a
                  href="https://mockapi.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                >
                  <ExternalLink size={14} />
                  Открыть mockapi.io
                </a>
                <p className="text-slate-500 text-xs mt-1">Создайте аккаунт и новый проект в пару кликов.</p>
              </div>

              <Step n={1} title="Создайте ресурс students">
                <p className="text-slate-300 text-xs">Поля: <Code>name</Code>, <Code>groupName</Code>, <Code>currentTopic</Code></p>
                <p className="text-slate-500 mt-0.5 text-xs">Оставьте список пустым — студентов можно добавить прямо в приложении.</p>
              </Step>

              <Step n={2} title="Создайте ресурс attendance">
                <p className="text-slate-300 text-xs">Поля: <Code>date</Code>, <Code>studentId</Code>, <Code>status</Code>, <Code>checkInTime</Code>, <Code>topicAtThatMoment</Code></p>
                <p className="text-slate-500 mt-0.5 text-xs">Оставьте пустым — приложение заполнит его автоматически.</p>
              </Step>

              <Step n={3} title="Скопируйте Base URL">
                <p className="text-slate-300 text-xs">В настройках проекта MockAPI скопируйте Base URL и вставьте в поле выше.</p>
                <p className="text-slate-500 mt-0.5 text-xs">Формат: <span className="font-mono text-slate-400">https://abc123.mockapi.io/api</span></p>
              </Step>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-6 h-6 rounded-xl bg-indigo-900/80 border border-indigo-700/50 text-indigo-200 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold shadow-sm">
        {n}
      </div>
      <div>
        <p className="text-slate-200 font-semibold text-xs mb-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-950 border border-slate-800 text-indigo-300 px-1.5 py-0.5 rounded-md text-xs font-mono">
      {children}
    </code>
  );
}