import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, Users, X, ChevronDown, Trash2, Star } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Default groups ────────────────────────────────────────────────────────────
export const DEFAULT_GROUPS = [
  'Группа A', 'Группа B', 'Группа C', 'Группа D', 'Группа E',
  'Frontend', 'Backend', 'Fullstack', 'Design', 'Mobile',
];

const LS_CUSTOM_KEY = 'onchet_custom_groups';
const LS_DEFAULT_KEY = 'onchet_default_group';

// ─── Storage helpers ───────────────────────────────────────────────────────────
export function loadCustomGroups(): string[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomGroups(groups: string[]) {
  try { localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(groups)); }
  catch (err) { console.warn('Failed to save custom groups:', err); }
}

export function getDefaultGroup(): string {
  try { return localStorage.getItem(LS_DEFAULT_KEY) || DEFAULT_GROUPS[0]; }
  catch { return DEFAULT_GROUPS[0]; }
}

export function setDefaultGroup(group: string) {
  try { localStorage.setItem(LS_DEFAULT_KEY, group); }
  catch (err) { console.warn('Failed to save default group:', err); }
}

export function addCustomGroup(group: string) {
  const existing = loadCustomGroups();
  if (!existing.includes(group)) saveCustomGroups([group, ...existing]);
}

function removeCustomGroup(group: string) {
  const existing = loadCustomGroups();
  saveCustomGroups(existing.filter((g) => g !== group));
}

