import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { Lecture, Module, Subject, Year } from "@/types";

const HIERARCHY_CACHE_KEY = "zanki:hierarchy";

const YEAR_FK_CANDIDATES = ["year_id", "course_id", "level_id", "stage_id", "parent_id"];
const MODULE_FK_CANDIDATES = ["module_id", "subject_group_id", "section_id", "category_id", "parent_id", "unit_id"];
const SUBJECT_FK_CANDIDATES = ["subject_id", "topic_id", "section_id", "lesson_group_id", "parent_id", "module_id"];

function detectFK(row: Record<string, unknown>, candidates: string[], table: string): string {
  for (const col of candidates) {
    if (col in row) return col;
  }
  console.error(`[Hierarchy] Schema error in ${table}: No valid foreign key found. Expected one of: ${candidates.join(', ')}`);
  throw new Error(`Schema mismatch in ${table}: Could not detect foreign key column.`);
}

function str(v: unknown): string { return String(v ?? ""); }
function num(v: unknown): number { return Number(v ?? 0); }

async function readCachedHierarchy(): Promise<Year[] | null> {
  try {
    const raw = await AsyncStorage.getItem(HIERARCHY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Year[]) : null;
  } catch {
    return null;
  }
}

async function writeCachedHierarchy(data: Year[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HIERARCHY_CACHE_KEY, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

async function buildHierarchyFromRemote(): Promise<Year[]> {
  const [
    { data: years, error: yearsErr },
    { data: modules, error: modulesErr },
    { data: subjects, error: subjectsErr },
    { data: lectures, error: lecturesErr },
  ] = await Promise.all([
    supabase.from("years").select("*"),
    supabase.from("modules").select("*"),
    supabase.from("subjects").select("*"),
    supabase.from("lectures").select("*"),
  ]);

  if (yearsErr) throw new Error(`years: ${yearsErr.message} (${yearsErr.code})`);
  if (modulesErr) throw new Error(`modules: ${modulesErr.message} (${modulesErr.code})`);
  if (subjectsErr) throw new Error(`subjects: ${subjectsErr.message} (${subjectsErr.code})`);
  if (lecturesErr) throw new Error(`lectures: ${lecturesErr.message} (${lecturesErr.code})`);

  const firstModule = (modules ?? [])[0] as Record<string, unknown> | undefined;
  const firstSubject = (subjects ?? [])[0] as Record<string, unknown> | undefined;
  const firstLecture = (lectures ?? [])[0] as Record<string, unknown> | undefined;

  const yearFk = firstModule ? detectFK(firstModule, YEAR_FK_CANDIDATES, "modules") : "year_id";
  const moduleFk = firstSubject ? detectFK(firstSubject, MODULE_FK_CANDIDATES, "subjects") : "module_id";
  const subjectFk = firstLecture ? detectFK(firstLecture, SUBJECT_FK_CANDIDATES, "lectures") : "subject_id";

  const lecturesBySubject: Record<string, Lecture[]> = {};
  for (const lec of (lectures ?? [])) {
    const r = lec as Record<string, unknown>;
    const key = str(r[subjectFk]);
    if (!lecturesBySubject[key]) lecturesBySubject[key] = [];
    lecturesBySubject[key].push({
      id: str(r.id),
      name: str(r.name ?? r.title),
      external_id: str(r.external_id ?? r.id),
      subject_id: key,
      card_count: num(r.card_count),
    });
  }

  const subjectsByModule: Record<string, Subject[]> = {};
  for (const sub of (subjects ?? [])) {
    const r = sub as Record<string, unknown>;
    const key = str(r[moduleFk]);
    if (!subjectsByModule[key]) subjectsByModule[key] = [];
    subjectsByModule[key].push({
      id: str(r.id),
      name: str(r.name ?? r.title),
      module_id: key,
      order: num(r.order ?? r.sort_order),
      lectures: lecturesBySubject[str(r.id)] ?? [],
    });
  }

  const modulesByYear: Record<string, Module[]> = {};
  for (const mod of (modules ?? [])) {
    const r = mod as Record<string, unknown>;
    const key = str(r[yearFk]);
    if (!modulesByYear[key]) modulesByYear[key] = [];
    modulesByYear[key].push({
      id: str(r.id),
      name: str(r.name ?? r.title),
      year_id: key,
      order: num(r.order ?? r.sort_order),
      subjects: (subjectsByModule[str(r.id)] ?? []).sort((a, b) => a.order - b.order),
    });
  }

  const sortedYears = [...(years ?? [])].sort(
    (a, b) => num((a as Record<string, unknown>).order) - num((b as Record<string, unknown>).order)
  );

  return sortedYears.map((y) => {
    const r = y as Record<string, unknown>;
    return {
      id: str(r.id),
      name: str(r.name ?? r.title),
      order: num(r.order),
      modules: (modulesByYear[str(r.id)] ?? []).sort((a, b) => a.order - b.order),
    };
  });
}

async function fetchHierarchy(): Promise<Year[]> {
  try {
    const data = await buildHierarchyFromRemote();
    // Persist fresh data for offline use
    writeCachedHierarchy(data);
    return data;
  } catch (err) {
    // Network unavailable — serve stale cache rather than an error screen
    const cached = await readCachedHierarchy();
    if (cached) return cached;
    throw err;
  }
}

export function useHierarchy() {
  return useQuery({
    queryKey: ["hierarchy"],
    queryFn: fetchHierarchy,
    staleTime: 1000 * 60 * 10,       // consider fresh for 10 min
    gcTime: 1000 * 60 * 60 * 24,     // keep in memory 24 h
    networkMode: "offlineFirst",      // attempt even without network
    retry: 1,
  });
}
