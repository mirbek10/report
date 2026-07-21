import { useState, useMemo } from 'react';
import { X, Pencil, Check, Loader2, Star, Users, AlertTriangle } from 'lucide-react';
import {
  getAllGroups, loadCustomGroups, getDefaultGroup, setDefaultGroup,
  addCustomGroup,
} from './GroupPicker';
import type { Student } from '../types';

interface Props {
  students: Student[];
  onClose: () => void;
  /** Called when a group is renamed — parent must bulk-update all affected students */
  onRenameGroup: (oldName: string, newName: string) => Promise<void>;
}

interface GroupRow {
  name: string;
  isCustom: boolean;
  studentCount: number;
}

export function GroupManagerModal({ students, onClose, onRenameGroup }: Props) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [defaultGroup, setDefaultGroupState] = useState(getDefaultGroup);

  const allGroups = useMemo((): GroupRow[] => {
    const custom = loadCustomGroups();
    const all = getAllGroups();
    return all.map((name) => ({
      name,
      isCustom: custom.includes(name),
      studentCount: students.filter((s) => (s.groupName || '') === name).length,
    }));
  }, [students]);

  const startEdit = (group: string) => {
    setEditingGroup(group);
    setEditValue(group);
    setError('');
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setEditValue('');
    setError('');
  };

  const handleSave = async (oldName: string) => {
    const newName = editValue.trim();
    if (!newName) { setError('Название не может быть пустым'); return; }
    if (newName === oldName) { cancelEdit(); return; }
    // Check duplicate
    if (getAllGroups().includes(newName)) {
      setError(`Группа «${newName}» уже существует`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      // 1. Add new name to custom groups (if it's not already a built-in)
      addCustomGroup(newName);

      // 2. Bulk rename all students in this group
      await onRenameGroup(oldName, newName);

      // 3. Update default group if needed
      if (getDefaultGroup() === oldName) {
        setDefaultGroup(newName);
        setDefaultGroupState(newName);
      }

      cancelEdit();
    } catch {
      setError('Ошибка при сохранении. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = (group: string) => {
    setDefaultGroup(group);
    setDefaultGroupState(group);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-bold text-base flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              Управление группами
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Переименование обновит всех студентов этой группы
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-slate-800/60">
          {allGroups.map(({ name, isCustom, studentCount }) => {
            const isEditing = editingGroup === name;
            const isDefault = name === defaultGroup;

            return (
              <div key={name} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors">
                {isEditing ? (
                  /* Edit mode */
                  <div className="flex-1 flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => { setEditValue(e.target.value); setError(''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(name);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="w-full bg-slate-950 border border-indigo-600/60 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {error && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle size={11} />{error}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-400/80">
                        ⚠ Переименует группу у {studentCount} студент{studentCount === 1 ? 'а' : 'ов'}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200 font-medium truncate">{name}</span>
                      {isDefault && (
                        <span className="text-[9px] text-amber-500 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                          осн.
                        </span>
                      )}
                      {isCustom && !isDefault && (
                        <span className="text-[9px] text-indigo-500 bg-indigo-950/40 border border-indigo-900/30 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                          своя
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{studentCount} студентов</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSave(name)}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Сохранить
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={saving}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Set as default */}
                      {!isDefault && (
                        <button
                          onClick={() => handleSetDefault(name)}
                          className="p-1.5 text-slate-600 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Сделать основной"
                        >
                          <Star size={14} />
                        </button>
                      )}
                      {/* Rename */}
                      <button
                        onClick={() => startEdit(name)}
                        className="p-1.5 text-slate-600 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Переименовать"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <p className="text-xs text-slate-500">
            <Star size={10} className="inline text-amber-500 mr-1" />
            Основная — подставляется по умолчанию в отчёт и новым студентам
          </p>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
