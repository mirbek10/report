import { useState } from 'react';
import { Copy, FileText, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { copyToClipboard, generateDailyReport } from '../utils/analytics';
import type { Student } from '../types';

interface CopyButtonsProps {
  students: Student[];
  date: string;        // DD.MM.YY
  mentorName?: string;
}

export function CopyButtons({ students, date, mentorName = 'Ментор' }: CopyButtonsProps) {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Raw copy: list of present students with times
  const handleCopyRaw = async () => {
    const present = students
      .map((s) => ({ s, e: s.come.find((e) => e.date === date) }))
      .filter((x): x is { s: Student; e: NonNullable<typeof x.e> } => !!x.e)
      .sort((a, b) => a.e.time_start.localeCompare(b.e.time_start));

    if (present.length === 0) {
      await copyToClipboard(`${date} — никого не отмечено`);
    } else {
      const lines = [
        `Дата: ${date}`,
        `Присутствовали (${present.length}/${students.length}):`,
        ...present.map(({ s, e }, i) =>
          `${i + 1}. ${s.name} — ${e.time_start}–${e.time_finish} (${s.currentTopic})`
        ),
      ];
      await copyToClipboard(lines.join('\n'));
    }
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  // Report copy: full Kyrgyz report
  const handleCopyReport = async () => {
    const text = generateDailyReport(students, date, mentorName);
    await copyToClipboard(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="flex gap-2">
      <CopyBtn
        onClick={handleCopyRaw}
        copied={copiedRaw}
        icon={<Copy size={13} />}
        label="Скопировать"
        copiedLabel="Скопировано!"
        title="Скопировать список посещаемости за день"
        color="slate"
      />
      <CopyBtn
        onClick={handleCopyReport}
        copied={copiedReport}
        icon={<FileText size={13} />}
        label="Отчёт"
        copiedLabel="Скопировано!"
        title="Скопировать готовый отчёт на кыргызском"
        color="indigo"
      />
    </div>
  );
}

function CopyBtn({ onClick, copied, icon, label, copiedLabel, title, color }: {
  onClick: () => void;
  copied: boolean;
  icon: React.ReactNode;
  label: string;
  copiedLabel: string;
  title: string;
  color: 'slate' | 'indigo';
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
        copied
          ? 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400'
          : color === 'indigo'
            ? 'bg-indigo-900/30 border-indigo-700/50 text-indigo-300 hover:bg-indigo-800/40'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
      )}
    >
      {copied ? <Check size={13} /> : icon}
      {copied ? copiedLabel : label}
    </button>
  );
}
