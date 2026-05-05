// Normalizes timetable short codes (CN/CD/SE/DC/SPM/EITK/PDP) to syllabus subject codes/names.
// Keep this single source of truth so any update flows across Faculty, Student & Admin views.

export interface SubjectMap {
  shortCode: string;        // appears in timetable.subject_code
  code: string;             // canonical code in subjects.code
  name: string;             // canonical name in subjects.name
  labCode?: string;         // matching lab subject code (if any)
}

export const SUBJECT_MAPPINGS: SubjectMap[] = [
  { shortCode: "SE",   code: "KCS-601", name: "Software Engineering",                    labCode: "KCS-653" },
  { shortCode: "CD",   code: "KCS-602", name: "Compiler Design",                         labCode: "KCS-652" },
  { shortCode: "CN",   code: "KCS-603", name: "Computer Network",                        labCode: "KCS-651" },
  { shortCode: "DC",   code: "KCS-062", name: "Data Compression" },
  { shortCode: "SPM",  code: "KCS-070", name: "Software Project Management" },
  { shortCode: "EITK", code: "KOE-068", name: "Essence of Indian Traditional Knowledge" },
  { shortCode: "PDP",  code: "NC-PDP",  name: "Personality Development Program" },
];

const byShort = new Map(SUBJECT_MAPPINGS.map((m) => [m.shortCode.toUpperCase(), m]));
const byCode  = new Map(SUBJECT_MAPPINGS.flatMap((m) => [
  [m.code.toUpperCase(), m] as const,
  ...(m.labCode ? [[m.labCode.toUpperCase(), m] as const] : []),
]));

/** Convert a timetable short code (e.g. "CN") to canonical syllabus mapping. */
export const mapShortCode = (s?: string | null): SubjectMap | undefined =>
  s ? byShort.get(s.trim().toUpperCase()) : undefined;

/** Look up by canonical or lab code (e.g. "KCS-603" or "KCS-651"). */
export const mapByCode = (s?: string | null): SubjectMap | undefined =>
  s ? byCode.get(s.trim().toUpperCase()) : undefined;

/** Resolve any value (short or canonical) to canonical syllabus code. */
export const toSyllabusCode = (s?: string | null): string | undefined =>
  mapShortCode(s)?.code ?? mapByCode(s)?.code;
