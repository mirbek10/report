import { useState } from 'react';
import { Link2, Loader2, CheckCircle2, AlertCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { setApiClient } from '../api/client';
import { fetchAllStudents } from '../api/students';

interface ApiSetupProps {
  onConfirm: (baseUrl: string) => void;
}

type TestState = 'idle' | 'loading' | 'ok' | 'error';

export function ApiSetup({ onConfirm }: ApiSetupProps) {
  const [url, setUrl] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Normalise URL: trim, remove trailing slash
  // MockAPI base URL should look like https://abc123.mockapi.io
  // NOT https://abc123.mockapi.io/api or /check — resources are appended by the app
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
      setApiClient('');
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <img src="/favicon.svg" alt="" className="w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-indigo-900/40" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Ончёт</h1>
          <p className="text-slate-400 mt-2 text-sm">Журнал посещаемости студентов</p>
        </div>

        {/* Main card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={16} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-100">Подключение к MockAPI</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Вставьте Base URL вашего проекта на MockAPI. Данные будут храниться только в вашем аккаунте.
          </p>

          {/* URL input */}
          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Base URL проекта</label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setTestState('idle'); }}
              placeholder="https://xxxxxxxx.mockapi.io/api"
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Пример: <span className="text-slate-400 font-mono">https://abc123.mockapi.io</span>
            </p>
            {hasExtraSuffix && (
              <div className="flex items-start gap-2 mt-2 bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Обнаружен лишний суффикс. Будет использован:
                  <span className="font-mono block mt-0.5 text-amber-200">{normalisedPreview}</span>
                </p>
              </div>
            )}
          </div>

          {/* Test result */}
          {testState === 'ok' && (
            <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800/50 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-emerald-400 text-sm">Подключение успешно! Ресурс /students доступен.</span>
            </div>
          )}

          {testState === 'error' && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm">{errorMsg}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={handleTest}
              disabled={!isValidUrl || testState === 'loading'}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-200 font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {testState === 'loading' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {testState === 'loading' ? 'Проверяем...' : 'Проверить'}
            </button>

            <button
              onClick={handleConfirm}
              disabled={!isValidUrl || testState === 'loading'}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              Войти →
            </button>
          </div>

          {/* Instructions toggle */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span>Как настроить MockAPI?</span>
            {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showGuide && (
            <div className="mt-4 space-y-4 text-sm border-t border-slate-800 pt-4">

              <div>
                <a
                  href="https://mockapi.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <ExternalLink size={13} />
                  Открыть mockapi.io
                </a>
                <p className="text-slate-500 mt-1">Создайте аккаунт и новый проект.</p>
              </div>

              <Step n={1} title="Создайте ресурс students">
                <p className="text-slate-400">Поля: <Code>name</Code>, <Code>groupName</Code>, <Code>currentTopic</Code></p>
                <p className="text-slate-500 mt-1 text-xs">Оставьте пустым — студентов добавите прямо в приложении.</p>
              </Step>

              <Step n={2} title="Создайте ресурс attendance">
                <p className="text-slate-400">Поля: <Code>date</Code>, <Code>studentId</Code>, <Code>status</Code>, <Code>checkInTime</Code>, <Code>topicAtThatMoment</Code></p>
                <p className="text-slate-500 mt-1 text-xs">Оставьте пустым — приложение заполнит его автоматически.</p>
              </Step>

              <Step n={3} title="Скопируйте Base URL">
                <p className="text-slate-400">В настройках проекта MockAPI скопируйте Base URL и вставьте выше.</p>
                <p className="text-slate-500 mt-1 text-xs">Выглядит как: <span className="font-mono">https://abc123.mockapi.io/api</span></p>
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
    <div className="flex gap-3">
      <div className="w-5 h-5 rounded-full bg-indigo-700 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
        {n}
      </div>
      <div>
        <p className="text-slate-200 font-medium mb-1">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  );
}
