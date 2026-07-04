import { getApiClient } from './client';
import type { Student, ComeEntry } from '../types';
import { pruneOldEntries } from '../utils/dates';

// ─────────────────────────────────────────────────────────────────────────────
// MockAPI only supports GET / POST / PUT / DELETE — PATCH is not available.
// PUT requires the full object, so updateStudent fetches current data first,
// merges the updates, then PUTs the complete record.
//
// `come` (array of objects) is serialized to a JSON string because MockAPI
// cannot store nested arrays of objects reliably.
// ─────────────────────────────────────────────────────────────────────────────

type RawStudent = Omit<Student, 'come'> & { come?: string | ComeEntry[] | null };

function deserializeCome(raw: RawStudent): Student {
  let come: ComeEntry[] = [];
  if (typeof raw.come === 'string' && raw.come.trim().startsWith('[')) {
    try { come = JSON.parse(raw.come); } catch { come = []; }
  } else if (Array.isArray(raw.come)) {
    come = raw.come;
  }
  return { ...raw, come };
}

function serializeCome(come: ComeEntry[]): string {
  return JSON.stringify(come);
}

// ─────────────────────────────────────────────────────────────────────────────

export const fetchAllStudents = async (): Promise<Student[]> => {
  const { data } = await getApiClient().get<RawStudent[]>('/students');
  const seen = new Set<string>();
  return data
    .map(deserializeCome)
    .filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
};

export const fetchStudentById = async (id: string): Promise<Student> => {
  const { data } = await getApiClient().get<RawStudent>(`/students/${id}`);
  return deserializeCome(data);
};

export const createStudent = async (
  student: Omit<Student, 'id'>
): Promise<Student> => {
  const payload = { ...student, come: serializeCome([]) };
  const { data } = await getApiClient().post<RawStudent>('/students', payload);
  return deserializeCome(data);
};

/**
 * PUT /students/:id — sends full object (required by MockAPI).
 * Fetches current record first, merges updates, then PUTs.
 */
export const updateStudent = async (
  id: string,
  updates: Partial<Omit<Student, 'id'>>
): Promise<Student> => {
  // Get current full record to avoid overwriting fields
  const current = await fetchStudentById(id);
  const merged: Student = { ...current, ...updates };

  const payload: RawStudent = {
    ...merged,
    come: serializeCome(merged.come),
  };

  const { data } = await getApiClient().put<RawStudent>(`/students/${id}`, payload);
  return deserializeCome(data);
};

export const deleteStudent = async (id: string): Promise<void> => {
  await getApiClient().delete(`/students/${id}`);
};

/**
 * Add or update a come entry for a specific date.
 * Prunes entries older than 2 months before saving.
 */
export const patchCome = async (
  student: Student,
  date: string,
  entry: ComeEntry
): Promise<Student> => {
  const existing = student.come.filter((e) => e.date !== date);
  const pruned = pruneOldEntries([...existing, entry]);
  return updateStudent(student.id, { come: pruned });
};

/**
 * Remove a come entry for a specific date.
 */
export const removeCome = async (
  student: Student,
  date: string
): Promise<Student> => {
  const pruned = pruneOldEntries(student.come.filter((e) => e.date !== date));
  return updateStudent(student.id, { come: pruned });
};
