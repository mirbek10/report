import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, Plus, Upload, Loader2, Check, AlertCircle, FileSpreadsheet, X, Download, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import { useStudents } from '../hooks/useStudents';
import { TopicPicker } from './TopicPicker';
import { GroupPicker, getAllGroups, getDefaultGroup } from './GroupPicker';
import { StudentFormModal } from './StudentFormModal';
import type { Student } from '../types';

const TOPICS = [
  'HTML & CSS', 'JavaScript Basics', 'JavaScript Advanced',
  'TypeScript', 'React Basics', 'React Advanced',
  'Next.js', 'Node.js', 'Databases', 'REST API',
  'Git & DevOps', 'Final Project',
];

const DEFAULT_TOPIC = 'HTML & CSS';

interface Row {
  key: string;
  id?: string;
  name: string;
  groupName: string;
  currentTopic: string;
  dirty: boolean;
  saving: boolean;
  error: boolean;
}

interface XlsxPreviewRow {
  name: string;
  phone: string;
  groupName: string;
  currentTopic: string;
  selected: boolean;
}

let keyCounter = 0;
function newKey() { return `row_${++keyCounter}`; }

function studentToRow(s: Student): Row {
  return { key: newKey(), id: s.id, name: s.name, groupName: s.groupName, currentTopic: s.currentTopic, dirty: false, saving: false, error: false };
}

function emptyRow(groupName?: string): Row {
  return { key: newKey(), name: '', groupName: groupName ?? getDefaultGroup(), currentTopic: DEFAULT_TOPIC, dirty: false, saving: false, error: false };
}

/** Clean a name cell: remove ✅, trailing dashes, extra spaces */
function cleanName(raw: unknown): string {
  if (raw == null) return '';
  return String(raw)
    .replace(/✅/g, '')
    .replace(/-\s*$/, '')
    .trim();
}

/** Parse xlsx workbook → preview rows */
function parseXlsx(file: File): Promise<XlsxPreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows: XlsxPreviewRow[] = raw
          .map((row) => ({
            name: cleanName(row[0]),
            phone: row[1] != null ? String(row[1]).trim() : '',
            groupName: getDefaultGroup(),
            currentTopic: DEFAULT_TOPIC,
            selected: true,
          }))
          .filter((r) => r.name.length > 0);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Download a template .xlsx */
function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Имя студента', 'Телефон', 'Группа', 'Текущая тема'],
    ['Иванов Иван', '+996 700 000 001', 'Группа A', 'HTML & CSS'],
    ['Петрова Мария', '+996 700 000 002', 'Группа A', 'JavaScript Basics'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Студенты');
  XLSX.writeFile(wb, 'students_template.xlsx');
}

