import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Tag, X } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Default topic list ────────────────────────────────────────────────────────
const DEFAULT_TOPICS = [
  // Web foundations
  'HTML basics', 'HTML5 semantic', 'CSS basics', 'CSS Flexbox', 'CSS Grid',
  'CSS animations', 'Responsive design', 'CSS variables', 'SASS/SCSS',
  // JavaScript
  'JS: variables & types', 'JS: functions', 'JS: arrays & objects',
  'JS: DOM manipulation', 'JS: events', 'JS: async/await', 'JS: Promises',
  'JS: fetch API', 'JS: ES6+ features', 'JS: closures', 'JS: prototypes',
  'JS: error handling', 'JS: modules', 'JS: classes', 'JS: iterators',
  // TypeScript
  'TS: types & interfaces', 'TS: generics', 'TS: enums', 'TS: decorators',
  'TS: utility types', 'TS: config & setup',
  // React
  'React: JSX', 'React: components', 'React: props', 'React: state',
  'React: hooks (useState)', 'React: hooks (useEffect)', 'React: hooks (useRef)',
  'React: hooks (useMemo)', 'React: hooks (useCallback)', 'React: context',
  'React: custom hooks', 'React: forms', 'React: routing', 'React: Redux',
  'React: Zustand', 'React: React Query', 'React: performance',
  // Next.js
  'Next.js: pages & routing', 'Next.js: SSR', 'Next.js: SSG', 'Next.js: ISR',
  'Next.js: API routes', 'Next.js: App Router', 'Next.js: metadata',
  // Node.js & Backend
  'Node.js: basics', 'Node.js: modules', 'Node.js: file system',
  'Node.js: streams', 'Express.js', 'REST API design', 'GraphQL basics',
  'Authentication & JWT', 'OAuth', 'Middleware',
  // Databases
  'SQL basics', 'PostgreSQL', 'MySQL', 'MongoDB', 'Prisma ORM',
  'Mongoose', 'Redis', 'Database design', 'Migrations',
  // DevOps & Tools
  'Git basics', 'Git branching', 'Git rebase & merge', 'GitHub Actions',
  'Docker basics', 'Docker Compose', 'CI/CD', 'Linux basics',
  'Nginx', 'Environment variables',
  // Testing
  'Jest basics', 'Unit testing', 'Integration testing', 'E2E testing',
  'Vitest', 'Cypress', 'Testing Library',
  // Computer Science
  'Algorithms: sorting', 'Algorithms: searching', 'Big O notation',
  'Data structures: arrays', 'Data structures: linked list',
  'Data structures: stack & queue', 'Data structures: trees',
  'Data structures: hash maps', 'Recursion', 'Dynamic programming',
  // Soft skills & Project
  'Code review', 'Clean code', 'Design patterns', 'SOLID principles',
  'Agile / Scrum', 'Final project', 'Project presentation',
];

const LS_KEY = 'onchet_custom_topics';

function loadCustomTopics(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTopics(topics: string[]) {
  try { 
    localStorage.setItem(LS_KEY, JSON.stringify(topics)); 
  } catch (err) {
    console.warn('Failed to save custom topics:', err);
  }
}

function addCustomTopic(topic: string) {
  const existing = loadCustomTopics();
  if (!existing.includes(topic)) {
    saveCustomTopics([topic, ...existing]);
  }
}

function getAllTopics(): string[] {
  const custom = loadCustomTopics();
  // Custom topics first, then defaults (deduped)
  const all = [...custom, ...DEFAULT_TOPICS];
  return [...new Set(all)];
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface TopicPickerProps {
  value: string;
  onChange: (topic: string) => void;
  disabled?: boolean;
  compact?: boolean; // smaller style for StudentRow
}

export function TopicPicker({ value, onChange, disabled, compact }: TopicPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allTopics, setAllTopics] = useState<string[]>(getAllTopics);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered list
  const filtered = query.trim()
    ? allTopics.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : allTopics;

  const canCreate: boolean = Boolean(query.trim()) && !allTopics.some(
    (t) => t.toLowerCase() === query.trim().toLowerCase()
  );

  const handleOpen = () => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = useCallback((topic: string) => {
    onChange(topic);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const handleCreate = useCallback(() => {
    const newTopic = query.trim();
    if (!newTopic) return;
    addCustomTopic(newTopic);
    setAllTopics(getAllTopics());
    onChange(newTopic);
    setOpen(false);
    setQuery('');
  }, [query, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (canCreate) handleCreate();
      else if (filtered.length > 0) handleSelect(filtered[0]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (compact) {
    return (
      <div ref={containerRef} className="relative">
        <button
          onClick={handleOpen}
          disabled={disabled}
          className={clsx(
            'flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors max-w-[130px] min-w-[80px]',
            disabled
              ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-700 cursor-default'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-600 hover:text-slate-200 cursor-pointer'
          )}
        >
          <Tag size={9} className="flex-shrink-0" />
          <span className="truncate">{value || 'Тема'}</span>
        </button>

        {open && (
          <TopicDropdown
            query={query}
            setQuery={setQuery}
            filtered={filtered}
            canCreate={canCreate}
            inputRef={inputRef}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onKeyDown={handleKeyDown}
            onClose={() => setOpen(false)}
            alignRight
          />
        )}
      </div>
    );
  }

  // Full size (for StudentsEditor table)
  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center gap-1.5 text-xs px-2 py-1 rounded focus:outline-none bg-transparent text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer text-left"
      >
        <span className="truncate flex-1">{value || '— выбрать тему —'}</span>
        <Tag size={9} className="text-slate-600 flex-shrink-0" />
      </button>

      {open && (
        <TopicDropdown
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          canCreate={canCreate}
          inputRef={inputRef}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onKeyDown={handleKeyDown}
          onClose={() => setOpen(false)}
          alignRight={false}
        />
      )}
    </div>
  );
}

// ─── Shared dropdown ───────────────────────────────────────────────────────────
interface DropdownProps {
  query: string;
  setQuery: (q: string) => void;
  filtered: string[];
  canCreate: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (t: string) => void;
  onCreate: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  alignRight: boolean;
}

function TopicDropdown({
  query, setQuery, filtered, canCreate,
  inputRef, onSelect, onCreate, onKeyDown, onClose, alignRight,
}: DropdownProps) {
  return (
    <div className={clsx(
      'absolute top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64',
      alignRight ? 'right-0' : 'left-0'
    )}>
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <Search size={13} className="text-slate-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Поиск или новая тема..."
          className="flex-1 bg-transparent text-slate-200 text-xs focus:outline-none placeholder-slate-600"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400">
            <X size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-52 overflow-y-auto scrollbar-thin py-1">
        {/* Create new */}
        {canCreate && (
          <button
            onClick={onCreate}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-indigo-400 hover:bg-indigo-950/40 transition-colors"
          >
            <Plus size={12} className="flex-shrink-0" />
            <span>Создать «<span className="font-medium">{query.trim()}</span>»</span>
          </button>
        )}

        {filtered.length === 0 && !canCreate && (
          <p className="px-3 py-3 text-xs text-slate-600 text-center">Ничего не найдено</p>
        )}

        {filtered.map((topic) => (
          <button
            key={topic}
            onClick={() => onSelect(topic)}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors truncate"
          >
            {topic}
          </button>
        ))}
      </div>

      <div className="px-3 py-1.5 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-700">{filtered.length} тем</span>
        <button onClick={onClose} className="text-xs text-slate-600 hover:text-slate-400">Закрыть</button>
      </div>
    </div>
  );
}
