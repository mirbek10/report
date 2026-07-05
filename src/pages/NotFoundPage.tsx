import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="max-w-xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Страница не найдена</h1>
        <p className="mt-3 text-slate-300">Возможно, ссылка устарела или вы ошиблись в адресе.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            На главную
          </Link>
          <Link
            to="/setup"
            className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 hover:text-slate-100"
          >
            Настройки
          </Link>
        </div>
      </div>
    </main>
  );
}
