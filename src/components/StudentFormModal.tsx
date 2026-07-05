import { useState } from 'react';
import { X, Users, GraduationCap, Trash2 } from 'lucide-react';
import { TopicPicker } from './TopicPicker';

interface StudentFormModalProps {
  student?: { id?: string; name: string; groupName: string; currentTopic: string };
  onClose: () => void;
  onSave: (data: { name: string; groupName: string; currentTopic: string }) => void;
  onDelete?: () => void;
}

export function StudentFormModal({
  student,
  onClose,
  onSave,
  onDelete,
}: StudentFormModalProps) {
  const isEditing = !!student?.id;
  
  const [name, setName] = useState(student?.name || '');
  const [groupName, setGroupName] = useState(student?.groupName || 'Группа A');
  const [currentTopic, setCurrentTopic] = useState(student?.currentTopic || 'HTML & CSS');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setError('Имя студента не может быть пустым');
      return;
    }
    setError('');
    onSave({
      name: name.trim(),
      groupName: groupName.trim(),
      currentTopic,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-visible transform transition-all scale-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-bold text-base">
              {isEditing ? 'Редактировать студента' : 'Добавить студента'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Заполните информацию о студенте
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 overflow-visible">
          
          {error && (
            <div className="bg-red-950/40 border border-red-900/40 text-red-400 text-xs px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              ФИО Студента
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
              <GraduationCap size={16} className="text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="bg-transparent text-slate-200 text-sm w-full focus:outline-none placeholder-slate-650"
                autoFocus
              />
            </div>
          </div>

          {/* Group Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              Группа
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
              <Users size={16} className="text-slate-500 flex-shrink-0" />
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Группа A"
                className="bg-transparent text-slate-200 text-sm w-full focus:outline-none placeholder-slate-650"
              />
            </div>
          </div>

          {/* Topic Selector */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 pl-1">
              Текущая тема
            </label>
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
              <TopicPicker
                value={currentTopic}
                onChange={setCurrentTopic}
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center gap-3 bg-slate-900/60 rounded-b-2xl">
          {isEditing && onDelete && (
            <button
              onClick={() => {
                if (window.confirm(`Вы уверены, что хотите удалить студента ${name}?`)) {
                  onDelete();
                  onClose();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-colors mr-auto"
            >
              <Trash2 size={13} />
              Удалить
            </button>
          )}
          
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 transition-colors rounded-xl hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-500/10"
            >
              {isEditing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
