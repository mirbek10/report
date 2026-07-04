export type LessonType = 'online' | 'offline';

/** One visit entry stored inside the student object */
export interface ComeEntry {
  date: string;              // "DD.MM.YY"  e.g. "02.07.26"
  time_start: string;        // "HH:MM"     e.g. "10:30"
  time_finish: string;       // "HH:MM"     e.g. "11:00"
  lesson_type: LessonType;   // "online" | "offline"
}

export interface Student {
  id: string;
  name: string;
  groupName: string;
  currentTopic: string;
  come: ComeEntry[];
}

export interface LocalCache {
  students: Student[];
  cachedAt: number;
}