export function getAllGroups(): string[] {
  const custom = loadCustomGroups();
  return [...new Set([...custom, ...DEFAULT_GROUPS])];
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface GroupPickerProps {
  value: string;
  onChange: (group: string) => void;
  disabled?: boolean;
  /** compact = inline button for table rows */
  compact?: boolean;
  /** show star button to set as default group */
  showSetDefault?: boolean;
}

export function GroupPicker({ value, onChange, disabled, compact, showSetDefault }: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Keep both in state so updates are reactive
  const [allGroups, setAllGroups] = useState<string[]>(getAllGroups);
  const [customGroups, setCustomGroups] = useState<string[]>(loadCustomGroups);
  const [defaultGroup, setDefaultGroupState] = useState<string>(getDefaultGroup);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refresh when re-opening in case another picker made changes
  const refreshGroups = () => {
    const custom = loadCustomGroups();
    setCustomGroups(custom);
    setAllGroups([...new Set([...custom, ...DEFAULT_GROUPS])]);
    setDefaultGroupState(getDefaultGroup());
  };

  const filtered = query.trim()
    ? allGroups.filter((g) => g.toLowerCase().includes(query.toLowerCase()))
    : allGroups;

  const canCreate: boolean =
    Boolean(query.trim()) &&
    !allGroups.some((g) => g.toLowerCase() === query.trim().toLowerCase());

  const handleOpen = () => {
    if (disabled) return;
    refreshGroups();
    setQuery('');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = useCallback((group: string) => {
    onChange(group);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  const handleCreate = useCallback(() => {
    const newGroup = query.trim();
    if (!newGroup) return;
    addCustomGroup(newGroup);
    const custom = loadCustomGroups();
    setCustomGroups(custom);
    setAllGroups([...new Set([...custom, ...DEFAULT_GROUPS])]);
    onChange(newGroup);
    setOpen(false);
    setQuery('');
  }, [query, onChange]);

  const handleDelete = useCallback((group: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCustomGroup(group);
    const custom = loadCustomGroups();
    setCustomGroups(custom);
    setAllGroups([...new Set([...custom, ...DEFAULT_GROUPS])]);
    // If deleted group was default, reset default
    if (getDefaultGroup() === group) {
      setDefaultGroup(DEFAULT_GROUPS[0]);
      setDefaultGroupState(DEFAULT_GROUPS[0]);
    }
    if (value === group) onChange(DEFAULT_GROUPS[0]);
  }, [value, onChange]);

  const handleSetDefault = useCallback((group: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDefaultGroup(group);
    setDefaultGroupState(group);
  }, []);

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
      <div ref={containerRef} className="relative w-full">
        <button
          onClick={handleOpen}
          disabled={disabled}
          className={clsx(
            'w-full flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg focus:outline-none transition-colors cursor-pointer text-left',
            disabled
              ? 'bg-transparent text-slate-500 cursor-default'
              : 'bg-transparent text-slate-300 hover:bg-slate-800'
          )}
        >
          <span className="truncate flex-1">{value || '— группа —'}</span>
          <ChevronDown size={10} className="text-slate-600 flex-shrink-0" />
        </button>

        {open && (
          <GroupDropdown
            query={query}
            setQuery={setQuery}
            filtered={filtered}
            canCreate={canCreate}
            customGroups={customGroups}
            defaultGroup={defaultGroup}
            inputRef={inputRef}
            onSelect={handleSelect}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onSetDefault={showSetDefault ? handleSetDefault : undefined}
            onKeyDown={handleKeyDown}
            onClose={() => setOpen(false)}
            alignRight={false}
          />
        )}
      </div>
    );
  }

  // Full size — for StudentFormModal
  return (
    <div ref={containerRef} className="relative w-full">
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="w-full flex items-center gap-2 bg-transparent text-slate-200 text-sm focus:outline-none cursor-pointer"
      >
        <span className="flex-1 text-left truncate">{value || '— выбрать группу —'}</span>
        <ChevronDown size={14} className="text-slate-500 flex-shrink-0 pointer-events-none" />
      </button>

      {open && (
        <GroupDropdown
          query={query}
          setQuery={setQuery}
          filtered={filtered}
          canCreate={canCreate}
          customGroups={customGroups}
          defaultGroup={defaultGroup}
          inputRef={inputRef}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onSetDefault={showSetDefault ? handleSetDefault : undefined}
          onKeyDown={handleKeyDown}
          onClose={() => setOpen(false)}
          alignRight={false}
        />
      )}
    </div>
  );
}

// ─── Dropdown ──────────────────────────────────────────────────────────────────
interface DropdownProps {
  query: string;
  setQuery: (q: string) => void;
  filtered: string[];
  canCreate: boolean;
  customGroups: string[];
  defaultGroup: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (g: string) => void;
  onCreate: () => void;
  onDelete: (g: string, e: React.MouseEvent) => void;
  onSetDefault?: (g: string, e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onClose: () => void;
  alignRight: boolean;
}

function GroupDropdown({
  query, setQuery, filtered, canCreate, customGroups, defaultGroup,
  inputRef, onSelect, onCreate, onDelete, onSetDefault, onKeyDown, onClose, alignRight,
}: DropdownProps) {
  return (
    <div className={clsx(
      'absolute top-full mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-64',
      alignRight ? 'right-0' : 'left-0'
    )}>
      {/* Search / create input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <Search size={13} className="text-slate-500 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Поиск или новая группа..."
          className="flex-1 bg-transparent text-slate-200 text-xs focus:outline-none placeholder-slate-600"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-600 hover:text-slate-400">
            <X size={12} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-56 overflow-y-auto scrollbar-thin py-1">
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

        {filtered.map((group) => {
          const isCustom = customGroups.includes(group);
          const isDefault = group === defaultGroup;
          return (
            <div key={group} className="group/item flex items-center">
              <button
                onClick={() => onSelect(group)}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors text-left min-w-0"
              >
                <Users size={11} className="text-slate-600 flex-shrink-0" />
                <span className="truncate flex-1">{group}</span>
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  {isDefault && (
                    <span className="text-[9px] text-amber-500 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded-full font-semibold">
                      осн.
                    </span>
                  )}
                  {isCustom && !isDefault && (
                    <span className="text-[9px] text-indigo-500 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded-full font-medium">
                      своя
                    </span>
                  )}
                </div>
              </button>

              {/* Action buttons shown on hover */}
              <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-all pr-1 gap-0.5">
                {/* Set as default */}
                {onSetDefault && !isDefault && (
                  <button
                    onClick={(e) => onSetDefault(group, e)}
                    className="p-1.5 text-slate-600 hover:text-amber-400 transition-colors rounded"
                    title="Сделать основной"
                  >
                    <Star size={11} />
                  </button>
                )}
                {/* Delete custom group */}
                {isCustom && (
                  <button
                    onClick={(e) => onDelete(group, e)}
                    className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded"
                    title="Удалить группу"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-1.5 border-t border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-700">{filtered.length} групп</span>
        {onSetDefault && (
          <span className="text-[10px] text-slate-700">
            <Star size={9} className="inline mr-0.5 text-amber-700" />— основная по умолчанию
          </span>
        )}
        <button onClick={onClose} className="text-xs text-slate-600 hover:text-slate-400">Закрыть</button>
      </div>
    </div>
  );
}
