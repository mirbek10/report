import {
  AlignmentType,
  BorderStyle,
  Document,
  Paragraph,
  Packer,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Student } from '../types';

export interface MonthlyReportGroup {
  name: string;
  studentCount: number;
  visitedStudents: number;
  totalVisits: number;
  onlineVisits: number;
  offlineVisits: number;
}
 
export interface MonthlyReportData {
  mentorName: string;
  periodLabel: string;
  totalStudents: number;
  totalVisits: number;
  onlineVisits: number;
  offlineVisits: number;
  visitedStudents: number;
  groups: MonthlyReportGroup[];
}

function line(label: string, value: string | number | undefined | null): string {
  return `${label}: ${value ?? ''}`;
}

function makeCell(
  text: string,
  bold = false,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold, size: 20, color: '1F2937' })],
      }),
    ],
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
  });
}

function makeTable(rows: TableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
  });
}

export function buildMonthlyReportData(
  students: Student[],
  dates: string[],
  periodLabel: string,
  mentorName: string,
  mainGroupNames: string[] = [],
): MonthlyReportData {
  const dateSet = new Set(dates);
  const grouped = new Map<string, Student[]>();

  for (const student of students) {
    const groupName = student.groupName || 'Топ жок';
    const list = grouped.get(groupName) ?? [];
    list.push(student);
    grouped.set(groupName, list);
  }

  const sortGroups = (a: string, b: string) => {
    const aMain = mainGroupNames.includes(a);
    const bMain = mainGroupNames.includes(b);
    if (aMain && !bMain) return -1;
    if (!aMain && bMain) return 1;
    return a.localeCompare(b, 'ru');
  };

  const groups: MonthlyReportGroup[] = [...grouped.entries()]
    .sort(([a], [b]) => sortGroups(a, b))
    .map(([name, groupStudents]) => {
      const entries = groupStudents.flatMap((student) => student.come.filter((entry) => dateSet.has(entry.date)));
      const totalVisits = entries.length;
      const onlineVisits = entries.filter((entry) => entry.lesson_type === 'online').length;
      const visitedStudents = groupStudents.filter((student) => student.come.some((entry) => dateSet.has(entry.date))).length;
      return {
        name,
        studentCount: groupStudents.length,
        visitedStudents,
        totalVisits,
        onlineVisits,
        offlineVisits: totalVisits - onlineVisits,
      };
    });

  const totalVisits = students.reduce((sum, student) => sum + student.come.filter((entry) => dateSet.has(entry.date)).length, 0);
  const onlineVisits = students.reduce((sum, student) => sum + student.come.filter((entry) => dateSet.has(entry.date) && entry.lesson_type === 'online').length, 0);
  const visitedStudents = students.filter((student) => student.come.some((entry) => dateSet.has(entry.date))).length;

  return {
    mentorName,
    periodLabel,
    totalStudents: students.length,
    totalVisits,
    onlineVisits,
    offlineVisits: totalVisits - onlineVisits,
    visitedStudents,
    groups,
  };
}

export function buildMonthlyReportText(data: MonthlyReportData): string {
  const lines: string[] = [
    `Айлык отчёт`,
    `Ментор: ${data.mentorName}`,
    `Мезгил: ${data.periodLabel}`,
    ``,
    `Жалпы студент саны: ${data.totalStudents}`,
    `Катышкан студент: ${data.visitedStudents}`,
    `Жалпы сабак саны: ${data.totalVisits}`,
    `Оффлайн: ${data.offlineVisits}, онлайн: ${data.onlineVisits}`,
    ``,
    `Топтор боюнча:`,
  ];

  for (const group of data.groups) {
    lines.push(`${group.name}: жалпы — ${group.totalVisits}, оффлайн — ${group.offlineVisits}, онлайн — ${group.onlineVisits}`);
  }

  lines.push(
    ``,
    `Окуп жаткандар:`,
    ``,
    `Замарозка:`,
    ``,
    `Окубай жаткандар:`,
    ``,
    `Эмне үчүн окубай жатат:`,
    ``,
    `Бир айда оффлайнга келгендер (топтор боюнча):`,
  );

  for (const group of data.groups) {
    lines.push(`${group.name}: оффлайн — ${group.offlineVisits}`);
  }

  lines.push(
    ``,
    `Бир айда канча түз эфир өткөрүлдү жана болжол менен канча студент катышты:`,
    ``,
    `Бир жумада 2 жолу түз эфир болот — шейшемби жана бейшемби күндөрү. Кахут ишемби күнү болот.`,
    ``,
    `Бир ай ичинде топторго кандай жаңылыктар киргизилди:`,
    ``,
    `Бир айда хакатон жана челлендж өткөрүлдү:`,
    `Челленджге ____ / хакатонго ____ студент катышты`,
  );

  return lines.join('\n');
}

export async function buildMonthlyReportBlob(data: MonthlyReportData): Promise<Blob> {
  const rows = data.groups.map(
    (group) =>
      new TableRow({
        children: [
          makeCell(group.name, true),
          makeCell(String(group.onlineVisits), false, AlignmentType.CENTER),
          makeCell(String(group.offlineVisits), false, AlignmentType.CENTER),
          makeCell(String(group.totalVisits), false, AlignmentType.CENTER),
        ],
      }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Айлык отчёт — ${data.mentorName}`, bold: true, size: 30, color: '111827' })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: data.periodLabel, size: 22, color: '6B7280' })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: line('Жалпы студент саны', data.totalStudents), size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: line('Катышкан студент', data.visitedStudents), size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: line('Жалпы сабак саны', data.totalVisits), size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: line('Онлайн', data.onlineVisits), size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({
            children: [new TextRun({ text: line('Оффлайн', data.offlineVisits), size: 22 })],
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Окуп жаткандар:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Замарозка:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Окубай жаткандар:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Эмне үчүн окубай жатат:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 160 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Бир айда оффлайнга келгендердин саны (топтор боюнча):', bold: true, size: 22 })],
            spacing: { after: 80 },
          }),
          makeTable([
            new TableRow({
              children: [
                makeCell('Топ', true),
                makeCell('Онлайн', true, AlignmentType.CENTER),
                makeCell('Оффлайн', true, AlignmentType.CENTER),
                makeCell('Жалпы', true, AlignmentType.CENTER),
              ],
            }),
            ...rows,
          ]),
          new Paragraph({ children: [new TextRun({ text: '', size: 10 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Бир айда канча түз эфир өткөрүлдү жана болжол менен канча студент катышты:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 30 } }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 120 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Бир жумада 2 жолу түз эфир болот — шейшемби жана бейшемби күндөрү. Кахут ишемби күнү болот.', size: 22 })],
            spacing: { after: 160 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Бир ай ичинде топторго кандай жаңылыктар киргизилди:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 30 } }),
          new Paragraph({ children: [new TextRun({ text: '______________________________', size: 22 })], spacing: { after: 160 } }),
          new Paragraph({
            children: [new TextRun({ text: 'Бир айда хакатон жана челлендж өткөрүлдү:', bold: true, size: 22 })],
            spacing: { after: 40 },
          }),
          new Paragraph({ children: [new TextRun({ text: 'Челленджге ____ / хакатонго ____ студент катышты', size: 22 })], spacing: { after: 40 } }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
