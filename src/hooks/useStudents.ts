import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllStudents, createStudent, updateStudent,
  deleteStudent, patchCome, removeCome,
} from '../api/students';
import type { Student, ComeEntry } from '../types';

const LS_CACHE = 'onchet_students_v2';

function setCache(students: Student[]) {
  try { localStorage.setItem(LS_CACHE, JSON.stringify({ students, cachedAt: Date.now() })); }
  catch { /* quota */ }
}

export const useStudents = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const data = await fetchAllStudents();
      // Deduplicate by id (safety net against double imports)
      const seen = new Set<string>();
      const unique = data.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setCache(unique);
      return unique;
    },
    staleTime: 1000 * 60 * 5,
    // Don't use placeholder — it causes visual duplicates while real data loads
    gcTime: 1000 * 60 * 10,
  });

  /** Optimistically update one student in the cache */
  const patchLocal = (id: string, patch: Partial<Student>) => {
    qc.setQueryData<Student[]>(['students'], (old) =>
      old?.map((s) => s.id === id ? { ...s, ...patch } : s)
    );
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addStudent = useMutation({
    mutationFn: (s: Omit<Student, 'id'>) => createStudent(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const editStudent = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Student, 'id'>> }) =>
      updateStudent(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData<Student[]>(['students']);
      patchLocal(id, updates);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['students'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const removeStudent = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData<Student[]>(['students']);
      qc.setQueryData<Student[]>(['students'], (old) => old?.filter((s) => s.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['students'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  const batchAddStudents = useMutation({
    mutationFn: async (students: Omit<Student, 'id'>[]) => {
      const BATCH = 5; const DELAY = 300;
      const results: Student[] = [];
      for (let i = 0; i < students.length; i += BATCH) {
        const res = await Promise.all(students.slice(i, i + BATCH).map(createStudent));
        results.push(...res);
        if (i + BATCH < students.length) await new Promise((r) => setTimeout(r, DELAY));
      }
      return results;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  // ── COME management ───────────────────────────────────────────────────────

  /** Mark arrived: add/update come entry for date, optimistic */
  const markCome = useMutation({
    mutationFn: ({ student, date, entry }: { student: Student; date: string; entry: ComeEntry }) =>
      patchCome(student, date, entry),
    onMutate: async ({ student, date, entry }) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData<Student[]>(['students']);
      const newCome = [...student.come.filter((e) => e.date !== date), entry];
      patchLocal(student.id, { come: newCome });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['students'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  /** Remove come entry for a date (mark as absent / undo) */
  const unmarkCome = useMutation({
    mutationFn: ({ student, date }: { student: Student; date: string }) =>
      removeCome(student, date),
    onMutate: async ({ student, date }) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData<Student[]>(['students']);
      patchLocal(student.id, { come: student.come.filter((e) => e.date !== date) });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['students'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  /** Update time_start or time_finish of existing come entry */
  const updateComeTime = useMutation({
    mutationFn: ({ student, date, patch }: {
      student: Student; date: string;
      patch: Partial<Pick<ComeEntry, 'time_start' | 'time_finish' | 'lesson_type'>>;
    }) => {
      const existing = student.come.find((e) => e.date === date);
      if (!existing) return Promise.resolve(student);
      return patchCome(student, date, { ...existing, ...patch });
    },
    onMutate: async ({ student, date, patch }) => {
      await qc.cancelQueries({ queryKey: ['students'] });
      const prev = qc.getQueryData<Student[]>(['students']);
      const newCome = student.come.map((e) => e.date === date ? { ...e, ...patch } : e);
      patchLocal(student.id, { come: newCome });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['students'], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });

  return { ...query, addStudent, editStudent, removeStudent, batchAddStudents, markCome, unmarkCome, updateComeTime };
};
