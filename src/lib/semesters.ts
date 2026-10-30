export const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
export const semLabel = (s: string) => `Sem ${SEMESTERS.indexOf(s as any) + 1 || s}`;

/** Detects semester from a subject code: first digit of the 3-digit number (KCS-601 → VI, 101 → I). */
export const semFromCode = (code?: string | null): string | null => {
  const m = String(code ?? "").match(/(\d)(\d)\d/);
  if (!m) return null;
  // AKTU electives like KCS-062 / KCS-070 → second digit is the semester
  const n = m[1] === "0" ? Number(m[2]) : Number(m[1]);
  return n >= 1 && n <= 8 ? SEMESTERS[n - 1] : null;
};

/** Semester of a subject: from its code, falling back to the stored semester. */
export const subjectSem = (s: { code: string; semester?: string | null }) => semFromCode(s.code) ?? s.semester ?? null;

/** Default batch section by year: Sem I/II → CS11, III/IV → CS21, V/VI → CS31, VII/VIII → CS41. */
export const defaultSectionForSem = (sem?: string | null): string => {
  const i = SEMESTERS.indexOf(sem as any);
  if (i < 0) return "";
  return `CS${Math.floor(i / 2) + 1}1`;
};

const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
/** Normalizes "Mon"/"monday"/"MONDAY" → "Monday". */
export const normDay = (d?: string | null): string => {
  const k = String(d ?? "").trim().slice(0, 3).toLowerCase();
  return DAY_FULL.find((x) => x.slice(0, 3).toLowerCase() === k) ?? String(d ?? "");
};

/** Normalizes exam types: "sessional1"/"Sessional 1" → "Sessional 1", "put" → "PUT", etc. */
export const normExam = (t?: string | null): string => {
  const k = String(t ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (k === "sessional1") return "Sessional 1";
  if (k === "sessional2") return "Sessional 2";
  if (k === "put") return "PUT";
  if (k === "semester" || k === "sem") return "Semester";
  return String(t ?? "");
};