/** Export all students to .xlsx */
function exportStudents(students: Student[]) {
  const wb = XLSX.utils.book_new();

  // Group students by groupName
  const groups = [...new Set(students.map((s) => s.groupName || 'Без группы'))].sort();

  // Sheet 1: all students
  const allRows: (string | number)[][] = [
    ['#', 'Имя студента', 'Группа', 'Текущая тема', 'Всего посещений'],
    ...students.map((s, i) => [
      i + 1,
      s.name,
      s.groupName || 'Без группы',
      s.currentTopic || '',
      s.come.length,
    ]),
  ];
  const wsAll = XLSX.utils.aoa_to_sheet(allRows);
  wsAll['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsAll, 'Все студенты');

  // One sheet per group
  for (const group of groups) {
    const gs = students.filter((s) => (s.groupName || 'Без группы') === group);
    const rows: (string | number)[][] = [
      ['#', 'Имя студента', 'Текущая тема', 'Всего посещений'],
      ...gs.map((s, i) => [i + 1, s.name, s.currentTopic || '', s.come.length]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 24 }, { wch: 14 }];
    // Sheet name max 31 chars, sanitize
    const sheetName = group.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const date = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
  XLSX.writeFile(wb, `students-${date}.xlsx`);
}

// ─── XlsxImportModal ──────────────────────────────────────────────────────────
interface XlsxImportModalProps {
  rows: XlsxPreviewRow[];
  existingNames: Set<string>;
  onClose: () => void;
  onConfirm: (rows: XlsxPreviewRow[]) => void;
  isSaving: boolean;
  progress: { done: number; total: number } | null;
}

function XlsxImportModal({ rows, existingNames, onClose, onConfirm, isSaving, progress }: XlsxImportModalProps) {
  const [preview, setPreview] = useState<XlsxPreviewRow[]>(() =>
    rows.map((r) => ({ ...r, selected: !existingNames.has(r.name.toLowerCase()) }))
  );
  const [groupAll, setGroupAll] = useState(() => getDefaultGroup());
  const [topicAll, setTopicAll] = useState(DEFAULT_TOPIC);
  const [groupOptions] = useState<string[]>(getAllGroups);

  const toggleRow = (i: number) =>
    setPreview((p) => p.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));

  const toggleAll = (val: boolean) =>
    setPreview((p) => p.map((r) => ({ ...r, selected: val })));

  const applyGroupAll = () =>
    setPreview((p) => p.map((r) => r.selected ? { ...r, groupName: groupAll } : r));

  const applyTopicAll = () =>
    setPreview((p) => p.map((r) => r.selected ? { ...r, currentTopic: topicAll } : r));

  const selectedCount = preview.filter((r) => r.selected).length;
  const duplicateCount = preview.filter((r) => existingNames.has(r.name.toLowerCase())).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <FileSpreadsheet size={20} className="text-emerald-400" />
          <div className="flex-1">
            <h2 className="text-slate-100 font-semibold">Импорт из Excel</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Найдено {preview.length} строк
              {duplicateCount > 0 && <span className="text-amber-400 ml-1">· {duplicateCount} уже существует</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Bulk apply controls */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-800/40 flex gap-3 flex-wrap items-end">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleAll(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Выбрать всё</button>
            <span className="text-slate-650">·</span>
            <button onClick={() => toggleAll(false)} className="text-xs text-slate-400 hover:text-slate-205 transition-colors font-medium">Снять всё</button>
          </div>
          <div className="flex items-center gap-1.5 ml-auto flex-wrap gap-y-2">
            <select value={groupAll} onChange={(e) => setGroupAll(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]">
              {groupOptions.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <button onClick={applyGroupAll} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-250 px-2.5 py-1.5 rounded-lg transition-colors font-semibold">
              Применить группу
            </button>
            <select value={topicAll} onChange={(e) => setTopicAll(e.target.value)}
              className="bg-slate-800 border border-slate-750 text-slate-350 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]">
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={applyTopicAll} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-250 px-2.5 py-1.5 rounded-lg transition-colors font-semibold">
              Применить тему
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="sticky top-0 bg-slate-850 z-10 border-b border-slate-800">
              <tr>
                <th className="w-10 px-4 py-3 text-left"><input type="checkbox" checked={selectedCount === preview.length} onChange={(e) => toggleAll(e.target.checked)} className="accent-indigo-500 rounded" /></th>
                <th className="px-3 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Имя</th>
                <th className="px-3 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Телефон</th>
                <th className="px-3 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Группа</th>
                <th className="px-3 py-3 text-left text-xs text-slate-400 font-semibold uppercase tracking-wider">Тема</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {preview.map((row, i) => {
                const isDuplicate = existingNames.has(row.name.toLowerCase());
                return (
                  <tr key={i} className={clsx('transition-colors', row.selected ? 'bg-slate-800/10' : 'bg-slate-900/10 opacity-40')}>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)} className="accent-indigo-500 rounded" />
                    </td>
                    <td className="px-3 py-2">
                      <span className={clsx('text-sm font-medium', isDuplicate ? 'text-amber-400' : 'text-slate-200')}>
                        {row.name}
                      </span>
                      {isDuplicate && <span className="ml-2 text-xs text-amber-500/80 bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.5 rounded-full font-medium">уже есть</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 font-mono">{row.phone}</td>
                    <td className="px-3 py-2">
                      <select
                        value={row.groupName}
                        onChange={(e) => setPreview((p) => p.map((r, idx) => idx === i ? { ...r, groupName: e.target.value } : r))}
                        className="w-28 bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                      >
                        {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select value={row.currentTopic} onChange={(e) => setPreview((p) => p.map((r, idx) => idx === i ? { ...r, currentTopic: e.target.value } : r))}
                        className="bg-slate-800 border border-slate-750 text-slate-200 text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]">
                        {TOPICS.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center gap-3 bg-slate-900/90">
          {progress && isSaving && (
            <div className="flex items-center gap-2 text-xs text-amber-300 mr-auto font-medium">
              <Loader2 size={13} className="animate-spin" />
              Сохраняем {progress.done} / {progress.total}...
            </div>
          )}
          {!isSaving && <span className="text-xs text-slate-500 mr-auto font-medium">{selectedCount} студентов будет добавлено</span>}
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 font-medium">
            Отмена
          </button>
          <button
            onClick={() => onConfirm(preview.filter((r) => r.selected))}
            disabled={selectedCount === 0 || isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isSaving ? 'Сохраняем...' : `Добавить ${selectedCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main StudentsEditor ──────────────────────────────────────────────────────
export function StudentsEditor() {
  const { data: students, isLoading, addStudent, editStudent, removeStudent, batchAddStudents } = useStudents();
  const [rows, setRows] = useState<Row[]>([]);
  const [initialised, setInitialised] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [xlsxPreview, setXlsxPreview] = useState<XlsxPreviewRow[] | null>(null);
  const [xlsxSaving, setXlsxSaving] = useState(false);
  const [xlsxProgress, setXlsxProgress] = useState<{ done: number; total: number } | null>(null);
  const [xlsxError, setXlsxError] = useState('');
  
  // Mobile Form Modal state
  const [editingStudent, setEditingStudent] = useState<{ id?: string; name: string; groupName: string; currentTopic: string; key: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    if (students && !initialised) {
      const timer = setTimeout(() => {
        setRows(students.length > 0 ? students.map(studentToRow) : [emptyRow()]);
        setInitialised(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [students, initialised]);

  const updateRow = useCallback((key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, ...patch } : r)), []);

  const saveRow = useCallback(async (row: Row) => {
    if (!row.name.trim()) return;
    updateRow(row.key, { saving: true, error: false });
    try {
      if (row.id) {
        await editStudent.mutateAsync({ id: row.id, updates: { name: row.name.trim(), groupName: row.groupName, currentTopic: row.currentTopic } });
      } else {
        const created = await addStudent.mutateAsync({ name: row.name.trim(), groupName: row.groupName, currentTopic: row.currentTopic, come: [] });
        updateRow(row.key, { id: created.id, dirty: false, saving: false });
        return;
      }
      updateRow(row.key, { dirty: false, saving: false });
    } catch { updateRow(row.key, { saving: false, error: true }); }
  }, [editStudent, addStudent, updateRow]);

  const addRow = useCallback(() => {
    const lastGroup = rows.at(-1)?.groupName ?? getDefaultGroup();
    const row = emptyRow(lastGroup);
    setRows((prev) => [...prev, row]);
    setTimeout(() => inputRefs.current.get(row.key)?.focus(), 30);
  }, [rows]);

  const deleteRow = useCallback(async (row: Row) => {
    if (row.id) await removeStudent.mutateAsync(row.id);
    setRows((prev) => { const next = prev.filter((r) => r.key !== row.key); return next.length === 0 ? [emptyRow()] : next; });
  }, [removeStudent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: Row, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (row.name.trim()) saveRow(row);
      if (idx === rows.length - 1) { addRow(); }
      else { setTimeout(() => inputRefs.current.get(rows[idx + 1].key)?.focus(), 10); }
    }
    if (e.key === 'Tab' && idx < rows.length - 1) {
      e.preventDefault();
      setTimeout(() => inputRefs.current.get(rows[idx + 1].key)?.focus(), 10);
    }
  }, [rows, addRow, saveRow]);

  // ── Bulk text paste ──
  const handleBulkSave = useCallback(async () => {
    const names = bulkText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (names.length === 0) return;
    const lastGroup = rows.find((r) => r.id)?.groupName ?? getDefaultGroup();
    setBulkSaving(true);
    try {
      const res = await batchAddStudents.mutateAsync(names.map((name) => ({ name, groupName: lastGroup, currentTopic: DEFAULT_TOPIC, come: [] })));
      setRows((prev) => {
        const base = (prev.length === 1 && !prev[0].name.trim() && !prev[0].id) ? [] : prev;
        return [...base, ...res.map(studentToRow)];
      });
      setBulkText(''); setShowBulk(false);
    } finally { setBulkSaving(false); }
  }, [bulkText, rows, batchAddStudents]);

  // ── XLSX file pick ──
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setXlsxError('');
    try {
      const parsed = await parseXlsx(file);
      if (parsed.length === 0) { setXlsxError('Файл пустой или не удалось прочитать данные.'); return; }
      setXlsxPreview(parsed);
    } catch { setXlsxError('Не удалось прочитать файл. Убедитесь, что это .xlsx или .xls файл.'); }
  }, []);

  // ── XLSX confirm import ──
  const handleXlsxConfirm = useCallback(async (selected: XlsxPreviewRow[]) => {
    if (selected.length === 0) return;
    setXlsxSaving(true);
    setXlsxProgress({ done: 0, total: selected.length });
    try {
      for (let i = 0; i < selected.length; i++) {
        const r = selected[i];
        const created = await addStudent.mutateAsync({ name: r.name, groupName: r.groupName, currentTopic: r.currentTopic, come: [] });
        setRows((prev) => {
          const base = (prev.length === 1 && !prev[0].name.trim() && !prev[0].id) ? [] : prev;
          return [...base, studentToRow(created)];
        });
        setXlsxProgress({ done: i + 1, total: selected.length });
      }
      setXlsxPreview(null);
    } finally { setXlsxSaving(false); setXlsxProgress(null); }
  }, [addStudent]);

  // ── Modal Actions (Mobile) ──
  const handleModalSave = async (data: { name: string; groupName: string; currentTopic: string }) => {
    if (!editingStudent) return;
    const isAdding = !editingStudent.key;
    
    if (isAdding) {
      const created = await addStudent.mutateAsync({ ...data, come: [] });
      setRows((prev) => {
        const base = (prev.length === 1 && !prev[0].name.trim() && !prev[0].id) ? [] : prev;
        return [...base, studentToRow(created)];
      });
    } else {
      await editStudent.mutateAsync({ id: editingStudent.id!, updates: data });
      setRows((prev) => prev.map((r) => r.key === editingStudent.key ? { ...r, ...data, dirty: false } : r));
    }
    setEditingStudent(null);
  };

  const handleModalDelete = async () => {
    if (!editingStudent || !editingStudent.id) return;
    await removeStudent.mutateAsync(editingStudent.id);
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== editingStudent.key);
      return next.length === 0 ? [emptyRow()] : next;
    });
    setEditingStudent(null);
  };

  const existingNames = new Set((students ?? []).map((s) => s.name.toLowerCase()));

  if (isLoading && !initialised) {
    return <div className="flex items-center gap-2 text-slate-450 py-8 justify-center"><Loader2 size={18} className="animate-spin" /><span className="text-sm font-medium">Загрузка...</span></div>;
  }

  const savedCount = rows.filter((r) => r.id).length;
  const unsavedCount = rows.filter((r) => !r.id && r.name.trim()).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Список студентов</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {savedCount} сохранено
            {unsavedCount > 0 && <span className="text-amber-400 ml-1">· {unsavedCount} не сохранено</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {/* Add Student Button (Mobile only) */}
          <button 
            onClick={() => setEditingStudent({ name: '', groupName: rows.at(-1)?.groupName || getDefaultGroup(), currentTopic: DEFAULT_TOPIC, key: '' })}
            className="flex-1 sm:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-650 hover:bg-indigo-600 text-white shadow-md transition-all"
          >
            <Plus size={13} />
            Добавить
          </button>
          
          {/* Export students */}
          <button
            onClick={() => students && students.length > 0 && exportStudents(students)}
            disabled={!students || students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Скачать всех студентов .xlsx">
            <Download size={13} />
            <span>Выгрузить</span>
          </button>
          {/* Download template */}
          <button onClick={downloadTemplate}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-205 transition-colors"
            title="Скачать шаблон .xlsx">
            <Download size={13} />
            <span>Шаблон</span>
          </button>
          {/* Import xlsx */}
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/40 border border-emerald-900/40 text-emerald-450 hover:bg-emerald-900/50 transition-colors">
            <FileSpreadsheet size={13} />
            Импорт .xlsx
          </button>
          {/* Paste list */}
          <button onClick={() => setShowBulk((v) => !v)}
            className={clsx('flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border',
              showBulk ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-350 hover:text-white')}>
            <Upload size={13} />
            Вставить список
          </button>
          {/* Add Row Button (Desktop only) */}
          <button onClick={addRow}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-350 hover:text-white transition-colors">
            <Plus size={13} />
            Строка
          </button>
        </div>
      </div>

      {/* Xlsx error */}
      {xlsxError && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
          <AlertCircle size={15} className="flex-shrink-0" />
          {xlsxError}
        </div>
      )}

      {/* Bulk paste panel */}
      {showBulk && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-slate-400">Вставьте имена — по одному на строку. Можно скопировать прямо из Excel.</p>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Иван Иванов\nМария Петрова\nАлексей Сидоров"} rows={6}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-650 placeholder-slate-700 resize-none" />
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs text-slate-500 mr-auto">{bulkText.split('\n').filter((l) => l.trim()).length} имён</span>
            <button onClick={() => { setBulkText(''); setShowBulk(false); }} className="px-3 py-1.5 text-xs text-slate-450 hover:text-slate-205 transition-colors">Отмена</button>
            <button onClick={handleBulkSave} disabled={!bulkText.trim() || bulkSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-lg transition-all shadow-md">
              {bulkSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {bulkSaving ? 'Сохраняем...' : 'Добавить всех'}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Spreadsheet Grid Layout */}
      <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <div className="min-w-[650px]">
          <div className="grid grid-cols-[2.5rem_1fr_8rem_10rem_3rem] border-b border-slate-800 bg-slate-850/60 font-semibold select-none text-[11px] uppercase tracking-wider text-slate-550">
            <div className="px-2 py-2.5 text-center">#</div>
            <div className="px-3 py-2.5 text-left">Имя студента</div>
            <div className="px-3 py-2.5 text-left">Группа</div>
            <div className="px-3 py-2.5 text-left">Тема</div>
            <div />
          </div>
          <div className="divide-y divide-slate-800/60">
            {rows.map((row, idx) => (
              <div key={row.key} className={clsx('grid grid-cols-[2.5rem_1fr_8rem_10rem_3rem] items-center group transition-colors', row.error ? 'bg-red-950/15' : 'hover:bg-slate-850/30')}>
                <div className="px-2 py-1.5 text-xs text-center font-mono select-none">
                  {row.id ? <span className="text-slate-650">{idx + 1}</span> : <span className="text-amber-500 font-bold">*</span>}
                </div>
                <div className="px-1 py-1">
                  <input ref={(el) => { if (el) inputRefs.current.set(row.key, el); else inputRefs.current.delete(row.key); }}
                    type="text" value={row.name} placeholder="Введите имя..."
                    onChange={(e) => updateRow(row.key, { name: e.target.value, dirty: true })}
                    onBlur={() => { if (row.dirty && row.name.trim()) saveRow(row); }}
                    onKeyDown={(e) => handleKeyDown(e, row, idx)}
                    className="w-full bg-transparent text-slate-105 text-sm px-2 py-1.5 rounded-lg focus:outline-none focus:bg-slate-950 focus:ring-1 focus:ring-indigo-500 placeholder-slate-700 transition-colors font-medium" />
                </div>
                <div className="px-1 py-1">
                  <GroupPicker
                    value={row.groupName}
                    onChange={(group) => {
                      updateRow(row.key, { groupName: group, dirty: true });
                      if (row.id) {
                        setTimeout(() => {
                          setRows((prev) => {
                            const r = prev.find((x) => x.key === row.key);
                            if (r) saveRow({ ...r, groupName: group, dirty: true });
                            return prev;
                          });
                        }, 0);
                      }
                    }}
                    compact
                    showSetDefault
                  />
                </div>
                <div className="px-1 py-1">
                  <TopicPicker
                    value={row.currentTopic}
                    onChange={(topic) => {
                      updateRow(row.key, { currentTopic: topic, dirty: true });
                      if (row.id) {
                        setTimeout(() => {
                          setRows((prev) => {
                            const r = prev.find((x) => x.key === row.key);
                            if (r) saveRow({ ...r, currentTopic: topic, dirty: true });
                            return prev;
                          });
                        }, 0);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-center pr-2">
                  {row.saving ? <Loader2 size={13} className="animate-spin text-slate-550" />
                    : row.error ? <AlertCircle size={13} className="text-red-400" />
                    : <button onClick={() => deleteRow(row)} className="p-1.5 text-slate-650 hover:text-red-400 hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all rounded-lg"><Trash2 size={13} /></button>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 px-3 py-2 bg-slate-900/40">
            <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-semibold">
              <Plus size={13} />Добавить строку
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card List (shown on mobile, hidden on desktop) */}
      <div className="flex flex-col gap-3 sm:hidden pb-10">
        {rows.map((row, idx) => {
          const isSaved = !!row.id;
          return (
            <div 
              key={row.key} 
              className={clsx(
                'bg-slate-900 border rounded-2xl p-4 flex flex-col gap-3 transition-all relative overflow-hidden',
                row.error ? 'border-red-900/60 bg-red-950/5' : 'border-slate-800 hover:border-slate-700'
              )}
            >
              {row.saving && (
                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 size={18} className="animate-spin text-indigo-400" />
                </div>
              )}
              
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                    {!isSaved && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-950/50 border border-amber-900/30 text-amber-400 rounded-full font-semibold">
                        Черновик
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-100 mt-1 truncate text-sm">
                    {row.name || <span className="text-slate-650 italic font-normal">Без имени</span>}
                  </h3>
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditingStudent({ id: row.id, name: row.name, groupName: row.groupName, currentTopic: row.currentTopic, key: row.key })}
                    className="p-2 text-slate-400 hover:text-slate-205 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800 bg-slate-950"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить студента ${row.name || 'без имени'}?`)) {
                        deleteRow(row);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/15 rounded-xl transition-colors border border-transparent"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Группа</span>
                  <span className="text-slate-300 font-semibold">{row.groupName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Текущая тема</span>
                  <span className="text-slate-300 font-semibold truncate block">{row.currentTopic}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="hidden sm:block text-xs text-slate-600 px-1">Enter — следующая строка · Tab — перейти вниз · клик вне поля — сохранить</p>

      {/* XLSX import modal */}
      {xlsxPreview && (
        <XlsxImportModal
          rows={xlsxPreview}
          existingNames={existingNames}
          onClose={() => !xlsxSaving && setXlsxPreview(null)}
          onConfirm={handleXlsxConfirm}
          isSaving={xlsxSaving}
          progress={xlsxProgress}
        />
      )}

      {/* Mobile Form Modal */}
      {editingStudent && (
        <StudentFormModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={handleModalSave}
          onDelete={editingStudent.id ? handleModalDelete : undefined}
        />
      )}
    </div>
  );
}
